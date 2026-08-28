import { useEffect, useRef, useState } from "react";
import { ChevronDown, History, Settings, LogOut, Calendar, Dumbbell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProfileMenu() {
  const { user, isAuthenticated, logout, openLogin } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated) {
    return (
      <button
        onClick={openLogin}
        className="rounded-full bg-sage-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-600 transition"
      >
        Masuk
      </button>
    );
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-sage-200 bg-white pl-1.5 pr-3 py-1.5 hover:shadow-card transition"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-500 text-sm font-bold text-white">
          {initials}
        </span>
        <ChevronDown
          size={16}
          className={`text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-3xl border border-sage-100 bg-cream-card p-2 shadow-soft animate-scale-in z-50">
          <div className="flex items-center gap-3 border-b border-sage-100 px-3 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-500 text-sm font-bold text-white">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-faint">{user.email}</p>
            </div>
          </div>

          <div className="py-1">
            <Link
              to="/riwayat"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-ink hover:bg-sage-50 transition"
            >
              <History size={18} className="text-sage-500" />
              Riwayat
            </Link>
            <Link
              to="/kalender"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-ink hover:bg-sage-50 transition"
            >
              <Calendar size={18} className="text-sage-500" />
              Kalender & Pengingat
            </Link>
            <Link
              to="/latihan"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-ink hover:bg-sage-50 transition"
            >
              <Dumbbell size={18} className="text-sage-500" />
              Target Olahraga
            </Link>
            <Link
              to="/pengaturan"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-ink hover:bg-sage-50 transition"
            >
              <Settings size={18} className="text-sage-500" />
              Pengaturan
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                logout();
                // replace: true supaya entry halaman terproteksi (dashboard,
                // riwayat, dll) tidak tersisa di browser history — tombol
                // Back tidak akan bisa membawa pengguna kembali ke sana.
                navigate("/login", { replace: true });
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
