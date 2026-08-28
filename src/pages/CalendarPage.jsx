import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  Clock,
  Volume2,
  Play,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useMealReminders, MEAL_TYPES } from "../context/MealReminderContext";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { PRESET_SOUNDS, resolveSoundUrl } from "../utils/alarmSounds";
import Navbar from "../components/Navbar";

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function toDateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function mealMeta(mealType) {
  return MEAL_TYPES.find((m) => m.value === mealType) || MEAL_TYPES[MEAL_TYPES.length - 1];
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { targets } = useApp();
  const {
    datesWithReminders,
    getRemindersForDate,
    addReminder,
    toggleReminderDone,
    deleteReminder,
    todayKey,
    alarmPrefs,
  } = useMealReminders();

  useAuthGuard();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState(todayKey());

  const [form, setForm] = useState({
    mealType: "sarapan",
    time: "07:00",
    label: "",
    soundId: alarmPrefs.defaultSoundId,
  });

  function playSoundPreview(soundId) {
    const url = resolveSoundUrl(soundId, alarmPrefs.customSound);
    new Audio(url).play().catch(() => {});
  }

  // --- Bangun grid kalender bulan berjalan ---
  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay(); // 0 = Minggu
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  function goToPrevMonth() {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function goToNextMonth() {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  const selectedReminders = getRemindersForDate(selectedDate);

  // Rekomendasi otomatis dari sistem, dihitung dari target kalori harian
  // pengguna (bukan pengganti input manual — murni saran default per jenis makan).
  const recommendations = useMemo(() => {
    const calorieTarget = targets?.calorieTarget;
    return MEAL_TYPES.filter((m) => m.sharePct > 0).map((m) => ({
      ...m,
      calorieShare: calorieTarget ? Math.round((calorieTarget * m.sharePct) / 10) * 10 : null,
    }));
  }, [targets]);

  function handleAddReminder(e) {
    e.preventDefault();
    if (!form.time) return;
    addReminder(selectedDate, form);
    setForm((f) => ({ ...f, label: "" }));
  }



  function applyRecommendation(rec) {
    addReminder(selectedDate, { mealType: rec.value, time: rec.defaultTime, label: "", soundId: form.soundId });
  }

  const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
  const selectedDateLabel = selectedDateObj.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-cream pb-28">
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sage-200 bg-white text-ink-soft transition hover:bg-sage-50 dark:bg-cream-card dark:border-ink/10"
            aria-label="Kembali ke Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Kalender &amp; Pengingat Makan</h1>
            <p className="text-sm text-ink-faint">Atur jadwal makanmu, khusus untuk akun ini.</p>
          </div>
        </div>

        {/* Kalender bulanan */}
        <section className="card mb-6 p-5 sm:p-6 animate-fade-up">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={goToPrevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-sage-50"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-display text-base font-bold text-ink">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={goToNextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-sage-50"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-1.5 text-xs font-semibold text-ink-faint">
                {d}
              </div>
            ))}

            {calendarCells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;

              const dateKey = toDateKey(viewYear, viewMonth, day);
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayKey();
              const hasReminders = datesWithReminders.has(dateKey);

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`relative aspect-square rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    isSelected
                      ? "bg-sage-500 text-white shadow-glow"
                      : isToday
                      ? "border-2 border-amber-300 text-ink hover:bg-sage-50"
                      : "text-ink-soft hover:bg-sage-50"
                  }`}
                >
                  {day}
                  {hasReminders && (
                    <span
                      className={`absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                        isSelected ? "bg-white" : "bg-amber-400"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Detail tanggal terpilih */}
        <section className="card mb-6 p-5 sm:p-6 animate-fade-up">
          <h3 className="mb-1 font-display text-base font-bold text-ink capitalize">{selectedDateLabel}</h3>
          <p className="mb-4 text-sm text-ink-faint">Pengingat makan untuk tanggal ini.</p>

          {selectedReminders.length === 0 ? (
            <p className="mb-4 rounded-2xl bg-cream-soft px-4 py-3.5 text-sm text-ink-faint">
              Belum ada pengingat. Tambahkan lewat form di bawah, atau pakai rekomendasi sistem.
            </p>
          ) : (
            <ul className="mb-4 space-y-2">
              {selectedReminders.map((r) => {
                const meta = mealMeta(r.mealType);
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-cream-soft px-4 py-3"
                  >
                    <button
                      onClick={() => toggleReminderDone(selectedDate, r.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {r.done ? (
                        <CheckCircle2 size={20} className="shrink-0 text-sage-500" />
                      ) : (
                        <Circle size={20} className="shrink-0 text-ink-faint" />
                      )}
                      <span className="min-w-0">
                        <span
                          className={`block truncate font-display text-sm font-semibold ${
                            r.done ? "text-ink-faint line-through" : "text-ink"
                          }`}
                        >
                          {meta.label}
                          {r.label ? ` — ${r.label}` : ""}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-ink-faint">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {r.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Volume2 size={11} />
                            {PRESET_SOUNDS.find((s) => s.id === r.soundId)?.label ||
                              (r.soundId === "custom" ? "Custom" : "Klasik")}
                          </span>
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => deleteReminder(selectedDate, r.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Hapus pengingat"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Rekomendasi sistem berdasarkan target kalori harian */}
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <Sparkles size={14} />
              Rekomendasi Sistem
            </p>
            <div className="flex flex-wrap gap-2">
              {recommendations.map((rec) => (
                <button
                  key={rec.value}
                  onClick={() => applyRecommendation(rec)}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  + {rec.label} · {rec.defaultTime}
                  {rec.calorieShare ? ` · ~${rec.calorieShare} kkal` : ""}
                </button>
              ))}
            </div>
            {!targets?.calorieTarget && (
              <p className="mt-2 text-xs text-amber-700/80">
                Set target kalori di halaman Onboarding/Pengaturan untuk estimasi kalori per makan.
              </p>
            )}
          </div>

          {/* Form tambah manual */}
          <form onSubmit={handleAddReminder} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
            <input
              type="text"
              placeholder="Catatan (opsional), mis. Ayam & nasi merah"
              className="input-field sm:col-span-1"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
            <select
              className="input-field"
              value={form.mealType}
              onChange={(e) => setForm((f) => ({ ...f, mealType: e.target.value }))}
            >
              {MEAL_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              type="time"
              className="input-field"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
            <button type="submit" className="btn-primary !px-5">
              <Plus size={18} />
              Tambah
            </button>

            <div className="flex items-center gap-2 sm:col-span-4">
              <Volume2 size={16} className="shrink-0 text-ink-faint" />
              <select
                className="input-field !py-2 text-sm"
                value={form.soundId}
                onChange={(e) => setForm((f) => ({ ...f, soundId: e.target.value }))}
              >
                {PRESET_SOUNDS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
                {alarmPrefs.customSound && <option value="custom">Custom — {alarmPrefs.customSound.name}</option>}
              </select>
              <button
                type="button"
                onClick={() => playSoundPreview(form.soundId)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-50 text-sage-600 hover:bg-sage-100"
                aria-label="Dengarkan suara"
              >
                <Play size={14} />
              </button>
              <span className="text-xs text-ink-faint">Suara alarm untuk pengingat ini</span>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
