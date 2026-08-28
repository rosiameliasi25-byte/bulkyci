import { useNavigate } from "react-router-dom";
import { ArrowLeft, Dumbbell, CheckCircle2, Circle, RotateCcw } from "lucide-react";
import { useWorkout, WORKOUT_TYPES } from "../context/WorkoutContext";
import { useAuthGuard } from "../hooks/useAuthGuard";
import Navbar from "../components/Navbar";

const DAY_LABELS = { mon: "Senin", tue: "Selasa", wed: "Rabu", thu: "Kamis", fri: "Jumat", sat: "Sabtu", sun: "Minggu" };

const TYPE_BADGE_CLASS = {
  push: "bg-amber-100 text-amber-700",
  pull: "bg-sage-100 text-sage-700",
  legs: "bg-orange-100 text-orange-700",
  rest: "bg-ink/5 text-ink-faint",
};

export default function WorkoutPage() {
  const navigate = useNavigate();
  const { weekPlan, todayType, todayDone, todayKey, todayDayCode, setDayType, toggleWorkoutDone, getExercisesFor } =
    useWorkout();

  useAuthGuard();

  const todayExercises = getExercisesFor(todayType);
  const todayLabel = WORKOUT_TYPES[todayType]?.label || "Istirahat";

  return (
    <div className="min-h-screen bg-cream pb-28">
      <Navbar />

      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sage-200 bg-white text-ink-soft transition hover:bg-sage-50 dark:border-ink/10 dark:bg-cream-card"
            aria-label="Kembali ke Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Target Olahraga</h1>
            <p className="text-sm text-ink-faint">Push/Pull/Legs — hypertrophy, khusus akun ini.</p>
          </div>
        </div>

        {/* Latihan hari ini */}
        <section className="card mb-6 p-6 sm:p-8 animate-fade-up">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Dumbbell size={20} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Hari ini</p>
                <h2 className="font-display text-lg font-bold text-ink">{todayLabel}</h2>
              </div>
            </div>
            <button
              onClick={() => toggleWorkoutDone(todayKey())}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                todayDone ? "bg-sage-500 text-white" : "border border-sage-200 text-ink-soft hover:bg-sage-50"
              }`}
            >
              {todayDone ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {todayDone ? "Selesai" : "Tandai Selesai"}
            </button>
          </div>

          {todayExercises.length === 0 ? (
            <p className="rounded-2xl bg-cream-soft px-4 py-3.5 text-sm text-ink-faint">
              Hari istirahat — recovery juga bagian penting dari pertumbuhan otot. 💪
            </p>
          ) : (
            <ul className="space-y-2">
              {todayExercises.map((ex) => (
                <li
                  key={ex.name}
                  className="flex items-center justify-between rounded-2xl bg-cream-soft px-4 py-3"
                >
                  <span className="font-display text-sm font-semibold text-ink">{ex.name}</span>
                  <span className="text-xs font-semibold text-ink-faint">
                    {ex.sets} set × {ex.reps} rep
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Jadwal mingguan */}
        <section className="card p-6 sm:p-8 animate-fade-up">
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Jadwal Mingguan</h2>
          <div className="space-y-2">
            {weekPlan.map(({ day, type }) => (
              <div
                key={day}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                  day === todayDayCode() ? "border-2 border-amber-300" : "bg-cream-soft"
                }`}
              >
                <span className="font-display text-sm font-semibold text-ink">{DAY_LABELS[day]}</span>
                <select
                  value={type}
                  onChange={(e) => setDayType(day, e.target.value)}
                  className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold ${TYPE_BADGE_CLASS[type]}`}
                >
                  {Object.entries(WORKOUT_TYPES).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
            <RotateCcw size={12} />
            Ubah jenis latihan tiap hari sesuai jadwalmu — perubahan tersimpan otomatis.
          </p>
        </section>
      </main>
    </div>
  );
}
