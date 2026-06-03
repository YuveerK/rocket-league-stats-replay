import { BLUE, ORANGE } from '../constants'

function teamColor(team) { return team === 1 ? ORANGE : BLUE }

export function PlayerCard({ player, speed, boost, isBoosting }) {
  const color  = teamColor(player.team)
  const spdPct = Math.min(100, (speed / 2300) * 100)

  return (
    <div className="rounded-lg px-2 py-1.5" style={{ background: `${color}0a` }}>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color, opacity: 0.6 }} />
        <span className="truncate text-xs font-semibold flex-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {player.playerName}
        </span>
        {isBoosting && (
          <span className="shrink-0 rounded px-1 py-0.5 text-[8px] font-black uppercase tracking-wider"
            style={{ color: '#fdba74', background: 'rgba(251,146,60,0.18)', border: '1px solid rgba(251,146,60,0.35)' }}>
            Boost
          </span>
        )}
        <span className="text-[10px] font-black tabular-nums" style={{ color: `${color}b3` }}>{speed}</span>
      </div>

      <div className="mt-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${spdPct}%`, background: color, opacity: 0.7 }} />
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.18)' }}>Boost</span>
        <span className="text-[10px] font-black tabular-nums"
          style={{ color: isBoosting ? '#fdba74' : 'rgba(245,158,11,0.85)' }}>
          {boost != null ? `${boost}%` : '—'}
        </span>
      </div>

      <div className="mt-0.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-[width] duration-75"
          style={{
            width: `${boost ?? 0}%`,
            background: isBoosting ? '#ff6a00' : '#f59e0b',
            opacity: isBoosting ? 1 : 0.85,
            boxShadow: isBoosting ? '0 0 8px rgba(255,106,0,0.55)' : 'none',
          }} />
      </div>
    </div>
  )
}
