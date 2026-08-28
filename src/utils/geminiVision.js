// geminiVision.js — pemanggilan Gemini API (multimodal) untuk mendeteksi
// makanan dari foto dan mengestimasi kandungan gizinya.
//
// PENTING (keamanan): memanggil Gemini langsung dari browser berarti API key
// ikut terkirim ke client dan bisa dilihat siapa pun lewat DevTools. Ini OK
// untuk prototipe/local dev, tapi untuk produksi sebaiknya panggil lewat
// backend/serverless proxy supaya API key tidak terekspos.

// gemini-2.5-flash sudah tidak tersedia (dipensiunkan Google) -> nama model
// diambil dari .env (VITE_GEMINI_MODEL) supaya kalau Google mempensiunkan
// model lagi di kemudian hari, cukup ganti nilainya di .env + restart dev
// server / build ulang — tidak perlu sentuh kode ini sama sekali.
// Daftar model terbaru: https://ai.google.dev/gemini-api/docs/deprecations
const DEFAULT_MODEL = "gemini-3.6-flash";
const MODEL = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL;
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Skema JSON yang wajib dipatuhi model — mencegah hasil parsing gagal
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    calories: { type: "NUMBER" },
    protein: { type: "NUMBER" },
    carbs: { type: "NUMBER" },
    fat: { type: "NUMBER" },
  },
  required: ["name", "calories", "protein", "carbs", "fat"],
};

const PROMPT = `Kamu adalah ahli gizi. Lihat foto makanan ini dan estimasikan:
- nama makanan (dalam Bahasa Indonesia, spesifik, mis. "Nasi Padang Rendang")
- estimasi kalori total (kkal)
- estimasi protein (gram)
- estimasi karbohidrat (gram)
- estimasi lemak (gram)
Jika porsi tidak terlihat jelas, asumsikan porsi normal satu orang dewasa.
Jawab HANYA dalam format JSON sesuai skema, tanpa teks tambahan.`;

/**
 * @param {string} base64Image - data URL (mis. "data:image/jpeg;base64,....") dari foto makanan
 * @returns {Promise<{name:string, calories:number, protein:number, carbs:number, fat:number}>}
 */
export async function detectFoodFromImage(base64Image) {
  if (!API_KEY) {
    throw new Error(
      "VITE_GEMINI_API_KEY belum diset. Buat file .env berisi VITE_GEMINI_API_KEY=xxxxx lalu restart `npm run dev`."
    );
  }

  // Pisahkan prefix "data:image/jpeg;base64," dari data base64 murni
  const [meta, data] = base64Image.split(",");
  const mimeType = meta.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";

  // Endpoint WAJIB diakhiri ":generateContent" — ini penyebab paling umum error 404
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": API_KEY, // cara resmi terbaru mengirim API key (alternatif dari ?key=)
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data } }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errBody || response.statusText}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Respons Gemini kosong atau format tidak dikenali.");

  const parsed = JSON.parse(text);
  return {
    name: parsed.name,
    calories: Math.round(parsed.calories),
    protein: Math.round(parsed.protein),
    carbs: Math.round(parsed.carbs),
    fat: Math.round(parsed.fat),
  };
}
