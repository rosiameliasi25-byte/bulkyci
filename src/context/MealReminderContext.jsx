import { createContext, useContext, useCallback, useMemo, useEffect, useRef } from "react";
import { useAccountStorage } from "../hooks/useAccountStorage";
import { useAuth } from "./AuthContext";
import { syncRemindersToServer, ackReminderOnServer } from "../utils/pushClient";
import { PRESET_SOUNDS } from "../utils/alarmSounds";

const MealReminderContext = createContext(null);

// Key localStorage otomatis jadi `bulkyapp_meal_reminders_<userId>` lewat
// useAccountStorage yang sama dipakai TargetContext/HistoryContext/AppContext
// -> jadwal & riwayat pengingat antar akun dijamin tidak pernah tercampur,
// dan otomatis kosong lagi saat ganti/keluar akun (perilaku sama seperti
// data lain di aplikasi ini).
const NAMESPACE = "meal_reminders";
const PREFS_NAMESPACE = "alarm_prefs";
// Menyimpan tanggal terakhir kali alarm harian default (Sarapan/Siang/Malam)
// otomatis dibuat, supaya generate-nya benar-benar cuma sekali per hari per
// akun — bukan setiap kali komponen remount. Kalau pengguna menghapus semua
// reminder hari itu secara manual, sistem TIDAK akan membuatnya ulang di
// hari yang sama (menghormati penghapusan), tapi akan generate lagi besok.
const AUTO_GEN_NAMESPACE = "auto_reminder_meta";

// { "2026-08-28": [ { id, mealType, time, label, done, note, soundId, createdAt } ] }
const DEFAULT_REMINDERS = {};
const DEFAULT_ALARM_PREFS = {
  defaultSoundId: PRESET_SOUNDS[0].id, // "alarm-klasik"
  customSound: null, // { name, dataUrl } kalau pengguna upload suara sendiri
};
const DEFAULT_AUTO_GEN_STATE = { lastGeneratedDate: null };

// Jadwal makan default yang di-auto-generate tiap hari — hanya 3 waktu makan
// utama sesuai permintaan (Sarapan/Siang/Malam). "Camilan/Lainnya" tetap
// murni manual, tidak di-auto-generate.
const DEFAULT_DAILY_MEALS = [
  { mealType: "sarapan", time: "07:00" },
  { mealType: "makan_siang", time: "12:30" },
  { mealType: "makan_malam", time: "19:00" },
];

