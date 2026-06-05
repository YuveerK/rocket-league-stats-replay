import { Footprints } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GOLD } from '@/lib/colors'
import { fmt, fmtPct, n } from '@/lib/formatters'

function formatRowValue(row, value) {
  return row.pct ? fmtPct(value) : `${fmt(value)}${row.suffix ?? ''}`
}

function rowWidth(row, value) {
  if (row.pct) return n(value)

  return Math.min(100, (n(value) / Math.max(n(row.blue), n(row.orange), 1)) * 100)
}

function TeamComparisonRow({ row }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold text-white/40">
        <span>{row.label}</span>
        <span>
          <span className="text-blue-300">{formatRowValue(row, row.blue)}</span>
          <span className="mx-2 text-white/20">vs</span>
          <span className="text-orange-300">{formatRowValue(row, row.orange)}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-white/6">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${rowWidth(row, row.blue)}%` }} />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/6">
          <div className="ml-auto h-full rounded-full bg-orange-500" style={{ width: `${rowWidth(row, row.orange)}%` }} />
        </div>
      </div>
    </div>
  )
}

export function TeamBallProximityPanel({ rows }) {
  return (
    <Panel
      eyebrow="Spacing"
      title="Team Ball Proximity"
      subtitle="Average distance to ball and behind-ball rate"
      Icon={Footprints}
      accent={GOLD}
    >
      <div className="space-y-5 py-1">
        {rows.map((row) => (
          <TeamComparisonRow key={row.label} row={row} />
        ))}
      </div>
    </Panel>
  )
}
