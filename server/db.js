// Penyimpanan super sederhana berbasis file JSON, supaya scaffold ini bisa
// langsung dijalankan tanpa perlu setup database dulu.
//
// PENTING UNTUK PRODUCTION: ganti modul ini dengan database sungguhan
// (Postgres/SQLite/Mongo/dst) sebelum dipakai banyak pengguna nyata —
// file JSON tidak aman untuk concurrent write dalam skala besar dan akan
// hilang kalau server-nya stateless (mis. serverless / container ephemeral).
// Struktur fungsi di bawah ini sengaja dibuat generic (get/set per user)
// supaya gampang diganti ke DB tanpa mengubah server.js.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const SUBS_FILE = path.join(DATA_DIR, "subscriptions.json");
const REMINDERS_FILE = path.join(DATA_DIR, "reminders.json");
const ACKS_FILE = path.join(DATA_DIR, "acks.json");

function ensureFile(file, fallback) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
}

function readJson(file, fallback) {
  ensureFile(file, fallback);
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- Push subscriptions ----------
// Shape: { [userId]: [ { endpoint, keys: {p256dh, auth} }, ... ] }
export function getSubscriptions(userId) {
  const all = readJson(SUBS_FILE, {});
  return all[userId] || [];
}

export function addSubscription(userId, subscription) {
  const all = readJson(SUBS_FILE, {});
  const list = all[userId] || [];
  const exists = list.some((s) => s.endpoint === subscription.endpoint);
  if (!exists) list.push(subscription);
  all[userId] = list;
  writeJson(SUBS_FILE, all);
}

export function removeSubscription(userId, endpoint) {
  const all = readJson(SUBS_FILE, {});
  const list = (all[userId] || []).filter((s) => s.endpoint !== endpoint);
  all[userId] = list;
  writeJson(SUBS_FILE, all);
}

export function getAllUserIds() {
  const all = readJson(SUBS_FILE, {});
  return Object.keys(all);
}

// ---------- Reminders (synced dari client, sumber kebenaran tetap di client, ----------
// ---------- server cuma butuh cukup info untuk tahu kapan harus mengirim push) --------
// Shape: { [userId]: { "2026-08-28": [ {id, mealType, time, label, done, soundId} ] } }
export function setReminders(userId, remindersByDate) {
  const all = readJson(REMINDERS_FILE, {});
  all[userId] = remindersByDate;
  writeJson(REMINDERS_FILE, all);
}

export function getReminders(userId) {
  const all = readJson(REMINDERS_FILE, {});
  return all[userId] || {};
}

export function getAllReminders() {
  return readJson(REMINDERS_FILE, {});
}

// ---------- Acks (dipakai supaya cron tidak spam ulang notifikasi yang sudah dilihat) ----------
// Shape: { [userId]: { [reminderId]: { ackedAt, resendCount } } }
export function getAcks(userId) {
  const all = readJson(ACKS_FILE, {});
  return all[userId] || {};
}

export function markAck(userId, reminderId) {
  const all = readJson(ACKS_FILE, {});
  all[userId] = all[userId] || {};
  all[userId][reminderId] = { ackedAt: new Date().toISOString(), resendCount: 0 };
  writeJson(ACKS_FILE, all);
}

export function bumpResendCount(userId, reminderId) {
  const all = readJson(ACKS_FILE, {});
  all[userId] = all[userId] || {};
  const entry = all[userId][reminderId] || { resendCount: 0 };
  entry.resendCount = (entry.resendCount || 0) + 1;
  entry.lastSentAt = new Date().toISOString();
  all[userId][reminderId] = entry;
  writeJson(ACKS_FILE, all);
  return entry.resendCount;
}

export function getAckEntry(userId, reminderId) {
  const all = readJson(ACKS_FILE, {});
  return (all[userId] || {})[reminderId] || null;
}
