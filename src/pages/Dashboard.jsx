import { useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Camera, UtensilsCrossed, Clock, Dumbbell, CheckCircle2, Circle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { useWorkout, WORKOUT_TYPES } from "../context/WorkoutContext";
import Navbar from "../components/Navbar";
import MacroProgressBar from "../components/MacroProgressBar";
import CalorieRing from "../components/CalorieRing";
import FoodScannerModal from "../components/FoodScannerModal";

export default function Dashboard() {
  const { onboarded, targets, todayLog } = useApp();
  const [scannerOpen, setScannerOpen] = useState(false);
  const { todayType, todayDone, todayKey, toggleWorkoutDone } = useWorkout();

  // Lapisan tambahan anti tombol Back: verifikasi ulang localStorage saat
  // Dashboard dimuat/dipulihkan dari bfcache, di luar guard <RequireAuth>.
  useAuthGuard();

  const totals = useMemo(
    () =>
      (todayLog || []).reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [todayLog]
  );

  // PENTING: guard/early-return ini harus SETELAH semua hook di atas
  // (useState, useMemo). Kalau diletakkan sebelum hook seperti sebelumnya,
  // jumlah hook yang dipanggil React akan berubah-ubah setiap kali status
  // `onboarded` berubah (misalnya tepat saat logout, karena AppContext
  // ikut ter-reset) -> React melempar error "change in the order of
  // Hooks" dan halaman gagal berpindah dengan mulus ke halaman lain.
  if (!onboarded || !targets) return <Navigate to="/onboarding" replace />;

  return (
    <div className="min-h-screen bg-cream pb-28">
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        {/* Ringkasan kalori hari ini */}
        <section className="card mb-6 flex flex-col items-center gap-2 p-8 animate-fade-up">
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-sage-600">
            Kalori Hari Ini
          </p>
          <CalorieRing consumed={totals.calories} target={targets.calorieTarget} />
        </section>

        {/* Progres makronutrien */}
        <section className="card mb-6 space-y-5 p-6 sm:p-8 animate-fade-up">
          <h2 className="font-display text-lg font-bold text-ink">Makronutrien</h2>
          <MacroProgressBar label="Protein" current={totals.protein} target={targets.proteinTarget} color="sage" />
          <MacroProgressBar label="Karbohidrat" current={totals.carbs} target={targets.carbTarget} color="amber" />
          <MacroProgressBar label="Lemak" current={totals.fat} target={targets.fatTarget} color="clay" />
        </section>

        {/* Tombol scan utama — CTA paling mencolok di halaman ini */}
        <section className="mb-6 flex justify-center animate-fade-up">
          <button
            onClick={() => setScannerOpen(true)}
            className="btn-primary w-full !py-5 text-lg shadow-glow sm:w-auto sm:px-14"
          >
            <Camera size={22} />
            Scan Makanan dengan AI
          </button>
        </section>

        {/* Ringkasan latihan hari ini — ditambahkan, tidak menggantikan section manapun */}
        <section className="card mb-6 flex items-center justify-between gap-3 p-5 sm:p-6 animate-fade-up">
          <Link to="/latihan" className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Dumbbell size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Latihan Hari Ini
              </span>
              <span className="block truncate font-display text-sm font-bold text-ink">
                {WORKOUT_TYPES[todayType]?.label || "Istirahat"}
              </span>
            </span>
          </Link>
          <button
            onClick={() => toggleWorkoutDone(todayKey())}
            className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-semibold transition ${
              todayDone ? "bg-sage-500 text-white" : "border border-sage-200 text-ink-soft hover:bg-sage-50"
            }`}
          >
            {todayDone ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            {todayDone ? "Selesai" : "Tandai"}
          </button>
        </section>

        {/* Menu hari ini */}
        <section className="card p-6 sm:p-8 animate-fade-up">
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Menu Hari Ini</h2>

          {todayLog.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <UtensilsCrossed size={32} className="text-ink-faint" />
              <p className="text-sm text-ink-faint">Belum ada makanan tercatat. Yuk scan makananmu!</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {todayLog
                .slice()
                .reverse()
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl bg-cream-soft px-4 py-3.5"
                  >
                    <div>
                      <p className="font-display text-sm font-semibold text-ink">{item.name}</p>
                      <p className="flex items-center gap-1 text-xs text-ink-faint">
                        <Clock size={11} />
                        {new Date(item.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-sm font-bold text-amber-600">{item.calories} kkal</p>
                      <p className="text-xs text-ink-faint">{item.protein}g protein</p>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </main>

      {scannerOpen && <FoodScannerModal onClose={() => setScannerOpen(false)} />}
    </div>
  );
}
