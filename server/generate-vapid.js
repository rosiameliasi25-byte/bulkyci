// Jalankan sekali: `npm run generate-vapid`
// Menghasilkan sepasang VAPID key (public + private) yang dibutuhkan
// protokol Web Push. Public key ditaruh di frontend (.env sebagai
// VITE_VAPID_PUBLIC_KEY), private key HANYA ada di server (server/.env).
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\n=== VAPID KEYS ===");
console.log("Tempel baris berikut ke server/.env:\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log("\nTempel baris berikut ke .env (root project, untuk Vite):\n");
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log("\n==================\n");
