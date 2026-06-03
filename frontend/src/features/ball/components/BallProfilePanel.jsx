import { Gauge } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { TinyMetric } from '@/features/ball/components/TinyMetric'
import { fmtSpeed, fmtSpeedDetail } from '@/features/ball/lib/ballFormatters'
import { fmt, fmtPct } from '@/lib/formatters'
import { BLUE, GOLD, GREEN, ORANGE, PURPLE } from '@/lib/colors'

export function BallProfilePanel({ data, model }) {
  return (
    <Panel eyebrow="Ball Profile" title="Live Summary" subtitle="High-level replay traits" Icon={Gauge} accent={GREEN}>
      <div className="space-y-4">
        <TinyMetric
          label="Average speed"
          value={fmtSpeed(data.ballSpeed?.avgSpeedUU)}
          color={BLUE}
          subtitle={`${fmtSpeedDetail(data.ballSpeed?.avgSpeedUU)} / ${fmt(data.ballSpeed?.sampleCount)} samples`}
        />
        <TinyMetric
          label="Aerial share"
          value={fmtPct(data.ballAerial?.aerialPct)}
          color={PURPLE}
          subtitle={`${fmt(data.ballAerial?.aerialSamples)} aerial samples`}
        />
        <TinyMetric
          label="Max speed"
          value={fmtSpeed(data.ballSpeed?.maxSpeedUU)}
          color={GOLD}
          subtitle={`${fmtSpeedDetail(data.ballSpeed?.maxSpeedUU)} peak velocity`}
        />
        <div className="rounded-2xl border border-white/7 bg-white/3 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="section-label">Possession</span>
            <span className="text-xs text-white/35">{model.possessionLeader} led touches</span>
          </div>
          <div className="relative h-4 overflow-hidden rounded-full bg-white/6">
            <div className="absolute left-0 top-0 h-full" style={{ width: `${model.bluePossession}%`, background: BLUE }} />
            <div className="absolute right-0 top-0 h-full" style={{ width: `${model.orangePossession}%`, background: ORANGE }} />
          </div>
          <div className="mt-2 flex justify-between text-xs stat-num text-white/40">
            <span>{fmtPct(model.bluePossession)} Blue</span>
            <span>{fmtPct(model.orangePossession)} Orange</span>
          </div>
        </div>
      </div>
    </Panel>
  )
}
