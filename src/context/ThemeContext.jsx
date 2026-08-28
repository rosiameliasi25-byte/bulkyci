import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(null);

// Preferensi tema sengaja GLOBAL (device-level), bukan per-akun — supaya:
//  1. Tetap berfungsi di halaman /login, sebelum ada akun yang aktif.
//  2. Konsisten "tersimpan saat direfresh atau saat login kembali", sesuai
//     permintaan, karena tidak ikut ter-reset saat AppContext/HistoryContext
//     dkk mengosongkan diri pada saat logout.
const THEME_KEY = "bulkyapp_theme";

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage tidak tersedia (mis. private browsing ketat) — abaikan
  }
  // Belum ada preferensi tersimpan -> ikuti preferensi sistem/OS pengguna
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Setiap kali `theme` berubah: toggle class `.dark` di <html> (dibaca oleh
  // Tailwind lewat `darkMode: "class"`) dan simpan ke localStorage.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // storage penuh/diblokir — preferensi tetap berlaku untuk sesi ini
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a <ThemeProvider>");
  return ctx;
}
