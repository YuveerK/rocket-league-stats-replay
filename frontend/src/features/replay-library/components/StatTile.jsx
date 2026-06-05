export function StatTile({ label, value, icon: Icon, color }) {
  return (
    <div className="stat-tile p-4" style={{ '--stat-accent': color }}>
      <div className="stat-tile-glow" />
      <div className="relative flex items-center justify-between">
        <p className="section-label">{label}</p>
        <Icon size={15} style={{ color }} />
      </div>
      <p className="relative mt-3 text-3xl font-black stat-num text-[var(--app-text)]">{value}</p>
    </div>
  )
}
