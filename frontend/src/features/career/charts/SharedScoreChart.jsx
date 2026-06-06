import { Target } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { Panel } from '@/components/ui/Panel'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { BLUE, ORANGE, PURPLE } from '@/lib/colors'
import { fmt, n } from '@/lib/formatters'

export function SharedScoreChart({ data }) {
  const rows = [
    {
      metric: 'Shared Avg Score',
      [data.playerA.playerName]: n(data.summary.playerAAvgScoreShared),
      [data.playerB.playerName]: n(data.summary.playerBAvgScoreShared),
    },
    {
      metric: 'Shared Avg Goals',
      [data.playerA.playerName]: n(data.summary.playerAAvgGoalsShared),
      [data.playerB.playerName]: n(data.summary.playerBAvgGoalsShared),
    },
    {
      metric: 'Career Avg Score',
      [data.playerA.playerName]: n(data.playerA.summary.avgScore),
      [data.playerB.playerName]: n(data.playerB.summary.avgScore),
    },
  ]

  return (
    <Panel eyebrow="Shared match production" title="Shared sample output" Icon={Target} accent={ORANGE}>
      <MeasuredChart height={290}>
        {({ width, height }) => (
          <BarChart width={width} height={height} data={rows} margin={{ top: 8, right: 18, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<ChartTooltip formatter={(v) => fmt(v, 1)} />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
            <Bar dataKey={data.playerA.playerName} fill={BLUE}   radius={[8, 8, 0, 0]} barSize={24} />
            <Bar dataKey={data.playerB.playerName} fill={PURPLE} radius={[8, 8, 0, 0]} barSize={24} />
          </BarChart>
        )}
      </MeasuredChart>
    </Panel>
  )
}
