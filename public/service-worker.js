// Service Worker untuk fitur Alarm Pengingat Makan.
//
// PENTING: Service Worker TIDAK BISA memutar file audio (tidak ada akses
// DOM/<audio> di sini) — jadi saat push masuk selagi app benar-benar
// tertutup, yang bunyi adalah suara notifikasi BAWAAN OS/browser + getar.
// Suara custom/preset pilihan pengguna baru diputar KERAS begitu pengguna
// tap notifikasi ini dan app terbuka (lihat pesan postMessage ke klien,
// ditangani oleh AlarmPlayer di src/components/AlarmPlayer.jsx).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "BulkyApp", body: event.data.text() };
  }

  const title = payload.title || "⏰ BulkyApp";
  const options = {
    body: payload.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: payload.reminderId ? `reminder-${payload.reminderId}` : `bulkyapp-${payload.type || "notif"}`,
    renotify: true,
    requireInteraction: true, // notifikasi tetap ada sampai diklik, bukan hilang sendiri
    vibrate: [300, 150, 300, 150, 300], // pola getar mirip alarm (Android)
    data: payload,
    actions: [
      { action: "done", title: "Selesai" },
      { action: "snooze", title: "Tunda 5 menit" },
    ],
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);

      // Kalau ada tab yang sedang terbuka/fokus, langsung minta dia
      // memutar suara alarm pilihan pengguna sekarang juga (tidak perlu
      // menunggu klik notifikasi).
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientsList) {
        client.postMessage({ kind: "PLAY_ALARM", payload });
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  const payload = event.notification.data || {};
  event.notification.close();

  if (event.action === "snooze") {
    // Snooze sederhana: minta klien (kalau ada) menjadwalkan ulang 5 menit
    // lagi. Kalau tidak ada klien terbuka, snooze diselesaikan lain kali
    // app dibuka (lihat sync reminder di MealReminderContext).
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        list.forEach((c) => c.postMessage({ kind: "SNOOZE_ALARM", payload }));
      })
    );
    return;
  }

  const targetUrl = "/kalender";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clientsList.find((c) => c.url.includes(self.location.origin));

      if (existing) {
        existing.postMessage({ kind: event.action === "done" ? "ACK_ALARM" : "PLAY_ALARM", payload });
        return existing.focus();
      }
      const opened = await self.clients.openWindow(targetUrl);
      if (opened) {
        // Beri sedikit waktu untuk app mount sebelum kirim pesan.
        setTimeout(() => {
          opened.postMessage({ kind: event.action === "done" ? "ACK_ALARM" : "PLAY_ALARM", payload });
        }, 1500);
      }
    })()
  );
});
