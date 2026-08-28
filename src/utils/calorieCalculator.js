// Kalkulator kebutuhan kalori & protein untuk tujuan bulking (surplus kalori)
// Menggunakan formula Mifflin-St Jeor untuk BMR (akurat & umum dipakai industri fitness)

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, // Jarang berolahraga / kerja duduk
  light: 1.375, // Olahraga ringan 1-3x/minggu
  moderate: 1.55, // Olahraga sedang 3-5x/minggu
  active: 1.725, // Olahraga berat 6-7x/minggu
  very_active: 1.9, // Atlet / pekerjaan fisik berat
};

export const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Jarang bergerak", desc: "Kerja duduk, jarang olahraga" },
  { value: "light", label: "Ringan", desc: "Olahraga 1–3x / minggu" },
  { value: "moderate", label: "Sedang", desc: "Olahraga 3–5x / minggu" },
  { value: "active", label: "Aktif", desc: "Olahraga 6–7x / minggu" },
  { value: "very_active", label: "Sangat Aktif", desc: "Atlet / fisik berat harian" },
];

const round10 = (n) => Math.round(n / 10) * 10;

// Surplus kalori bulking direkomendasikan berkisar +300 s.d. +500 kkal di atas
// TDEE (ISSN / rekomendasi umum ilmu gizi olahraga untuk lean bulk). Alih-alih
// nilai surplus yang SAMA untuk semua orang (bug sebelumnya: `targetWeight`
// dikumpulkan di form onboarding tapi tidak pernah dipakai di kalkulasi —
// akibatnya dua pengguna dengan `targetWeight` berbeda tapi kondisi fisik
// awal sama akan mendapat target kalori yang identik), surplus di sini
// diskalakan sesuai seberapa besar jarak (gap) antara berat saat ini dan
// berat target: makin besar gap-nya, makin dekat ke +500 kkal; gap kecil/']
// tidak ada target -> tetap dapat surplus minimum +300 kkal (bulking paling
// konservatif). Gap di-cap di 20kg supaya surplus tidak pernah melebihi +500
// kkal (surplus lebih dari itu tidak lagi "lean bulk" yang sehat).
const MIN_SURPLUS = 300;
const MAX_SURPLUS = 500;
const GAP_CAP_KG = 20;

function calculateSurplus(weight, targetWeight) {
  const gapKg = Math.max(0, (Number(targetWeight) || weight) - weight);
  const gapRatio = Math.min(gapKg, GAP_CAP_KG) / GAP_CAP_KG;
  return round10(MIN_SURPLUS + gapRatio * (MAX_SURPLUS - MIN_SURPLUS));
}

/**
 * Menghitung target kalori & makronutrien harian untuk surplus kalori (bulking).
 * @param {{weight:number, targetWeight?:number, height:number, age:number, gender:string, activity:string}} profile
 * @returns {{bmr:number, tdee:number, calorieTarget:number, proteinTarget:number, carbTarget:number, fatTarget:number, surplus:number, weightGapKg:number}}
 */
export function calculateBulkTargets(profile) {
  const { weight, targetWeight, height, age, gender, activity } = profile;

  // BMR — Mifflin-St Jeor
  const bmr =
    gender === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

  const multiplier = ACTIVITY_MULTIPLIERS[activity] ?? 1.375;
  const tdee = bmr * multiplier;

  // Surplus bulking +300 s.d. +500 kkal dari TDEE, diskalakan dari jarak
  // berat saat ini -> berat target (lihat calculateSurplus di atas).
  const surplus = calculateSurplus(weight, targetWeight);
  const calorieTarget = round10(tdee) + surplus;

  // Protein 2g/kg berat badan saat ini — mendukung pertumbuhan otot, bukan hanya lemak
  const proteinTarget = Math.round(weight * 2);

  // Karbohidrat & lemak diturunkan dari sisa kalori dengan rasio umum untuk
  // program bulking (45% karbo, 25% lemak dari total kalori). Dipusatkan di
  // sini (bukan diduplikasi di tiap halaman) supaya Onboarding & Pengaturan
  // selalu menghasilkan angka yang identik untuk profil yang sama.
  const carbTarget = Math.round((calorieTarget * 0.45) / 4);
  const fatTarget = Math.round((calorieTarget * 0.25) / 9);

  return {
    bmr: Math.round(bmr),
    tdee: round10(tdee),
    calorieTarget,
    proteinTarget,
    carbTarget,
    fatTarget,
    surplus,
    weightGapKg: Math.max(0, (Number(targetWeight) || weight) - weight),
  };
}
