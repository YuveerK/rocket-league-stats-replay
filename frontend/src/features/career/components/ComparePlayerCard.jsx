import { fmt, fmtPct } from '@/lib/formatters'
import { MiniMetric } from '@/features/career/components/MiniMetric'

export function ComparePlayerCard({ player, color, side }) {
  const summary = player.summary
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5"
      style={{
        borderColor: `${color}2F`,
        background: `linear-gradient(145deg, ${color}15, rgba(255,255,255,0.035))`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 22px 60px ${color}0D`,
      }}
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl" style={{ background: `${color}22` }} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="section-label">{side}</div>
          <h2 className="mt-2 truncate text-2xl font-black text-white">{player.playerName}</h2>
          <p className="mt-1 text-xs text-white/32">
            {fmt(summary.wins)}-{fmt(summary.losses)}{summary.draws ? `-${fmt(summary.draws)}` : ''} career record
          </p>
        </div>
        <div className="text-right">
          <div className="stat-num text-4xl font-black" style={{ color }}>{fmtPct(summary.winRate)}</div>
          <div className="section-label mt-1">Win Rate</div>
        </div>
      </div>
      <div className="relative mt-5 grid grid-cols-3 gap-3">
        <MiniMetric label="Avg Score" value={fmt(summary.avgScore, 1)} color={color} />
        <MiniMetric label="G / A / S" value={`${fmt(summary.avgGoals, 1)} / ${fmt(summary.avgAssists, 1)} / ${fmt(summary.avgSaves, 1)}`} color={color} />
        <MiniMetric label="Shooting" value={`${fmt(summary.avgShootingPct, 1)}%`} color={color} />
      </div>
    </div>
  )
}
