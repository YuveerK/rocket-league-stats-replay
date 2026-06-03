import { Layers } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { BarDistributionChart } from '@/features/ball/charts/BarDistributionChart'
import { ORANGE } from '@/lib/colors'

export function TerritoryPanel({ territoryData, thirdsData }) {
  return (
    <Panel eyebrow="Territory" title="Field Occupancy" subtitle="Half split and thirds split" Icon={Layers} accent={ORANGE}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="section-label">Halves</span>
            <span className="text-xs text-white/30">Blue half / midfield / Orange half</span>
          </div>
          <BarDistributionChart data={territoryData} />
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="section-label">Thirds</span>
            <span className="text-xs text-white/30">Defensive / middle / attacking thirds</span>
          </div>
          <BarDistributionChart data={thirdsData} />
        </div>
      </div>
    </Panel>
  )
}
