// Penyimpanan berbasis PostgreSQL (Railway).
//
// Struktur fungsi ini SENGAJA dibuat identik (nama & bentuk data) dengan
// versi db.js lama yang berbasis file JSON, supaya server.js tidak perlu
// diubah banyak — cuma perlu tambah `await` di titik yang memanggil fungsi
// dari modul ini (karena sekarang semua fungsi jadi async).

import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway")
    ? { rejectUnauthorized: false }
    : undefined,
});

// Dipanggil sekali saat server start (lihat server.js) untuk memastikan
// tabel-tabel yang dibutuhkan sudah ada.
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      subscription JSONB NOT NULL,
      PRIMARY KEY (user_id, endpoint)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reminders (
      user_id TEXT PRIMARY KEY,
      reminders_by_date JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS acks (
      user_id TEXT NOT NULL,
      reminder_id TEXT NOT NULL,
      acked_at TIMESTAMPTZ,
      resend_count INTEGER NOT NULL DEFAULT 0,
      last_sent_at TIMESTAMPTZ,
      PRIMARY KEY (user_id, reminder_id)
    );
  `);

  console.log("[db] Tabel Postgres siap (subscriptions, reminders, acks).");
}

// ---------- Push subscriptions ----------

export async function getSubscriptions(userId) {
  const { rows } = await pool.query(
    "SELECT subscription FROM subscriptions WHERE user_id = $1",
    [userId]
  );
  return rows.map((r) => r.subscription);
}

export async function addSubscription(userId, subscription) {
  await pool.query(
    `INSERT INTO subscriptions (user_id, endpoint, subscription)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, endpoint) DO UPDATE SET subscription = EXCLUDED.subscription`,
    [userId, subscription.endpoint, subscription]
  );
}

export async function removeSubscription(userId, endpoint) {
  await pool.query(
    "DELETE FROM subscriptions WHERE user_id = $1 AND endpoint = $2",
    [userId, endpoint]
  );
}

export async function getAllUserIds() {
  const { rows } = await pool.query("SELECT DISTINCT user_id FROM subscriptions");
  return rows.map((r) => r.user_id);
}

// ---------- Reminders ----------
// Sama seperti versi lama: setReminders MENGGANTI SELURUH remindersByDate
// milik user tsb (client selalu kirim state lengkap saat sync).

export async function setReminders(userId, remindersByDate) {
  await pool.query(
    `INSERT INTO reminders (user_id, reminders_by_date)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET reminders_by_date = EXCLUDED.reminders_by_date`,
    [userId, remindersByDate]
  );
}

export async function getReminders(userId) {
  const { rows } = await pool.query(
    "SELECT reminders_by_date FROM reminders WHERE user_id = $1",
    [userId]
  );
  return rows[0]?.reminders_by_date || {};
}

// Dipakai oleh cron (tickReminders) untuk mengecek SEMUA user sekaligus.
// Shape hasil sama seperti versi lama: { [userId]: { [dateKey]: [...] } }
export async function getAllReminders() {
  const { rows } = await pool.query("SELECT user_id, reminders_by_date FROM reminders");
  const result = {};
  for (const row of rows) {
    result[row.user_id] = row.reminders_by_date;
  }
  return result;
}

// ---------- Acks ----------

export async function getAcks(userId) {
  const { rows } = await pool.query("SELECT * FROM acks WHERE user_id = $1", [userId]);
  const result = {};
  for (const row of rows) {
    result[row.reminder_id] = {
      ackedAt: row.acked_at,
      resendCount: row.resend_count,
      lastSentAt: row.last_sent_at,
    };
  }
  return result;
}

export async function markAck(userId, reminderId) {
  await pool.query(
    `INSERT INTO acks (user_id, reminder_id, acked_at, resend_count)
     VALUES ($1, $2, NOW(), 0)
     ON CONFLICT (user_id, reminder_id)
     DO UPDATE SET acked_at = NOW(), resend_count = 0`,
    [userId, reminderId]
  );
}

export async function bumpResendCount(userId, reminderId) {
  const { rows } = await pool.query(
    `INSERT INTO acks (user_id, reminder_id, resend_count, last_sent_at)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (user_id, reminder_id)
     DO UPDATE SET resend_count = acks.resend_count + 1, last_sent_at = NOW()
     RETURNING resend_count`,
    [userId, reminderId]
  );
  return rows[0].resend_count;
}

export async function getAckEntry(userId, reminderId) {
  const { rows } = await pool.query(
    "SELECT * FROM acks WHERE user_id = $1 AND reminder_id = $2",
    [userId, reminderId]
  );
  if (!rows[0]) return null;
  return {
    ackedAt: rows[0].acked_at,
    resendCount: rows[0].resend_count,
    lastSentAt: rows[0].last_sent_at,
  };
}