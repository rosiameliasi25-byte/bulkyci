import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import ProfileMenu from "./profile/ProfileMenu";
import StreakBadge from "./streak/StreakBadge";
import ThemeToggle from "./ThemeToggle";
import { useApp } from "../context/AppContext";

// Navbar — minimalis: logo teks, indikator streak harian, dan avatar profil.
export default function Navbar() {
  const { streak, profile } = useApp();
  const initial = profile ? "U" : "U";

  return (
    <header className="sticky top-0 z-30 border-b border-ink/5 bg-cream/80 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <span className="font-display text-xl font-extrabold tracking-tight text-sage-700">
            Bulky<span className="text-amber-400">.</span>
          </span>
        </div>

        {/* Bagian Kanan: StreakBadge, akses cepat Kalender & tema, dan ProfileMenu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <StreakBadge />
          <Link
            to="/kalender"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sage-200 bg-white text-ink-soft transition hover:bg-sage-50 dark:border-ink/10 dark:bg-cream-card"
            aria-label="Kalender & Pengingat Makan"
            title="Kalender & Pengingat Makan"
          >
            <Calendar size={18} />
          </Link>
          <ThemeToggle size="sm" />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}