export const MEAL_TYPES = [
  { value: "sarapan", label: "Sarapan", defaultTime: "07:00", sharePct: 0.25 },
  { value: "makan_siang", label: "Makan Siang", defaultTime: "12:30", sharePct: 0.4 },
  { value: "makan_malam", label: "Makan Malam", defaultTime: "19:00", sharePct: 0.35 },
  { value: "custom", label: "Camilan / Lainnya", defaultTime: "16:00", sharePct: 0 },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export function MealReminderProvider({ children }) {
  const { user } = useAuth();
  const { value: reminders, setValue: setReminders, clear: clearReminders } = useAccountStorage(
    NAMESPACE,
    DEFAULT_REMINDERS
  );
  const { value: alarmPrefs, setValue: setAlarmPrefs, clear: clearAlarmPrefs } = useAccountStorage(
    PREFS_NAMESPACE,
    DEFAULT_ALARM_PREFS
  );
  const { value: autoGenState, setValue: setAutoGenState } = useAccountStorage(
    AUTO_GEN_NAMESPACE,
    DEFAULT_AUTO_GEN_STATE
  );

  // Debounce sinkronisasi ke backend supaya tidak nembak request tiap
  // keystroke — cukup sesaat setelah perubahan reda.
  const syncTimer = useRef(null);
  useEffect(() => {
    if (!user) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncRemindersToServer(user.id, reminders);
    }, 800);
    return () => clearTimeout(syncTimer.current);
  }, [reminders, user]);

  const addReminder = useCallback(
    (dateKey, { mealType, time, label, note, soundId }) => {
      setReminders((prev) => {
        const dayList = prev[dateKey] || [];
        const entry = {
          id: crypto.randomUUID(),
          mealType,
          time,
          label: label?.trim() || "",
          note: note?.trim() || "",
          soundId: soundId || alarmPrefs.defaultSoundId,
          done: false,
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          [dateKey]: [...dayList, entry].sort((a, b) => a.time.localeCompare(b.time)),
        };
      });
    },
    [setReminders, alarmPrefs.defaultSoundId]
  );

  // --- Auto-generate alarm harian default (Sarapan 07:00, Makan Siang
  // 12:30, Makan Malam 19:00) ------------------------------------------
  // Jalan sekali setiap kali akun berganti tanggal aktif (login pertama
  // hari itu, atau tab dibiarkan terbuka lewat tengah malam). Memakai
  // `addReminder` yang sama dipakai form manual, jadi otomatis tergabung
  // dalam `remindersByDate` yang sama dan ikut ter-sync ke backend lewat
  // effect debounce di bawah — TIDAK ada jalur terpisah, TIDAK menyentuh
  // server.js/db.js sama sekali.
  useEffect(() => {
    if (!user) return;
    const today = todayKey();
    if (autoGenState.lastGeneratedDate === today) return; // sudah pernah hari ini

    DEFAULT_DAILY_MEALS.forEach((meal) => {
      addReminder(today, { mealType: meal.mealType, time: meal.time });
    });
    setAutoGenState({ lastGeneratedDate: today });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, autoGenState.lastGeneratedDate]);
  // ----------------------------------------------------------------------

  const toggleReminderDone = useCallback(
    (dateKey, id) => {
      let willBeDone = false;
      setReminders((prev) => {
        const dayList = prev[dateKey] || [];
        return {
          ...prev,
          [dateKey]: dayList.map((r) => {
            if (r.id !== id) return r;
            willBeDone = !r.done;
            return { ...r, done: willBeDone };
          }),
        };
      });
      // Kalau ditandai selesai, beri tahu backend supaya berhenti kirim
      // ulang alarm untuk reminder ini (lihat server/server.js).
      if (user) ackReminderOnServer(user.id, id);
      return willBeDone;
    },
    [setReminders, user]
  );

  // Dipanggil dari AlarmPlayer saat pengguna menekan "Selesai" langsung dari
  // notifikasi/alarm yang sedang berbunyi (bukan dari daftar kalender).
  const ackReminder = useCallback(
    (dateKey, id) => {
      setReminders((prev) => {
        const dayList = prev[dateKey] || [];
        return { ...prev, [dateKey]: dayList.map((r) => (r.id === id ? { ...r, done: true } : r)) };
      });
      if (user) ackReminderOnServer(user.id, id);
    },
    [setReminders, user]
  );

  const deleteReminder = useCallback(
    (dateKey, id) => {
      setReminders((prev) => {
        const dayList = prev[dateKey] || [];
        const next = dayList.filter((r) => r.id !== id);
        const updated = { ...prev };
        if (next.length === 0) {
          delete updated[dateKey];
        } else {
          updated[dateKey] = next;
        }
        return updated;
      });
    },
    [setReminders]
  );

  const updateAlarmPrefs = useCallback(
    (patch) => {
      setAlarmPrefs((prev) => ({ ...prev, ...patch }));
    },
    [setAlarmPrefs]
  );

  // Set berisi semua tanggal yang punya minimal 1 pengingat — dipakai
  // kalender untuk menampilkan titik penanda tanpa perlu iterasi ulang tiap render.
  const datesWithReminders = useMemo(() => new Set(Object.keys(reminders)), [reminders]);

  const getRemindersForDate = useCallback((dateKey) => reminders[dateKey] || [], [reminders]);

  // Cari sebuah reminder by id lintas tanggal — dipakai AlarmPlayer saat
  // menerima payload push yang cuma bawa reminderId + dateKey.
  const findReminder = useCallback(
    (dateKey, id) => (reminders[dateKey] || []).find((r) => r.id === id) || null,
    [reminders]
  );

  return (
    <MealReminderContext.Provider
      value={{
        reminders,
        datesWithReminders,
        getRemindersForDate,
        addReminder,
        toggleReminderDone,
        ackReminder,
        deleteReminder,
        clearReminders,
        findReminder,
        todayKey,
        alarmPrefs,
        updateAlarmPrefs,
        clearAlarmPrefs,
      }}
    >
      {children}
    </MealReminderContext.Provider>
  );
}

export function useMealReminders() {
  const ctx = useContext(MealReminderContext);
  if (!ctx) throw new Error("useMealReminders must be used within a <MealReminderProvider>");
  return ctx;
}
