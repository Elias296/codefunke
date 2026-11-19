/** Runder Fortschrittsanzeiger (z. B. für Kapitel und Stufen) */
export function ProgressRing({ value, size = 48, stroke = 6, color = "var(--color-leaf)", children, label }: {
  value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode; label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}
      role="img" aria-label={label ?? `${Math.round(v * 100)} Prozent geschafft`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="var(--cf-surface)" stroke="var(--cf-surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/** Waagerechter Balken, z. B. für XP bis zum nächsten Level */
export function ProgressBar({ value, color = "var(--color-sun)", label, height = 14 }: { value: number; color?: string; label: string; height?: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="w-full overflow-hidden rounded-full border-2 border-line bg-surface-2" style={{ height }}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: color, transition: "width .6s ease" }} />
    </div>
  );
}
