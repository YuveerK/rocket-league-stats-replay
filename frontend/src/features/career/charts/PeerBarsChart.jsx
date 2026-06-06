import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { GREEN, RED } from '@/lib/colors'
import { shortName } from '@/lib/formatters'

export function PeerBarsChart({ rows, relation }) {
  const color = relation === 'teammate' ? GREEN : RED
  const topRows = rows.slice(0, 10).map((row) => ({ ...row, short: shortName(row.playerName, 16) }))

  if (!topRows.length) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-sm text-white/35">
        No peer samples available.
      </div>
    )
  }

  return (
    <MeasuredChart height={Math.max(260, topRows.length * 36)}>
      {({ width, height }) => (
        <BarChart width={width} height={height} data={topRows} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="short"
            width={124}
            tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
          <Bar dataKey="matches" name="Matches" fill={color} radius={[0, 8, 8, 0]} barSize={15} />
        </BarChart>
      )}
    </MeasuredChart>
  )
}
