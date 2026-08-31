// Backend kecil untuk fitur "Alarm Pengingat Makan" BulkyApp.
//
// Tugasnya cuma satu: menyimpan jadwal reminder + push subscription tiap
// pengguna, lalu tiap menit mengecek apakah ada reminder yang waktunya
// sudah tiba dan mengirim Web Push ke perangkat mereka — INI YANG membuat
// alarm bisa bunyi walau tab/browser klien sedang tidak dibuka, karena
// push dikirim lewat browser push service (FCM/Mozilla push/dst), bukan
// lewat kode yang jalan di tab.
//
// CATATAN JUJUR (baca ini sebelum deploy):
// - Notification API tidak mengizinkan web memutar FILE AUDIO KUSTOM secara
//   otomatis di background lewat push — service worker tidak boleh
//   mengakses elemen <audio>. Yang terjadi saat push masuk: OS/browser
//   membunyikan notification sound BAWAAN sistem + getar (di HP).
//   Suara custom/preset pilihan pengguna baru benar-benar diputar KERAS
//   begitu pengguna TAP notifikasi dan app dibuka (lihat AlarmPlayer di
//   frontend). Supaya tetap terasa seperti alarm walau belum dibuka, server
//   ini mengirim ULANG notifikasi tiap beberapa menit sampai pengguna
//   menekan "Selesai" — mirip alarm HP yang terus bunyi sampai dimatikan.
// - iOS Safari mendukung Web Push HANYA jika PWA sudah di-"Add to Home
//   Screen" (iOS 16.4+). Tanpa itu, push tidak akan sampai di iPhone.
// - Penyimpanan sekarang pakai PostgreSQL (lihat db.js) — data reminder,
//   subscription, dan ack SEKARANG PERSISTEN, tidak lagi hilang setiap
//   kali server di-redeploy/restart.

import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import webpush from "web-push";
import {
  initDb,
  addSubscription,
  removeSubscription,
  getSubscriptions,
  setReminders,
  getReminders,
  getAllReminders,
  markAck,
  bumpResendCount,
  getAckEntry,
} from "./db.js";

const PORT = process.env.PORT || 8787;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

// Berapa kali & seberapa sering notifikasi diulang selama belum di-ack,
// supaya "terasa" seperti alarm yang terus bunyi sampai dimatikan.
const RESEND_INTERVAL_MINUTES = 2;
const MAX_RESENDS = 10; // ~20 menit total kalau tidak pernah di-ack

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn(
    "[WARN] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY belum diset di server/.env.\n" +
      "       Jalankan `npm run generate-vapid` dulu, lalu isi server/.env."
  );
} else {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Routes ----------

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/push/vapid-public-key", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY || null });
});

// Simpan push subscription baru untuk seorang user (dipanggil sekali saat
// user mengaktifkan alarm / mengizinkan notifikasi di Settings).
app.post("/api/push/subscribe", async (req, res) => {
  const { userId, subscription } = req.body || {};
  if (!userId || !subscription?.endpoint) {
    return res.status(400).json({ error: "userId dan subscription wajib diisi" });
  }
  await addSubscription(userId, subscription);
  res.json({ ok: true });
});

app.post("/api/push/unsubscribe", async (req, res) => {
  const { userId, endpoint } = req.body || {};
  if (!userId || !endpoint) return res.status(400).json({ error: "userId dan endpoint wajib diisi" });
  await removeSubscription(userId, endpoint);
  res.json({ ok: true });
});

