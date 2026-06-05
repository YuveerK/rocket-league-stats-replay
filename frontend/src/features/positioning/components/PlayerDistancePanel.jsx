import { Target } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GREEN } from '@/lib/colors'
import { DistanceToBallChart } from '@/features/positioning/charts/DistanceToBallChart'

export function PlayerDistancePanel({ rows }) {
  return (
    <Panel
      eyebrow="Players"
      title="Distance To Ball"
      subtitle="Lower = tighter to play; ranked by average UU distance"
      Icon={Target}
      accent={GREEN}
    >
      <DistanceToBallChart data={rows} />
    </Panel>
  )
}
