import { Activity } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { TinyMetric } from '@/features/ball/components/TinyMetric'
import { fmtDuration, fmtPct, n } from '@/lib/formatters'
import { BLUE, ORANGE } from '@/lib/colors'

function PressureSplit({ pressure }) {
  const blue = n(pressure?.bluePressurePct)
  const orange = n(pressure?.orangePressurePct)
  const neutral = n(pressure?.neutralPct)
  const total = Math.max(1, blue + orange + neutral)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="section-label">Blue Pressure</div>
          <div className="stat-num text-4xl font-black text-blue-300">{fmtPct(blue)}</div>
          <p className="text-xs text-white/30">Ball in Orange half</p>
        </div>
        <div className="text-right">
          <div className="section-label">Orange Pressure</div>
          <div className="stat-num text-4xl font-black text-orange-300">{fmtPct(orange)}</div>
          <p className="text-xs text-white/30">Ball in Blue half</p>
        </div>
      </div>

      <div className="relative h-7 overflow-hidden rounded-full border border-white/8 bg-white/4">
        <div
          className="absolute left-0 top-0 h-full"
          style={{ width: `${(blue / total) * 100}%`, background: 'linear-gradient(90deg,#1d4ed8,#60a5fa)', boxShadow: '0 0 22px rgba(96,165,250,0.45)' }}
        />
        <div
          className="absolute right-0 top-0 h-full"
          style={{ width: `${(orange / total) * 100}%`, background: 'linear-gradient(90deg,#fb923c,#c2410c)', boxShadow: '0 0 22px rgba(251,146,60,0.45)' }}
        />
        {neutral > 0 && <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/40" />}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TinyMetric label="Blue time" value={fmtDuration(pressure?.bluePressureSeconds)} color={BLUE} subtitle="Offensive half time" />
        <TinyMetric label="Neutral" value={fmtDuration(pressure?.neutralSeconds)} color="#e5e7eb" subtitle="Exact midfield samples" />
        <TinyMetric label="Orange time" value={fmtDuration(pressure?.orangePressureSeconds)} color={ORANGE} subtitle="Offensive half time" />
      </div>
    </div>
  )
}

export function PressurePanel({ pressure }) {
  return (
    <Panel eyebrow="Pressure" title="Territory Control" subtitle="Pressure means the ball is in the opponent half" Icon={Activity} accent={BLUE}>
      <PressureSplit pressure={pressure} />
    </Panel>
  )
}
