import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * Tombol toggle mode gelap/terang — bisa dipakai di mana saja (Navbar untuk
 * akses cepat, Settings untuk kontrol penuh) karena semua logic tema ada di
 * ThemeContext, komponen ini murni presentational.
 *
 * `size`: "sm" untuk Navbar (ikon saja), "lg" untuk Settings (dengan label).
 */
export default function ThemeToggle({ size = "sm" }) {
  const { isDark, toggleTheme } = useTheme();

  if (size === "lg") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={isDark}
        className="flex w-full items-center justify-between rounded-2xl border border-sage-200 bg-white px-4 py-3.5 transition-colors hover:bg-sage-50 dark:border-ink/10 dark:bg-cream-soft dark:hover:bg-cream"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 text-sage-600 dark:bg-cream dark:text-amber-300">
            {isDark ? (
              <Moon size={18} className="animate-scale-in" />
            ) : (
              <Sun size={18} className="animate-scale-in" />
            )}
          </span>
          <span className="text-left">
            <span className="block font-display text-sm font-semibold text-ink">
              Mode {isDark ? "Gelap" : "Terang"}
            </span>
            <span className="block text-xs text-ink-faint">Ketuk untuk beralih</span>
          </span>
        </span>

        {/* Switch visual */}
        <span
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${
            isDark ? "bg-sage-500" : "bg-ink/15"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-card transition-transform duration-300 ${
              isDark ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
      aria-pressed={isDark}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-sage-200 bg-white text-ink-soft transition-all duration-300 hover:bg-sage-50 dark:border-ink/10 dark:bg-cream-card dark:text-amber-300 dark:hover:bg-cream-soft"
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        <Sun
          size={18}
          className={`absolute transition-all duration-300 ${
            isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <Moon
          size={18}
          className={`absolute transition-all duration-300 ${
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          }`}
        />
      </span>
    </button>
  );
}
