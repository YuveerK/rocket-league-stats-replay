import { Wind, Zap } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { BarDistributionChart } from '@/features/ball/charts/BarDistributionChart'
import { GOLD, PURPLE } from '@/lib/colors'

export function BallBandPanels({ speedData, heightData }) {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Panel eyebrow="Speed" title="Ball Velocity Bands" subtitle="Slow <36 km/h / Medium 36-72 / Fast 72-108 / Supersonic 108+" Icon={Zap} accent={GOLD}>
        <BarDistributionChart data={speedData} />
      </Panel>
      <Panel eyebrow="Height" title="Ball Height Bands" subtitle="Ground, low aerial and high aerial time" Icon={Wind} accent={PURPLE}>
        <BarDistributionChart data={heightData} />
      </Panel>
    </section>
  )
}
