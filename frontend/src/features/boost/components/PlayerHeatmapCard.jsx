import { useMemo } from 'react'
import { n, fmt } from '@/lib/formatters'
import { teamLabel, teamColor } from '@/lib/team'
import { StatBadge } from '@/components/ui/StatBadge'
import { FieldPickupMap } from '../charts/FieldPickupMap'

export function PlayerHeatmapCard({ player, allPads, filter }) {
  const displayPads = useMemo(() => allPads.map(pad => {
    const matches = filter === 'all' || pad.padType === filter
    return { ...pad, count: matches ? (n(pad.pickupsByPlayer?.[player.playerName]) || 0) : 0 }
  }), [allPads, player.playerName, filter])

  const maxCount = useMemo(() => Math.max(1, ...displayPads.map(p => p.count)), [displayPads])
  const tc = teamColor(player.team)

  return (
    <article
      className="relative overflow-hidden rounded-2xl border"
      style={{ borderColor: `${tc}1e`, background: 'rgba(7,10,20,0.72)' }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl" style={{ background: `${tc}0c` }} />

      <div className="relative border-b border-white/5.5 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: player.color, boxShadow: `0 0 8px ${player.color}` }} />
            <span className="truncate text-sm font-black text-white/85">{player.playerName}</span>
          </div>
          <span className="shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
            style={{ borderColor: `${tc}22`, color: tc, background: `${tc}10` }}>
            {teamLabel(player.team)}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <StatBadge label="Total"  value={fmt(n(player.pickups))}   color={tc} />
          <StatBadge label="Big"    value={fmt(n(player.bigPads))}   color="rgba(255,255,255,0.50)" />
          <StatBadge label="Small"  value={fmt(n(player.smallPads))} color="rgba(255,255,255,0.50)" />
          {n(player.boostStolen) > 0 && (
            <StatBadge label="Stolen" value={fmt(n(player.boostStolen))} color="#f87171" />
          )}
        </div>
      </div>

      <div className="p-1.5">
        <FieldPickupMap pads={displayPads} maxCount={maxCount} mapId={player.key} />
      </div>
    </article>
  )
}
