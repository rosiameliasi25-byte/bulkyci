import { useState } from "react";
import { Mail, User as UserIcon, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * Pure form: knows nothing about being inside a modal or a full page.
 * Calls `onSuccess()` after a successful login so the parent decides
 * what to do next (close modal, navigate, etc).
 */
export default function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

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
    onSuccess?.();
  }

  return (
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
  );
}
