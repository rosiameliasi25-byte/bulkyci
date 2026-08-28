import { useEffect, useRef, useState } from "react";
import { AlarmClock, Check, Clock } from "lucide-react";
import { useMealReminders } from "../context/MealReminderContext";
import { resolveSoundUrl } from "../utils/alarmSounds";

// Komponen ini yang benar-benar MEMBUNYIKAN suara alarm keras di dalam app.
//
// Kenapa harus lewat komponen React (bukan langsung di service worker)?
// Karena service worker tidak punya akses ke elemen <audio> / Web Audio API
// sama sekali — jadi begitu push masuk & app terbuka (baik karena user tap
// notifikasi, atau tab-nya kebetulan sedang aktif), service worker mem-
// posting pesan ke sini lewat postMessage, dan komponen inilah yang muter
// file suara pilihan pengguna (preset atau custom upload) dengan loop terus
// menerus sampai pengguna menekan "Selesai" — supaya benar-benar terasa
// seperti alarm, bukan notifikasi diam yang lewat begitu saja.
export default function AlarmPlayer() {
  const { findReminder, ackReminder, addReminder, alarmPrefs } = useMealReminders();
  const [active, setActive] = useState(null); // { title, body, reminderId, dateKey, soundId }
  const audioRef = useRef(null);

  function stopAudioNow() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }

  // Dipakai baik dari tombol banner maupun dari aksi "Tunda 5 menit" di
  // notifikasi OS: hentikan alarm yang sedang bunyi, lalu buat reminder
  // baru 5 menit dari waktu reminder asli.
  function snoozeReminder(dateKey, reminderId) {
    const reminder = findReminder(dateKey, reminderId);
    ackReminder(dateKey, reminderId); // hentikan alarm asli supaya backend tidak kirim ulang
    if (!reminder) return;
    const [h, m] = reminder.time.split(":").map(Number);
    const snoozed = new Date();
    snoozed.setHours(h, m + 5, 0, 0);
    const snoozedTime = `${String(snoozed.getHours()).padStart(2, "0")}:${String(
      snoozed.getMinutes()
    ).padStart(2, "0")}`;
    addReminder(dateKey, {
      mealType: reminder.mealType,
      time: snoozedTime,
      label: reminder.label,
      soundId: reminder.soundId,
    });
  }

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function playSound(soundId) {
      stopAudioNow();
      const url = resolveSoundUrl(soundId, alarmPrefs.customSound);
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 1.0;
      // Autoplay tanpa gesture pengguna bisa diblokir browser kalau tab ini
      // belum pernah ada interaksi sama sekali sebelumnya — tidak banyak
      // yang bisa dilakukan dari sisi kode untuk kasus itu selain banner
      // visual di bawah ini (yang juga berfungsi sebagai tombol putar manual).
      audio.play().catch(() => {
        /* diblokir browser — banner tetap tampil, pengguna bisa tap untuk memicu play() */
      });
      audioRef.current = audio;
    }

    function handleMessage(event) {
      const { kind, payload } = event.data || {};
      if (!payload) return;

      if (kind === "PLAY_ALARM") {
        const reminder = payload.reminderId ? findReminder(payload.dateKey, payload.reminderId) : null;
        const soundId = reminder?.soundId || payload.soundId || alarmPrefs.defaultSoundId;
        setActive({
          title: payload.title,
          body: payload.body,
          reminderId: payload.reminderId,
          dateKey: payload.dateKey,
          soundId,
        });
        playSound(soundId);
      }

      if (kind === "ACK_ALARM") {
        stopAudioNow();
        setActive(null);
        if (payload.reminderId && payload.dateKey) ackReminder(payload.dateKey, payload.reminderId);
      }

      if (kind === "SNOOZE_ALARM") {
        stopAudioNow();
        setActive(null);
        if (payload.reminderId && payload.dateKey) snoozeReminder(payload.dateKey, payload.reminderId);
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, [findReminder, ackReminder, addReminder, alarmPrefs]);

  function handleDismiss() {
    stopAudioNow();
    if (active?.reminderId && active?.dateKey) ackReminder(active.dateKey, active.reminderId);
    setActive(null);
  }

  function handleSnooze5() {
    if (!active) return;
    stopAudioNow();
    if (active.reminderId && active.dateKey) snoozeReminder(active.dateKey, active.reminderId);
    setActive(null);
  }

  function handleManualPlay() {
    // Kalau autoplay diblokir tadi, tap di banner ini adalah user-gesture
    // yang cukup untuk browser mengizinkan audio diputar.
    if (audioRef.current) audioRef.current.play().catch(() => {});
  }

  if (!active) return null;

  return (
    <div
      onClick={handleManualPlay}
      className="fixed inset-x-0 top-0 z-[999] mx-auto flex max-w-md animate-fade-up flex-col gap-3 rounded-b-3xl border border-amber-200 bg-amber-50 p-4 shadow-glow sm:top-4 sm:rounded-3xl"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-2xl bg-amber-400 text-white">
          <AlarmClock size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-ink">{active.title}</p>
          {active.body && <p className="text-xs text-ink-faint">{active.body}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="btn-primary flex-1 !py-2.5 text-sm"
        >
          <Check size={16} />
          Selesai
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSnooze5();
          }}
          className="btn-secondary flex-1 !py-2.5 text-sm"
        >
          <Clock size={16} />
          Tunda 5 menit
        </button>
      </div>
    </div>
  );
}
