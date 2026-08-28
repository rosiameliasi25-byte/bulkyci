// CalorieRing — elemen signature Dashboard: cincin progres berbentuk "piring"
// yang merepresentasikan kalori terisi hari ini vs target kalori surplus.

export default function CalorieRing({ consumed, target }) {
  const remaining = Math.max(target - consumed, 0);
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;

  const size = 220;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Track piring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F4D394"
          strokeWidth={stroke}
          opacity={0.35}
        />
        {/* Progress amber, ujung membulat seperti sendok mengisi piring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E7A233"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl font-extrabold text-ink">{remaining}</span>
        <span className="font-body text-sm text-ink-faint">kkal tersisa</span>
        <span className="mt-2 rounded-full bg-sage-50 px-3 py-1 font-body text-xs font-medium text-sage-700">
          {consumed} / {target} kkal
        </span>
      </div>
    </div>
  );
}
