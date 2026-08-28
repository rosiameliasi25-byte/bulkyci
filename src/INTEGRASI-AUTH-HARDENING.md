# Panduan Integrasi — Update Pengetatan Auth

Lanjutan dari paket sebelumnya. File yang **berubah**: `AuthContext.jsx`, `HistoryContext.jsx`,
`LoginModal.jsx`. File yang **baru**: `useAccountStorage.js`, `TargetContext.jsx`,
`RequireAuth.jsx`, `LoginForm.jsx`, `LoginPage.jsx`.

Timpa file lama dengan versi baru dari zip ini (nama & lokasi sama, jadi aman untuk komponen lain
yang sudah meng-import-nya).

## 1. `src/main.jsx` — tambahkan `TargetProvider` (opsional, kalau kamu pakai data target)
```jsx
import { TargetProvider } from "./context/TargetContext";

<AuthProvider>
  <HistoryProvider>
    <TargetProvider>
      <App />
    </TargetProvider>
  </HistoryProvider>
</AuthProvider>
```
`AuthProvider` **wajib** berada di dalam `<BrowserRouter>` (sudah begitu di setup sebelumnya) karena
sekarang dia memanggil `useNavigate()` untuk logout.

## 2. `src/App.jsx` — pasang `/login` publik + bungkus semua rute lain dengan `RequireAuth`
```jsx
import RequireAuth from "./routing/RequireAuth";
import LoginPage from "./pages/LoginPage";

<Routes>
  <Route path="/login" element={<LoginPage />} />

  <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
  <Route path="/riwayat" element={<RequireAuth><HistoryPage /></RequireAuth>} />
  <Route path="/pengaturan" element={<RequireAuth><SettingsPage /></RequireAuth>} />
  {/* bungkus setiap route lain yang butuh login dengan pola yang sama */}
</Routes>
```
Kalau routemu banyak dan semuanya protected kecuali `/login`, cara lebih ringkas — pakai satu
`RequireAuth` di layout terluar:
```jsx
<Route path="/login" element={<LoginPage />} />
<Route element={<RequireAuth><Outlet /></RequireAuth>}>
  <Route path="/" element={<Dashboard />} />
  <Route path="/riwayat" element={<HistoryPage />} />
  <Route path="/pengaturan" element={<SettingsPage />} />
</Route>
```
(butuh `import { Outlet } from "react-router-dom"`)

**`<LoginModal />`** yang sudah ada boleh tetap dipasang di root App untuk kasus lain (mis. sesi
kadaluarsa di tengah pemakaian), tapi untuk gerbang wajib di awal, `RequireAuth` + `/login` route
di ataslah yang benar-benar memblokir akses — modal saja tidak cukup karena URL dashboard masih
bisa diakses langsung / lewat back button.

## 3. Alur logout (tidak perlu diubah di komponen manapun)
`ProfileMenu` kamu sudah memanggil `logout()` dari `useAuth()` — sekarang otomatis:
1. Menghapus sesi (`bulkyapp_auth_user`).
2. Meng-replace history entry saat ini jadi `/login` (`window.history.replaceState`).
3. Redirect dengan `replace: true`.
4. Kalau user tetap memaksa klik Back, `RequireAuth` yang me-render ulang halaman lama akan
   mendeteksi `isAuthenticated === false` lalu langsung mendorong balik URL dan redirect lagi —
   dashboard tidak pernah benar-benar ter-render.

## 4. Isolasi data — apa yang berubah
- `HistoryContext` sekarang generate key lewat `useAccountStorage("history", ...)`
  → tetap `bulkyapp_history_<user.id>`, tidak ada perubahan perilaku, hanya sumber logikanya
  disatukan.
- `TargetContext` (baru) generate key `bulkyapp_target_<user.id>` lewat helper yang sama.
  Sesuaikan bentuk datanya (`targetWeightKg`, `dailyCalorieGoal`, dst.) dengan field target yang
  sudah ada di UI kamu — strukturnya cuma contoh.
- Karena satu helper (`useAccountStorage`) yang menyusun semua key, dua akun **tidak mungkin**
  saling menimpa data — bahkan kalau nanti kamu tambah namespace baru (mis. `preferensi`), tinggal
  panggil `useAccountStorage("preferensi", default)` dan otomatis ter-isolasi.
- Saat akun berganti (`user.id` berubah) atau saat logout (`user` jadi `null`), context otomatis
  reset ke `defaultValue` — tidak ada data "nyangkut" dari akun sebelumnya yang sempat terlihat.

## Catatan
- Data riwayat & target **sengaja tidak dihapus** saat logout — itu milik akun dan harus tetap ada
  saat akun tersebut login lagi. Yang dihapus saat logout hanya *pointer sesi* (`bulkyapp_auth_user`).
- Proteksi back-button ini adalah pola standar SPA (route guard + history hardening). Tidak ada
  cara 100% mem-block tombol Back browser dari JavaScript, tapi kombinasi ini memastikan begitu
  Back ditekan, halaman yang muncul langsung terdeteksi "tidak sah" dan didorong keluar sebelum
  konten sempat terlihat.