// Kirim notifikasi percobaan langsung, dipakai tombol "Tes Alarm" di Settings.
app.post("/api/push/test", async (req, res) => {
  const { userId, soundId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId wajib diisi" });
  const subs = await getSubscriptions(userId);
  if (subs.length === 0) {
    return res.status(404).json({ error: "Belum ada subscription aktif untuk user ini" });
  }
  await sendPushToUser(userId, {
    type: "test",
    title: "🔔 Tes Alarm BulkyApp",
    body: "Kalau kamu lihat ini, push notification berhasil sampai!",
    soundId: soundId || "alarm-klasik",
  });
  res.json({ ok: true, sentTo: subs.length });
});

// Client mengirim seluruh jadwal reminder-nya ke sini setiap kali ada
// perubahan (tambah/hapus/edit). Server jadi tahu jadwal mana yang perlu
// dipicu via cron, tanpa perlu client sedang online saat jam-nya tiba.
app.post("/api/reminders/sync", async (req, res) => {
  const { userId, remindersByDate } = req.body || {};
  if (!userId || typeof remindersByDate !== "object") {
    return res.status(400).json({ error: "userId dan remindersByDate wajib diisi" });
  }
  await setReminders(userId, remindersByDate);
  res.json({ ok: true });
});

app.get("/api/reminders/:userId", async (req, res) => {
  res.json({ remindersByDate: await getReminders(req.params.userId) });
});

// Dipanggil saat pengguna menekan "Selesai" di notifikasi atau di dalam app
// — menghentikan pengiriman ulang alarm untuk reminder tsb.
app.post("/api/reminders/ack", async (req, res) => {
  const { userId, reminderId } = req.body || {};
  if (!userId || !reminderId) return res.status(400).json({ error: "userId dan reminderId wajib diisi" });
  await markAck(userId, reminderId);
  res.json({ ok: true });
});

// ---------- Pengiriman push ----------

async function sendPushToUser(userId, payload) {
  const subs = await getSubscriptions(userId);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (err) {
        // 410/404 = subscription sudah tidak valid (mis. user uninstall PWA) -> bersihkan
        if (err.statusCode === 410 || err.statusCode === 404) {
          await removeSubscription(userId, sub.endpoint);
        } else {
          console.error(`Push gagal untuk user ${userId}:`, err.message);
        }
      }
    })
  );
}

// Loop utama: jalan tiap menit, cek semua user, cari reminder yang jamnya
// sudah lewat hari ini & belum "done", lalu kirim/kirim-ulang push.
async function tickReminders() {
  const allReminders = await getAllReminders();
  const currentTime = nowHHMM();
  const dateKey = todayKey();

  for (const userId of Object.keys(allReminders)) {
    const dayList = allReminders[userId]?.[dateKey] || [];
    for (const reminder of dayList) {
      if (reminder.done) continue;
      if (reminder.time > currentTime) continue; // belum waktunya

      const ack = await getAckEntry(userId, reminder.id);
      if (ack?.ackedAt) continue; // sudah dimatikan pengguna

      const resendCount = ack?.resendCount || 0;
      if (resendCount === 0) {
        await sendPushToUser(userId, buildReminderPayload(reminder, dateKey));
        await bumpResendCount(userId, reminder.id);
        continue;
      }

      if (resendCount >= MAX_RESENDS) continue; // berhenti setelah batas maksimal

      const lastSentAt = ack?.lastSentAt ? new Date(ack.lastSentAt).getTime() : 0;
      const minutesSince = (Date.now() - lastSentAt) / 60000;
      if (minutesSince >= RESEND_INTERVAL_MINUTES) {
        await sendPushToUser(userId, buildReminderPayload(reminder, dateKey, true));
        await bumpResendCount(userId, reminder.id);
      }
    }
  }
}

function buildReminderPayload(reminder, dateKey, isResend = false) {
  const mealLabels = {
    sarapan: "Sarapan",
    makan_siang: "Makan Siang",
    makan_malam: "Makan Malam",
    custom: "Camilan / Lainnya",
  };
  const mealLabel = mealLabels[reminder.mealType] || "Waktunya makan";
  return {
    type: "meal-reminder",
    reminderId: reminder.id,
    dateKey,
    title: isResend ? `⏰ Masih menunggu — ${mealLabel}` : `⏰ Waktunya ${mealLabel}!`,
    body: reminder.label ? reminder.label : "Ketuk untuk buka BulkyApp dan tandai selesai.",
    soundId: reminder.soundId || "alarm-klasik",
  };
}

cron.schedule("* * * * *", () => {
  tickReminders().catch((err) => console.error("tickReminders error:", err));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`BulkyApp push server jalan di http://localhost:${PORT}`);
      if (!VAPID_PUBLIC_KEY) console.log("-> Jangan lupa generate & isi VAPID keys di server/.env");
    });
  })
  .catch((err) => {
    console.error("Gagal inisialisasi database:", err);
    process.exit(1);
  });