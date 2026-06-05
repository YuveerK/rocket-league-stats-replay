import { TrendingUp } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { BLUE } from '@/lib/colors'
import { FieldThirdControlChart } from '@/features/positioning/charts/FieldThirdControlChart'

export function TeamFieldControlPanel({ rows }) {
  return (
    <Panel
      eyebrow="Teams"
      title="Field Third Control"
      subtitle="Share of car samples in each zone (team-relative)"
      Icon={TrendingUp}
      accent={BLUE}
    >
      <FieldThirdControlChart data={rows} />
    </Panel>
  )
}
