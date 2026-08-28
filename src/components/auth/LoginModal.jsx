import { useState } from "react";
import { X, Mail, User as UserIcon, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function LoginModal() {
  const { isLoginOpen, closeLogin, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  if (!isLoginOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email wajib diisi.");
      return;
    }
    login({ name, email });
    setName("");
    setEmail("");
    setError("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm animate-fade-up"
      onClick={closeLogin}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-3xl bg-cream-card p-6 shadow-soft animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-ink">Masuk ke BulkyApp</h2>
          <button
            onClick={closeLogin}
            className="rounded-full p-1.5 text-ink-faint hover:bg-sage-50 hover:text-ink transition"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Nama</label>
            <div className="flex items-center gap-2 rounded-2xl border border-sage-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-amber-300">
              <UserIcon size={18} className="text-sage-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
                className="w-full bg-transparent outline-none text-ink placeholder:text-ink-faint"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Email</label>
            <div className="flex items-center gap-2 rounded-2xl border border-sage-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-amber-300">
              <Mail size={18} className="text-sage-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                className="w-full bg-transparent outline-none text-ink placeholder:text-ink-faint"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-400 py-2.5 font-semibold text-ink shadow-glow hover:bg-amber-500 transition"
          >
            <LogIn size={18} />
            Masuk
          </button>

          <p className="text-xs text-center text-ink-faint">
            Belum punya akun? Cukup isi form ini, akun akan otomatis dibuat.
          </p>
        </form>
      </div>
    </div>
  );
}
