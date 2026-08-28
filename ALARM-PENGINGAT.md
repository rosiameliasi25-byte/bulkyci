# Alarm Pengingat Makan — Cara Kerja & Cara Setup

Fitur ini menambahkan alarm bersuara pada Kalender & Pengingat Makan yang
sudah ada, termasuk pengiriman lewat backend (Web Push) supaya bisa bunyi
walau aplikasi/tab sedang tidak dibuka.

## Yang ditambahkan

- `server/` — backend Node/Express kecil: menyimpan jadwal reminder +
  push subscription tiap akun, lalu tiap menit mengecek & mengirim Web
  Push saat jamnya tiba (dan mengulang tiap 2 menit, maks 10x, selama
  belum ditandai selesai — supaya terasa seperti alarm sungguhan).
- `public/service-worker.js` — menerima push & klik notifikasi.
- `public/sounds/*.wav` — 4 suara alarm bawaan (disintesis, bebas lisensi).
- `src/utils/pushClient.js`, `src/utils/alarmSounds.js` — helper klien.
- `src/components/AlarmPlayer.jsx` — pemutar suara alarm di dalam app +
  banner "Selesai / Tunda 5 menit".
- Settings → section **Alarm Pengingat**: aktifkan push, pilih suara
  preset atau upload suara sendiri, tombol tes alarm.
- Kalender → tiap pengingat sekarang punya pilihan suara sendiri.

## Cara menjalankan (development)

1. **Backend:**
   ```bash
   cd server
   npm install
   npm run generate-vapid   # copy hasilnya ke server/.env dan ke .env root
   cp .env.example .env     # lalu isi VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY
   npm run dev              # jalan di http://localhost:8787
   ```
2. **Frontend:**
   ```bash
   cp .env.example .env
   # isi VITE_VAPID_PUBLIC_KEY (sama dengan yang di server) dan
   # VITE_API_BASE_URL (default http://localhost:8787 sudah pas untuk lokal)
   npm install
   npm run dev
   ```
3. Buka app → Pengaturan → Alarm Pengingat → **Aktifkan Alarm Push** →
   izinkan notifikasi saat diminta browser.
4. Tambah reminder di Kalender dengan waktu beberapa menit ke depan, lalu
   coba tutup tab dan tunggu — atau pakai tombol **Tes Alarm Sekarang**
   untuk cek jalur push tanpa menunggu jadwal.

## Batasan yang perlu kamu tahu (dibaca sebelum deploy ke pengguna nyata)

1. **Suara custom tidak otomatis bunyi keras saat app benar-benar
   tertutup.** Service worker tidak boleh mengakses `<audio>`. Saat push
   masuk dan app tertutup, yang bunyi adalah nada notifikasi bawaan
   OS/browser + getar. Suara pilihanmu (preset/custom) baru diputar keras
   begitu notifikasi disentuh dan app terbuka, atau kalau app kebetulan
   sedang aktif di background. Untuk mengimbangi ini, server mengirim
   ulang notifikasi tiap 2 menit (maks 10x) selama belum di-ack, jadi
   perilakunya tetap "menagih" seperti alarm.
2. **iOS Safari**: Web Push hanya jalan kalau PWA sudah di-"Add to Home
   Screen" (iOS 16.4+). Tanpa itu, alarm tidak akan sampai di iPhone sama
   sekali.
3. **Penyimpanan backend** (`server/db.js`) memakai file JSON supaya
   scaffold ini langsung bisa dicoba tanpa setup database. Ganti dengan
   database sungguhan sebelum dipakai banyak pengguna nyata.
4. **Autoplay browser**: memutar audio otomatis (tanpa klik pengguna)
   kadang diblokir browser kalau tab belum pernah ada interaksi sama
   sekali. Banner alarm di dalam app juga berfungsi sebagai tombol putar
   manual untuk mengatasi ini.
5. Backend ini harus **selalu berjalan** (mis. di-deploy ke server/VPS
   kecil atau layanan seperti Render/Fly.io) supaya cron pengecekan jadwal
   tetap jalan — kalau backend mati, alarm push tidak akan terkirim (app
   tetap bisa dipakai normal secara offline, cuma alarm-nya yang tidak
   jalan).
