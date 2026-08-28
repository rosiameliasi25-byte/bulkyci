import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SESSION_KEY } from "../context/AuthContext";

/**
 * Lapisan pertahanan KEDUA untuk halaman terproteksi (Dashboard, Riwayat,
 * Onboarding, dst), di luar `<RequireAuth>` yang sudah membungkus rute-rute
 * ini di App.jsx.
 *
 * Kenapa perlu dua lapis? `<RequireAuth>` mengandalkan state React
 * (`isAuthenticated` dari AuthContext). Itu cukup untuk navigasi normal,
 * tapi tombol Back di browser kadang memulihkan halaman dari bfcache
 * (back/forward cache) tanpa benar-benar me-remount komponen React —
 * sehingga state lama sempat "terlihat" sebelum context sempat
 * disinkronkan ulang. Hook ini menutup celah itu dengan memverifikasi
 * ULANG langsung ke localStorage:
 *   1. Saat komponen pertama kali dimuat.
 *   2. Saat halaman dipulihkan dari bfcache (event `pageshow`, termasuk
 *      saat `event.persisted === true`, yang terjadi persis pada skenario
 *      "tekan Back setelah logout").
 *
 * Kalau sesi tidak valid, paksa redirect ke /login dengan replace: true
 * supaya entry halaman terproteksi ini juga hilang dari history.
 */
export function useAuthGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    function verifySession() {
      let isLoggedIn = false;
      try {
        isLoggedIn = !!localStorage.getItem(SESSION_KEY);
      } catch {
        isLoggedIn = false;
      }

      if (!isLoggedIn) {
        navigate("/login", { replace: true });
      }
    }

    // Cek langsung saat mount.
    verifySession();

    // Cek lagi saat halaman ini dipulihkan dari bfcache oleh tombol
    // Back/Forward browser.
    window.addEventListener("pageshow", verifySession);
    return () => window.removeEventListener("pageshow", verifySession);
  }, [navigate]);
}
