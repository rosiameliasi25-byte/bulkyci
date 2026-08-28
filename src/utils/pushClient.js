// Helper untuk sisi klien dari Web Push: registrasi service worker,
// minta izin notifikasi, subscribe ke push service browser, lalu kirim
// subscription-nya ke backend (server/) supaya backend bisa mengirim
// alarm walau tab ini sedang tertutup.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://bulkyci-production.up.railway.app";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/service-worker.js");
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

// Alur lengkap: daftar SW -> minta izin -> subscribe push -> kirim ke backend.
// Return { ok, reason } supaya UI bisa kasih pesan yang jelas ke pengguna.
export async function enablePushAlarm(userId) {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "missing-vapid-key" };

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return { ok: false, reason: permission };

  const registration = await registerServiceWorker();
  if (!registration) return { ok: false, reason: "sw-failed" };

  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const res = await fetch(`${API_BASE}/api/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, subscription }),
  });
  if (!res.ok) return { ok: false, reason: "server-error" };

  return { ok: true };
}

export async function disablePushAlarm(userId) {
  if (!isPushSupported()) return { ok: false };
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await fetch(`${API_BASE}/api/push/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, endpoint: subscription.endpoint }),
    }).catch(() => {});
    await subscription.unsubscribe();
  }
  return { ok: true };
}

export async function getPushStatus() {
  if (!isPushSupported()) return { supported: false, subscribed: false, permission: "unsupported" };
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return {
    supported: true,
    subscribed: Boolean(subscription),
    permission: Notification.permission,
  };
}

export async function syncRemindersToServer(userId, remindersByDate) {
  try {
    await fetch(`${API_BASE}/api/reminders/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, remindersByDate }),
    });
  } catch {
    // Offline atau server belum jalan — reminder tetap tersimpan di client,
    // cukup gagal-diam untuk sinkronisasi ke backend, coba lagi next change.
  }
}

export async function ackReminderOnServer(userId, reminderId) {
  try {
    await fetch(`${API_BASE}/api/reminders/ack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, reminderId }),
    });
  } catch {
    // gagal-diam, sama seperti sync
  }
}

export async function sendTestAlarm(userId, soundId) {
  const res = await fetch(`${API_BASE}/api/push/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, soundId }),
  });
  return res.ok;
}
