export function PlayerPill({ player }) {
  const color = player.team === 0 ? '#60a5fa' : '#fb923c'
  return (
    <span className="glass-pill">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
      <span className="truncate">{player.name}</span>
      <span className="stat-num text-[var(--app-text-faint)]">{player.goals}G</span>
    </span>
  )
}
