// Daftar suara alarm bawaan. File-nya ada di /public/sounds/*.wav.
// Kalau mau tambah preset baru, cukup taruh file .wav baru di folder itu
// dan tambahkan entrinya di sini.
export const PRESET_SOUNDS = [
  { id: "alarm-klasik", label: "Klasik", url: "/sounds/alarm-klasik.wav" },
  { id: "alarm-lembut", label: "Lembut", url: "/sounds/alarm-lembut.wav" },
  { id: "alarm-energik", label: "Energik", url: "/sounds/alarm-energik.wav" },
  { id: "alarm-retro", label: "Retro", url: "/sounds/alarm-retro.wav" },
];

export function findPresetSound(soundId) {
  return PRESET_SOUNDS.find((s) => s.id === soundId);
}

// Suara custom disimpan sebagai data-URL (base64) di localStorage (lewat
// useAccountStorage, jadi otomatis per-akun). Ukuran dibatasi supaya tidak
// membengkakkan localStorage (limitnya sekitar 5-10MB per origin).
export const MAX_CUSTOM_SOUND_BYTES = 1.5 * 1024 * 1024; // ~1.5MB

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Resolusi ID suara -> URL/data yang bisa diputar <audio>. `customSound`
// adalah object { id: "custom", name, dataUrl } kalau pengguna sudah upload.
export function resolveSoundUrl(soundId, customSound) {
  if (soundId === "custom" && customSound?.dataUrl) return customSound.dataUrl;
  const preset = findPresetSound(soundId);
  return preset?.url || PRESET_SOUNDS[0].url;
}
