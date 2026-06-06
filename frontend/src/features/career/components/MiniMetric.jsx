export function MiniMetric({ label, value, color }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/25">{label}</div>
      <div className="stat-num mt-2 truncate text-lg font-black" style={{ color }}>{value}</div>
    </div>
  )
}
