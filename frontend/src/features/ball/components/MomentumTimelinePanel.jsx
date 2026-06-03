import { BarChart3 } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { MomentumTimelineChart } from '@/features/ball/charts/MomentumTimelineChart'
import { BLUE, ORANGE, RED } from '@/lib/colors'

function MomentumTimeline({ rows }) {
  if (!rows.length) {
    return <div className="rounded-2xl border border-white/7 bg-white/3 p-5 text-sm text-white/35">No pressure timeline samples were found.</div>
  }

  return (
    <div className="space-y-5">
      <MomentumTimelineChart rows={rows} />
      <div className="grid grid-cols-12 gap-1">
        {rows.map((bucket) => {
          const color = bucket.dominant === 'blue' ? BLUE : bucket.dominant === 'orange' ? ORANGE : '#94a3b8'
          return (
            <div
              key={`${bucket.start}-${bucket.end}`}
              className="h-8 rounded-md border border-white/7"
              title={`${bucket.label}: ${bucket.dominant}`}
              style={{ background: `${color}24`, boxShadow: `inset 0 0 0 1px ${color}18` }}
            />
          )
        })}
      </div>
    </div>
  )
}

export function MomentumTimelinePanel({ rows }) {
  return (
    <Panel eyebrow="Timeline" title="Pressure Momentum" subtitle="10-second buckets showing where the ball lived most" Icon={BarChart3} accent={RED}>
      <MomentumTimeline rows={rows} />
    </Panel>
  )
}
