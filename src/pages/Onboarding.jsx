import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Scale, Target, Ruler, Calendar, Flame } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { calculateBulkTargets, ACTIVITY_OPTIONS } from "../utils/calorieCalculator";

// Halaman onboarding — dikumpulkan sekali di awal (setelah login) untuk
// menghitung kebutuhan kalori & protein harian pengguna sebelum masuk ke
// Dashboard. Rute ini dibungkus <RequireAuth> di App.jsx, jadi hanya bisa
// diakses oleh pengguna yang sudah login.
export default function Onboarding() {
  const navigate = useNavigate();
  const { onboarded, completeOnboarding } = useApp();

  // Lapisan tambahan anti tombol Back: verifikasi ulang localStorage saat
  // Onboarding dimuat/dipulihkan dari bfcache, di luar guard <RequireAuth>.
  useAuthGuard();

  const [form, setForm] = useState({
    weight: "",
    targetWeight: "",
    height: "",
    age: "",
    gender: "male",
    activity: "light",
  });
  const [errors, setErrors] = useState({});

  // Sudah pernah isi onboarding sebelumnya -> langsung ke Dashboard,
  // jangan minta isi ulang. PENTING: pengecekan ini harus SETELAH semua
  // hook di atas (useState dkk), bukan sebelumnya — kalau diletakkan
  // sebelum hook, React akan memanggil jumlah hook yang berbeda-beda di
  // antar render (mis. saat status `onboarded` berubah), yang membuat
  // React melempar error "Rendered fewer hooks than expected" dan
  // seluruh halaman menjadi blank/crash.
  if (onboarded) return <Navigate to="/dashboard" replace />;

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.weight || form.weight <= 0) next.weight = "Wajib diisi";
    if (!form.targetWeight || form.targetWeight <= 0) next.targetWeight = "Wajib diisi";
    if (Number(form.targetWeight) <= Number(form.weight)) next.targetWeight = "Harus lebih besar dari berat saat ini";
    if (!form.height || form.height <= 0) next.height = "Wajib diisi";
    if (!form.age || form.age <= 0) next.age = "Wajib diisi";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const profile = {
      weight: Number(form.weight),
      targetWeight: Number(form.targetWeight),
      height: Number(form.height),
      age: Number(form.age),
      gender: form.gender,
      activity: form.activity,
    };

    const targets = calculateBulkTargets(profile);

    // carbTarget & fatTarget sudah dihitung di dalam calculateBulkTargets
    // (satu sumber kebenaran, dipakai sama persis di halaman Pengaturan).
    completeOnboarding(profile, targets);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-cream px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-lg">
        {/* Intro */}
        <div className="mb-8 text-center animate-fade-up">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-sage-500 shadow-glow">
            <Flame className="text-white" size={26} />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Selamat Datang di Bulky</h1>
          <p className="mt-2 text-ink-soft">
            Isi data dirimu supaya kami bisa hitung target kalori & protein harian untuk menaikkan berat badan secara sehat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6 p-6 sm:p-8 animate-fade-up">
          {/* Berat & target berat */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">
                <Scale size={14} className="mb-0.5 mr-1 inline" /> Berat Saat Ini (kg)
              </label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="55"
                value={form.weight}
                onChange={update("weight")}
                className="input-field"
              />
              {errors.weight && <p className="mt-1 text-xs text-red-500">{errors.weight}</p>}
            </div>
            <div>
              <label className="label-text">
                <Target size={14} className="mb-0.5 mr-1 inline" /> Target Berat (kg)
              </label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="65"
                value={form.targetWeight}
                onChange={update("targetWeight")}
                className="input-field"
              />
              {errors.targetWeight && <p className="mt-1 text-xs text-red-500">{errors.targetWeight}</p>}
            </div>
          </div>

          {/* Tinggi & usia */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">
                <Ruler size={14} className="mb-0.5 mr-1 inline" /> Tinggi Badan (cm)
              </label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="170"
                value={form.height}
                onChange={update("height")}
                className="input-field"
              />
              {errors.height && <p className="mt-1 text-xs text-red-500">{errors.height}</p>}
            </div>
            <div>
              <label className="label-text">
                <Calendar size={14} className="mb-0.5 mr-1 inline" /> Usia
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="22"
                value={form.age}
                onChange={update("age")}
                className="input-field"
              />
              {errors.age && <p className="mt-1 text-xs text-red-500">{errors.age}</p>}
            </div>
          </div>

          {/* Gender — dibutuhkan untuk akurasi rumus BMR */}
          <div>
            <label className="label-text">Jenis Kelamin</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "male", label: "Laki-laki" },
                { value: "female", label: "Perempuan" },
              ].map((g) => (
                <button
                  type="button"
                  key={g.value}
                  onClick={() => setForm((f) => ({ ...f, gender: g.value }))}
                  className={`rounded-2xl border-2 py-3 font-body text-sm font-medium transition-colors ${
                    form.gender === g.value
                      ? "border-sage-500 bg-sage-50 text-sage-700"
                      : "border-ink/10 text-ink-soft hover:border-sage-200"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tingkat aktivitas */}
          <div>
            <label className="label-text">Tingkat Aktivitas Harian</label>
            <div className="space-y-2.5">
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setForm((f) => ({ ...f, activity: opt.value }))}
                  className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
                    form.activity === opt.value
                      ? "border-amber-400 bg-amber-50"
                      : "border-ink/10 hover:border-amber-200"
                  }`}
                >
                  <div>
                    <p className="font-display text-sm font-semibold text-ink">{opt.label}</p>
                    <p className="text-xs text-ink-faint">{opt.desc}</p>
                  </div>
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      form.activity === opt.value ? "border-amber-400 bg-amber-400" : "border-ink/20"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full !py-4 text-base">
            Hitung Kebutuhan Kalori
          </button>
        </form>
      </div>
    </div>
  );
}
