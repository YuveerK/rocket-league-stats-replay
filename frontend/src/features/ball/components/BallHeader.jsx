import { Activity, BarChart3, Clock, Crosshair, Gauge, Sparkles, Upload, Wind, Zap } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { BALL_HEADER_GRADIENT } from '@/features/ball/constants'
import { fmtSpeed, fmtSpeedDetail } from '@/features/ball/lib/ballFormatters'
import { fmt, fmtDuration, fmtPct } from '@/lib/formatters'
import { BLUE, GOLD, ORANGE, PURPLE } from '@/lib/colors'

export function BallHeader({ data, model, onUpload }) {
  return (
    <PageHeader
      gradient={BALL_HEADER_GRADIENT}
      eyebrow="Ball command center"
      EyebrowIcon={Sparkles}
      eyebrowColor="#67e8f9"
      title="Ball Analytics"
      description="Replay-backed ball heatmap, pressure, territory, speed and aerial intelligence."
      onUpload={onUpload}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <HeroMetric label="Match Time" value={fmtDuration(data?.matchDuration)} color="#e5e7eb" Icon={Clock} />
        <HeroMetric label="Avg Ball Speed" value={fmtSpeed(data?.ballSpeed?.avgSpeedUU)} detail={fmtSpeedDetail(data?.ballSpeed?.avgSpeedUU)} color={BLUE} Icon={Gauge} />
        <HeroMetric label="Max Ball Speed" value={fmtSpeed(data?.ballSpeed?.maxSpeedUU)} detail={fmtSpeedDetail(data?.ballSpeed?.maxSpeedUU)} color={GOLD} Icon={Zap} />
        <HeroMetric label="Aerial Time" value={fmtPct(data?.ballAerial?.aerialPct)} color={PURPLE} Icon={Wind} />
        <HeroMetric
          label="Possession Lead"
          value={`${model.possessionLeader} ${fmtPct(model.possessionLeaderPct)}`}
          color={model.possessionLeader === 'Blue' ? BLUE : ORANGE}
          Icon={Activity}
        />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-white/35">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/7 bg-white/4 px-2.5 py-1">
          <BarChart3 size={12} /> {data?.replayName ?? 'Replay'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/7 bg-white/4 px-2.5 py-1">
          <Upload size={12} /> {fmt(data?.sampleCount)} tracked ball samples
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/7 bg-white/4 px-2.5 py-1">
          <Crosshair size={12} /> Blue pressure = ball in Orange half
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/7 bg-white/4 px-2.5 py-1">
          <Gauge size={12} /> Speed shown in km/h, converted from replay UU/s
        </span>
      </div>
    </PageHeader>
  )
}
