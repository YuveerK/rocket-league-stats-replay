import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { fmtPct } from '@/lib/formatters'

export function BarDistributionChart({ data, max = 100 }) {
  return (
    <MeasuredChart height={230}>
      {({ width, height }) => (
        <BarChart width={width} height={height} data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, max]}
            tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<ChartTooltip formatter={fmtPct} />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
          <Bar dataKey="value" name="% of ball time" radius={[9, 9, 0, 0]} barSize={38}>
            {data.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
          </Bar>
        </BarChart>
      )}
    </MeasuredChart>
  )
}
