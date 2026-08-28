// MacroProgressBar — bar horizontal untuk menampilkan progres satu makronutrien
// (Protein / Karbohidrat / Lemak) terhadap target harian.

const COLOR_MAP = {
  sage: { bar: "bg-sage-500", track: "bg-sage-100", text: "text-sage-700" },
  amber: { bar: "bg-amber-400", track: "bg-amber-100", text: "text-amber-700" },
  clay: { bar: "bg-orange-400", track: "bg-orange-100", text: "text-orange-700" },
};

export default function MacroProgressBar({ label, current, target, unit = "g", color = "sage" }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const c = COLOR_MAP[color] ?? COLOR_MAP.sage;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-display text-sm font-semibold text-ink">{label}</span>
        <span className={`font-body text-xs font-medium ${c.text}`}>
          {current}
          {unit} <span className="text-ink-faint">/ {target}{unit}</span>
        </span>
      </div>
      <div className={`h-2.5 w-full overflow-hidden rounded-full ${c.track}`}>
        <div
          className={`h-full rounded-full ${c.bar} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} progress`}
        />
      </div>
    </div>
  );
}
