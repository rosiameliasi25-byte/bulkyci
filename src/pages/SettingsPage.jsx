import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Target,
  Trash2,
  RotateCcw,
  Palette,
  LogOut,
  Save,
  Calculator,
  Check,
  Calendar,
  BellRing,
  Play,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { useHistory } from "../context/HistoryContext";
import { useMealReminders } from "../context/MealReminderContext";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { calculateBulkTargets, ACTIVITY_OPTIONS } from "../utils/calorieCalculator";
import {
  PRESET_SOUNDS,
  fileToDataUrl,
  MAX_CUSTOM_SOUND_BYTES,
  resolveSoundUrl,
} from "../utils/alarmSounds";
import { enablePushAlarm, disablePushAlarm, getPushStatus, sendTestAlarm } from "../utils/pushClient";
import ThemeToggle from "../components/ThemeToggle";
import Navbar from "../components/Navbar";

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="card mb-6 p-6 sm:p-8 animate-fade-up">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-600">
          <Icon size={20} />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-faint">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

// Notifikasi kecil "Tersimpan!" yang muncul sebentar lalu hilang sendiri.
function SavedBadge({ show }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-sage-600 animate-fade-up">
      <Check size={16} /> Tersimpan
    </span>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile, targets, resetToday, updateTargets, updateProfile } = useApp();
  const { clearHistory } = useHistory();
  const { alarmPrefs, updateAlarmPrefs } = useMealReminders();

  // Lapisan tambahan anti tombol Back, sama seperti Dashboard/Onboarding/HistoryPage.
  useAuthGuard();

  // --- Alarm Pengingat: status push notification + pilihan suara ---
  const [pushStatus, setPushStatus] = useState({ supported: false, subscribed: false, permission: "default" });
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");
  const previewAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState("");
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    getPushStatus().then(setPushStatus);
  }, []);

  async function handleEnablePush() {
    setPushBusy(true);
    setPushError("");
    const result = await enablePushAlarm(user.id);
    if (result.ok) {
      setPushStatus(await getPushStatus());
    } else {
      const messages = {
        unsupported: "Browser ini tidak mendukung push notification.",
        "missing-vapid-key": "Server belum dikonfigurasi (VITE_VAPID_PUBLIC_KEY kosong). Lihat server/README.md.",
        denied: "Izin notifikasi ditolak. Aktifkan lewat pengaturan browser/situs, lalu coba lagi.",
        "sw-failed": "Gagal mendaftarkan service worker.",
        "server-error": "Server push tidak merespons. Pastikan server/ sedang berjalan.",
      };
      setPushError(messages[result.reason] || "Gagal mengaktifkan alarm push.");
    }
    setPushBusy(false);
  }

  async function handleDisablePush() {
    setPushBusy(true);
    await disablePushAlarm(user.id);
    setPushStatus(await getPushStatus());
    setPushBusy(false);
  }

  function playPreview(soundId) {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    const url = resolveSoundUrl(soundId, alarmPrefs.customSound);
    const audio = new Audio(url);
    audio.volume = 1.0;
    audio.play().catch(() => {});
    previewAudioRef.current = audio;
  }

  async function handleUploadCustomSound(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // supaya bisa upload file yang sama lagi kalau mau ganti
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("audio/")) {
      setUploadError("File harus berupa audio (mp3, wav, ogg, dll).");
      return;
    }
    if (file.size > MAX_CUSTOM_SOUND_BYTES) {
      setUploadError(`Ukuran file maksimal ${Math.round(MAX_CUSTOM_SOUND_BYTES / 1024 / 1024)}MB.`);
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    updateAlarmPrefs({ customSound: { name: file.name, dataUrl }, defaultSoundId: "custom" });
  }

  function handleRemoveCustomSound() {
    updateAlarmPrefs({ customSound: null, defaultSoundId: PRESET_SOUNDS[0].id });
  }

  async function handleTestAlarm() {
    const ok = await sendTestAlarm(user.id, alarmPrefs.defaultSoundId);
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  }

  // --- Form: Target & Nutrisi (edit manual langsung) ---
  const [targetForm, setTargetForm] = useState({
    calorieTarget: targets?.calorieTarget ?? "",
    proteinTarget: targets?.proteinTarget ?? "",
    carbTarget: targets?.carbTarget ?? "",
    fatTarget: targets?.fatTarget ?? "",
  });
  const [targetSaved, setTargetSaved] = useState(false);

  function handleTargetChange(key) {
    return (e) => setTargetForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleSaveTargets(e) {
    e.preventDefault();
    updateTargets({
      calorieTarget: Number(targetForm.calorieTarget) || 0,
      proteinTarget: Number(targetForm.proteinTarget) || 0,
      carbTarget: Number(targetForm.carbTarget) || 0,
      fatTarget: Number(targetForm.fatTarget) || 0,
    });
    setTargetSaved(true);
    setTimeout(() => setTargetSaved(false), 2000);
  }

  // --- Form: hitung ulang otomatis dari data fisik (opsional) ---
  const [physicalForm, setPhysicalForm] = useState({
    weight: profile?.weight ?? "",
    targetWeight: profile?.targetWeight ?? "",
    height: profile?.height ?? "",
    age: profile?.age ?? "",
    gender: profile?.gender ?? "male",
    activity: profile?.activity ?? "light",
  });
  const [recalculated, setRecalculated] = useState(false);

  function handlePhysicalChange(key) {
    return (e) => setPhysicalForm((f) => ({ ...f, [key]: e.target.value }));
  }

  function handleRecalculate(e) {
    e.preventDefault();
    const nextProfile = {
      weight: Number(physicalForm.weight),
      targetWeight: Number(physicalForm.targetWeight),
      height: Number(physicalForm.height),
      age: Number(physicalForm.age),
      gender: physicalForm.gender,
      activity: physicalForm.activity,
    };
    if (!nextProfile.weight || !nextProfile.height || !nextProfile.age) return;

    // Formula sama persis dengan yang dipakai di halaman Onboarding (satu
    // sumber kebenaran di calculateBulkTargets), supaya hasilnya konsisten
    // di mana pun target dihitung.
    const calc = calculateBulkTargets(nextProfile);

    updateProfile(nextProfile);
    updateTargets(calc);
    setTargetForm(calc);
    setRecalculated(true);
    setTimeout(() => setRecalculated(false), 2000);
  }

  // --- Manajemen data ---
  function handleResetToday() {
    if (window.confirm("Reset catatan makanan hari ini? Data hari ini akan dikosongkan.")) {
      resetToday();
    }
  }

  function handleClearHistory() {
    if (window.confirm("Hapus seluruh riwayat scan makanan akun ini? Tindakan ini tidak bisa dibatalkan.")) {
      clearHistory();
    }
  }

  // --- Logout ---
  function handleLogout() {
    logout();
    // replace: true supaya halaman Pengaturan (dan seluruh rute terproteksi
    // sebelumnya) tidak tersisa di browser history — aman dari tombol Back.
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-cream pb-28">
      <Navbar />

      <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sage-200 bg-white text-ink-soft hover:bg-sage-50 transition"
            aria-label="Kembali ke Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Pengaturan</h1>
          </div>
        </div>

        {/* 1. Target & Nutrisi */}
        <SectionCard
          icon={Target}
          title="Target & Nutrisi"
          description="Ubah target kalori dan makronutrien harianmu."
        >
          <form onSubmit={handleSaveTargets} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Kalori Harian (kkal)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={targetForm.calorieTarget}
                  onChange={handleTargetChange("calorieTarget")}
                />
              </div>
              <div>
                <label className="label-text">Protein (g)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={targetForm.proteinTarget}
                  onChange={handleTargetChange("proteinTarget")}
                />
              </div>
              <div>
                <label className="label-text">Karbohidrat (g)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={targetForm.carbTarget}
                  onChange={handleTargetChange("carbTarget")}
                />
              </div>
              <div>
                <label className="label-text">Lemak (g)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={targetForm.fatTarget}
                  onChange={handleTargetChange("fatTarget")}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="btn-primary">
                <Save size={18} />
                Simpan Target
              </button>
              <SavedBadge show={targetSaved} />
            </div>
          </form>

          {/* Hitung ulang otomatis dari data fisik — opsional */}
          <details className="mt-6 rounded-2xl border border-sage-100 p-4">
            <summary className="cursor-pointer font-display text-sm font-semibold text-sage-700">
              Hitung ulang otomatis dari data fisik
            </summary>
            <form onSubmit={handleRecalculate} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Berat Saat Ini (kg)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={physicalForm.weight}
                    onChange={handlePhysicalChange("weight")}
                  />
                </div>
                <div>
                  <label className="label-text">Berat Target (kg)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={physicalForm.targetWeight}
                    onChange={handlePhysicalChange("targetWeight")}
                  />
                </div>
                <div>
                  <label className="label-text">Tinggi (cm)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={physicalForm.height}
                    onChange={handlePhysicalChange("height")}
                  />
                </div>
                <div>
                  <label className="label-text">Umur</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={physicalForm.age}
                    onChange={handlePhysicalChange("age")}
                  />
                </div>
                <div>
                  <label className="label-text">Jenis Kelamin</label>
                  <select
                    className="input-field"
                    value={physicalForm.gender}
                    onChange={handlePhysicalChange("gender")}
                  >
                    <option value="male">Pria</option>
                    <option value="female">Wanita</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Aktivitas</label>
                  <select
                    className="input-field"
                    value={physicalForm.activity}
                    onChange={handlePhysicalChange("activity")}
                  >
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" className="btn-secondary">
                  <Calculator size={18} />
                  Hitung & Terapkan
                </button>
                <SavedBadge show={recalculated} />
              </div>
            </form>
          </details>
        </SectionCard>

        {/* 2. Manajemen Data */}
        <SectionCard
          icon={Trash2}
          title="Manajemen Data"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={handleResetToday} className="btn-secondary w-full sm:w-auto">
              <RotateCcw size={18} />
              Reset Log Hari Ini
            </button>
            <button
              onClick={handleClearHistory}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-200 bg-transparent px-6 py-3.5 font-display font-semibold text-red-600 transition-all duration-200 hover:bg-red-50 hover:border-red-300 sm:w-auto"
            >
              <Trash2 size={18} />
              Hapus Riwayat (Clear History)
            </button>
          </div>
        </SectionCard>

        {/* 3. Alarm Pengingat (push notification + suara) */}
        <SectionCard
          icon={BellRing}
          title="Alarm Pengingat"
          description="Bunyikan pengingat makan seperti alarm, walau aplikasi sedang tidak dibuka."
        >
          <div className="mb-5 rounded-2xl bg-cream-soft px-4 py-3.5 text-sm text-ink-soft">
            {pushStatus.subscribed ? (
              <p className="flex items-center gap-2 font-semibold text-sage-600">
                <Check size={16} /> Alarm push aktif di perangkat ini.
              </p>
            ) : (
              <p>
                Aktifkan supaya notifikasi + suara alarm tetap muncul walau BulkyApp sedang tidak dibuka.
                Butuh izin notifikasi browser.
              </p>
            )}
            {pushError && <p className="mt-2 text-sm font-semibold text-red-600">{pushError}</p>}
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            {!pushStatus.subscribed ? (
              <button onClick={handleEnablePush} disabled={pushBusy} className="btn-primary">
                <BellRing size={18} />
                {pushBusy ? "Mengaktifkan..." : "Aktifkan Alarm Push"}
              </button>
            ) : (
              <button onClick={handleDisablePush} disabled={pushBusy} className="btn-secondary">
                <X size={18} />
                {pushBusy ? "Menonaktifkan..." : "Nonaktifkan"}
              </button>
            )}
            <button onClick={handleTestAlarm} className="btn-secondary">
              <Play size={18} />
              Tes Alarm Sekarang
            </button>
            {testSent && <SavedBadge show={testSent} />}
          </div>

          <p className="label-text mb-2">Pilih Suara Alarm</p>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESET_SOUNDS.map((sound) => {
              const isSelected = alarmPrefs.defaultSoundId === sound.id;
              return (
                <button
                  key={sound.id}
                  onClick={() => updateAlarmPrefs({ defaultSoundId: sound.id })}
                  className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-3 py-2.5 text-sm font-semibold transition ${
                    isSelected
                      ? "border-sage-500 bg-sage-50 text-sage-700"
                      : "border-sage-100 text-ink-soft hover:bg-sage-50"
                  }`}
                >
                  {sound.label}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      playPreview(sound.id);
                    }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-sage-600 shadow-sm"
                    aria-label={`Dengarkan ${sound.label}`}
                  >
                    <Play size={12} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Suara custom */}
          <div className="rounded-2xl border border-sage-100 p-4">
            {alarmPrefs.customSound ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    updateAlarmPrefs({ defaultSoundId: "custom" });
                    playPreview("custom");
                  }}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-semibold ${
                    alarmPrefs.defaultSoundId === "custom" ? "bg-sage-50 text-sage-700" : "text-ink-soft"
                  }`}
                >
                  <Play size={14} className="shrink-0" />
                  <span className="truncate">{alarmPrefs.customSound.name}</span>
                </button>
                <button
                  onClick={handleRemoveCustomSound}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-red-50 hover:text-red-600"
                  aria-label="Hapus suara custom"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sage-200 px-4 py-3 text-sm font-semibold text-sage-600 hover:bg-sage-50"
              >
                <Upload size={16} />
                Upload Musik / Suara Sendiri (mp3, wav, ogg — maks 1.5MB)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleUploadCustomSound}
            />
            {uploadError && <p className="mt-2 text-xs font-semibold text-red-600">{uploadError}</p>}
          </div>

          <p className="mt-4 text-xs text-ink-faint">
            Catatan: saat notifikasi baru masuk dan aplikasi sedang tertutup total, HP/browser akan
            berbunyi dengan nada notifikasi bawaan sistem dulu. Begitu notifikasi disentuh (atau kalau
            aplikasi kebetulan sedang terbuka), suara pilihanmu di atas akan otomatis diputar keras
            berulang sampai kamu tekan &ldquo;Selesai&rdquo;.
          </p>
        </SectionCard>

        {/* 4. Kalender & Pengingat Makan */}
        <SectionCard
          icon={Calendar}
          title="Kalender & Pengingat Makan"
          description="Atur jadwal sarapan, makan siang, dan makan malam."
        >
          <button onClick={() => navigate("/kalender")} className="btn-secondary w-full sm:w-auto">
            <Calendar size={18} />
            Buka Kalender & Pengingat
          </button>
        </SectionCard>

        {/* 5. Preferensi Aplikasi */}
        <SectionCard
          icon={Palette}
          title="Preferensi Aplikasi"
          description="Pengaturan tampilan dasar, tersimpan di perangkat ini."
        >
          <ThemeToggle size="lg" />
        </SectionCard>

        {/* 6. Keamanan Sesi */}
        <SectionCard icon={LogOut} title="Keamanan Sesi">
          <p className="mb-4 text-sm text-ink-soft">
            Keluar akan menghapus sesi login di perangkat ini dan mengarahkanmu ke halaman login
            secara aman
          </p>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 py-3.5 font-display font-semibold text-white shadow-glow transition-all duration-200 hover:bg-red-600 hover:-translate-y-0.5 active:translate-y-0"
          >
            <LogOut size={18} />
            Logout
          </button>
        </SectionCard>
      </main>
    </div>
  );
}
