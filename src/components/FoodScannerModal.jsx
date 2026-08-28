import { useEffect, useRef, useState } from "react";
import { X, Upload, Camera, Loader2, CheckCircle2, RotateCcw, AlertTriangle, SwitchCamera } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useHistory } from "../context/HistoryContext";
import { detectFoodFromImage } from "../utils/geminiVision";

// Fallback simulasi — dipakai otomatis jika VITE_GEMINI_API_KEY belum diset,
// supaya UI tetap bisa dicoba tanpa API key nyata.
const MOCK_FOOD_DB = [
  { name: "Nasi Padang Rendang", calories: 650, protein: 35, carbs: 60, fat: 28 },
  { name: "Ayam Geprek + Nasi", calories: 580, protein: 32, carbs: 55, fat: 22 },
  { name: "Gado-Gado Telur", calories: 420, protein: 18, carbs: 38, fat: 20 },
  { name: "Soto Ayam + Nasi", calories: 390, protein: 24, carbs: 42, fat: 12 },
  { name: "Nasi Goreng Spesial", calories: 610, protein: 20, carbs: 70, fat: 24 },
];
const USE_MOCK = !import.meta.env.VITE_GEMINI_API_KEY;

const STAGE = {
  PICK: "pick",
  CAMERA: "camera",
  PREVIEW: "preview",
  SCANNING: "scanning",
  RESULT: "result",
  ERROR: "error",
  SAVED: "saved",
};

