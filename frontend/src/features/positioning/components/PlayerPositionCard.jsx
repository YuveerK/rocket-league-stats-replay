import { TEAM_COLORS, TEAM_LABELS } from '@/lib/colors'
import { fmt, fmtPct, n } from '@/lib/formatters'
import { ZONE_COLORS } from '@/features/positioning/constants'

function ZoneStack({ defPct, midPct, attPct }) {
  return (
    <div className="zone-stack">
      <div style={{ width: `${defPct}%`, background: ZONE_COLORS.def }} title={`Def ${defPct}%`} />
      <div style={{ width: `${midPct}%`, background: ZONE_COLORS.mid }} title={`Mid ${midPct}%`} />
      <div style={{ width: `${attPct}%`, background: ZONE_COLORS.att }} title={`Att ${attPct}%`} />
    </div>
  )
}

function PositionStat({ label, value, className = 'text-[var(--app-text)]' }) {
  return (
    <div className="player-accent-card__stat">
      <div className="section-label">{label}</div>
      <div className={`stat-num mt-1 text-lg font-black ${className}`}>{value}</div>
    </div>
  )
}

export function PlayerPositionCard({ player }) {
  const teamColor = TEAM_COLORS[player.team] ?? '#94a3b8'
  const zones = player.zones ?? {}
  const positioning = player.positioning ?? {}

  return (
    <article className="player-accent-card p-4" style={{ '--card-accent': teamColor }}>
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl opacity-30" style={{ background: teamColor }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: teamColor, boxShadow: `0 0 10px ${teamColor}` }} />
            <h4 className="truncate text-sm font-black text-[var(--app-text)]">{player.playerName}</h4>
          </div>
          <p className="mt-1 text-xs text-[var(--app-text-secondary)]">
            {TEAM_LABELS[player.team] ?? 'Team'} - {fmt(player.sampleCount)} samples
          </p>
        </div>
      </div>

      <div className="relative mt-4">
        <ZoneStack defPct={n(zones.defPct)} midPct={n(zones.midPct)} attPct={n(zones.attPct)} />
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase tracking-wider">
          <span style={{ color: ZONE_COLORS.def }}>Def {fmtPct(zones.defPct)}</span>
          <span style={{ color: ZONE_COLORS.mid }}>Mid {fmtPct(zones.midPct)}</span>
          <span style={{ color: ZONE_COLORS.att }}>Att {fmtPct(zones.attPct)}</span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3">
        <PositionStat
          label="Avg dist to ball"
          value={positioning.avgDistanceToBallUU != null ? `${fmt(positioning.avgDistanceToBallUU)} uu` : '-'}
        />
        <PositionStat
          label="Behind ball"
          value={positioning.behindBallPct != null ? fmtPct(positioning.behindBallPct) : '-'}
          className="text-amber-500"
        />
        <div className="col-span-2">
          <PositionStat
            label="Behind ball on own half"
            value={positioning.behindBallOwnHalfPct != null ? fmtPct(positioning.behindBallOwnHalfPct) : '-'}
            className="text-violet-500"
          />
        </div>
      </div>
    </article>
  )
}
