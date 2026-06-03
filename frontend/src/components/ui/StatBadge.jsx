export function StatBadge({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.035] px-2 py-1">
      <span className="text-[9px] font-black uppercase tracking-widest text-white/28">{label}</span>
      <span className="stat-num text-xs font-black" style={{ color }}>{value}</span>
    </div>
  )
}
