export function TinyMetric({ label, value, color, subtitle }) {
  return (
    <div className="rounded-2xl border border-white/7 bg-white/3 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="section-label">{label}</span>
        <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
      </div>
      <div className="mt-2 stat-num text-2xl font-black" style={{ color }}>{value}</div>
      {subtitle && <p className="mt-1 text-xs text-white/30">{subtitle}</p>}
    </div>
  )
}
