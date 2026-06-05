import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { fmt } from '@/lib/formatters'

export function DistanceToBallChart({ data }) {
  return (
    <MeasuredChart height={Math.max(260, data.length * 44)}>
      {({ width, height }) => (
        <BarChart width={width} height={height} data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip formatter={(value) => `${fmt(value)} uu`} />} />
          <Bar dataKey="distance" name="Avg distance" radius={[0, 8, 8, 0]} barSize={14}>
            {data.map((row, index) => (
              <Cell key={`${row.name}-${index}`} fill={row.color} />
            ))}
          </Bar>
        </BarChart>
      )}
    </MeasuredChart>
  )
}