export default function FoodScannerModal({ onClose }) {
  const { addFoodToLog } = useApp();
  const { addEntry } = useHistory();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [stage, setStage] = useState(STAGE.PICK);
  const [imagePreview, setImagePreview] = useState(null); // data URL, dipakai baik dari upload maupun kamera
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [facingMode, setFacingMode] = useState("environment");

  // Selalu matikan track kamera saat modal ditutup / komponen unmount,
  // supaya lampu indikator kamera tidak terus menyala.
  useEffect(() => stopCamera, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // --- Alur Upload dari galeri ---
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result); // base64 data URL
      setStage(STAGE.PREVIEW);
    };
    reader.readAsDataURL(file);
  };

  // --- Alur Kamera Live (jalan di desktop & HP lewat getUserMedia) ---
  const openCamera = async (mode = facingMode) => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = stream;
      setStage(STAGE.CAMERA);
      // videoRef belum ter-mount saat stage masih PICK, jadi set srcObject di effect kecil di bawah
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch (err) {
      setErrorMsg(
        "Tidak bisa mengakses kamera. Pastikan kamu mengizinkan akses kamera di browser, atau gunakan opsi unggah dari galeri."
      );
      setStage(STAGE.ERROR);
    }
  };

  const switchCamera = () => {
    stopCamera();
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    openCamera(next);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setImagePreview(canvas.toDataURL("image/jpeg", 0.9));
    stopCamera();
    setStage(STAGE.PREVIEW);
  };

  // --- Analisis AI ---
  const runAiScan = async () => {
    setStage(STAGE.SCANNING);
    setErrorMsg("");
    try {
      let detected;
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 1500)); // simulasi delay jaringan
        detected = MOCK_FOOD_DB[Math.floor(Math.random() * MOCK_FOOD_DB.length)];
      } else {
        detected = await detectFoodFromImage(imagePreview);
      }
      setResult(detected);
      setStage(STAGE.RESULT);
    } catch (err) {
      console.error("Gagal mendeteksi makanan:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat menganalisis foto.");
      setStage(STAGE.ERROR);
    }
  };

  const handleSave = () => {
    addFoodToLog(result);
    // Catat juga ke Riwayat (halaman /riwayat) supaya setiap makanan yang
    // discan tercatat sebagai aktivitas, bukan cuma masuk ke "Menu Hari Ini".
    addEntry({
      title: result.name,
      description: `${result.calories} kkal · ${result.protein}g protein · ${result.carbs}g karbo · ${result.fat}g lemak`,
    });
    setStage(STAGE.SAVED);
    setTimeout(onClose, 1100);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const proteinPctOfCalories = result ? Math.round(((result.protein * 4) / result.calories) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center animate-fade-up"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-t-4xl sm:rounded-4xl bg-cream-card shadow-soft animate-scale-in max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink/5 px-6 py-5">
          <h2 className="font-display text-lg font-bold text-ink">Scan Makanan dengan AI</h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Badge mode simulasi, biar jelas kalau belum pakai AI asli */}
          {USE_MOCK && stage === STAGE.PICK && (
            <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Mode simulasi aktif — set <code className="font-mono">VITE_GEMINI_API_KEY</code> di file{" "}
              <code className="font-mono">.env</code> untuk pakai AI sungguhan.
            </div>
          )}

          {/* STAGE: Pilih sumber foto */}
          {stage === STAGE.PICK && (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">
                Ambil foto makananmu, biar AI yang hitung kalori & proteinnya otomatis.
              </p>

              <button
                onClick={() => openCamera()}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-sage-300 bg-sage-50 p-5 text-left transition-colors hover:bg-sage-100"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-500 text-white">
                  <Camera size={22} />
                </div>
                <div>
                  <p className="font-display font-semibold text-ink">Nyalakan Kamera</p>
                  <p className="text-xs text-ink-faint">Ambil foto langsung (live camera)</p>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5 text-left transition-colors hover:bg-amber-100"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-white">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="font-display font-semibold text-ink">Unggah dari Galeri</p>
                  <p className="text-xs text-ink-faint">Pilih foto yang sudah ada</p>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>
          )}

          {/* STAGE: Kamera live */}
          {stage === STAGE.CAMERA && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-ink shadow-card">
                <video ref={videoRef} autoPlay playsInline muted className="h-72 w-full object-cover" />
                <button
                  onClick={switchCamera}
                  className="absolute right-3 top-3 rounded-full bg-ink/50 p-2 text-white backdrop-blur-sm"
                  aria-label="Ganti kamera"
                >
                  <SwitchCamera size={18} />
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    stopCamera();
                    setStage(STAGE.PICK);
                  }}
                  className="btn-secondary flex-1 !py-3"
                >
                  Batal
                </button>
                <button onClick={capturePhoto} className="btn-primary flex-1 !py-3">
                  <Camera size={18} /> Ambil Foto
                </button>
              </div>
            </div>
          )}

          {/* STAGE: Preview sebelum discan */}
          {stage === STAGE.PREVIEW && imagePreview && (
            <div className="space-y-4">
              <img src={imagePreview} alt="Preview makanan" className="h-56 w-full rounded-2xl object-cover shadow-card" />
              <div className="flex gap-3">
                <button onClick={() => setStage(STAGE.PICK)} className="btn-secondary flex-1 !py-3">
                  Ganti Foto
                </button>
                <button onClick={runAiScan} className="btn-primary flex-1 !py-3">
                  Analisis Sekarang
                </button>
              </div>
            </div>
          )}

          {/* STAGE: Loading */}
          {stage === STAGE.SCANNING && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-16 w-16 animate-spin text-amber-400" />
              <div className="text-center">
                <p className="font-display font-semibold text-ink">Menganalisis foto...</p>
                <p className="mt-1 text-sm text-ink-faint">AI sedang mengenali jenis makanan & estimasi gizinya</p>
              </div>
            </div>
          )}

          {/* STAGE: Hasil deteksi */}
          {stage === STAGE.RESULT && result && (
            <div className="space-y-5 animate-fade-up">
              {imagePreview && (
                <img src={imagePreview} alt={result.name} className="h-44 w-full rounded-2xl object-cover shadow-card" />
              )}

              <div className="rounded-2xl bg-sage-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-sage-600">Terdeteksi</p>
                <h3 className="mt-0.5 font-display text-xl font-bold text-ink">{result.name}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-amber-50 p-4 text-center">
                  <p className="font-display text-2xl font-extrabold text-amber-600">{result.calories}</p>
                  <p className="text-xs text-ink-faint">Kalori (kkal)</p>
                </div>
                <div className="rounded-2xl bg-sage-50 p-4 text-center">
                  <p className="font-display text-2xl font-extrabold text-sage-700">{result.protein}g</p>
                  <p className="text-xs text-ink-faint">Protein ({proteinPctOfCalories}%)</p>
                </div>
              </div>

              <div className="flex justify-between text-sm text-ink-soft">
                <span>Karbohidrat: <b className="text-ink">{result.carbs}g</b></span>
                <span>Lemak: <b className="text-ink">{result.fat}g</b></span>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStage(STAGE.PICK)} className="btn-secondary !py-3 !px-4" aria-label="Scan ulang">
                  <RotateCcw size={18} />
                </button>
                <button onClick={handleSave} className="btn-primary flex-1 !py-3">
                  Simpan ke Menu Hari Ini
                </button>
              </div>
            </div>
          )}

          {/* STAGE: Error — ditampilkan inline, bukan alert() browser */}
          {stage === STAGE.ERROR && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-red-50 p-6 text-center">
                <AlertTriangle size={32} className="text-red-500" />
                <p className="font-display font-semibold text-ink">Gagal memproses</p>
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStage(STAGE.PICK)} className="btn-secondary flex-1 !py-3">
                  Kembali
                </button>
                {imagePreview && (
                  <button onClick={runAiScan} className="btn-primary flex-1 !py-3">
                    Coba Lagi
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STAGE: Tersimpan */}
          {stage === STAGE.SAVED && (
            <div className="flex flex-col items-center gap-3 py-10 animate-scale-in">
              <CheckCircle2 size={52} className="text-sage-500" />
              <p className="font-display font-semibold text-ink">Tersimpan ke menu hari ini!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
