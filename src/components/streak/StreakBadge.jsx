import { Flame } from "lucide-react";
import { useStreak } from "../../hooks/useStreak";

export default function StreakBadge({ className = "" }) {
  const { streak } = useStreak();
  const isActive = streak > 0;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
        isActive ? "bg-amber-100 text-amber-700" : "bg-sage-50 text-ink-faint"
      } ${className}`}
      title={isActive ? `${streak} hari beruntun` : "Belum ada aktivitas hari ini"}
    >
      <Flame
        size={18}
        className={isActive ? "text-amber-500 animate-pulse-soft" : "text-ink-faint"}
        fill={isActive ? "currentColor" : "none"}
      />
      <span className="text-sm font-semibold">{streak}</span>
    </div>
  );
}
