import { History as HistoryIcon, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHistory } from "../context/HistoryContext";
import { useAuthGuard } from "../hooks/useAuthGuard";

export default function HistoryPage() {
  const { isAuthenticated, user } = useAuth();
  const { entries, clearHistory } = useHistory();

  // Lapisan tambahan anti tombol Back: verifikasi ulang localStorage saat
  // HistoryPage dimuat/dipulihkan dari bfcache, di luar guard <RequireAuth>.
  useAuthGuard();

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-ink-soft">
        Silakan masuk untuk melihat riwayat aktivitas kamu.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
          <HistoryIcon className="text-sage-500" />
          Riwayat {user.name}
        </h1>
        {entries.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 size={16} />
            Hapus semua
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="rounded-3xl bg-cream-soft p-8 text-center text-ink-faint">
          Belum ada aktivitas tersimpan. Aktivitas kamu akan muncul di sini.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl bg-cream-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">{entry.title}</p>
                <span className="text-xs text-ink-faint">
                  {new Date(entry.date).toLocaleString("id-ID")}
                </span>
              </div>
              {entry.description && (
                <p className="mt-1 text-sm text-ink-soft">{entry.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
