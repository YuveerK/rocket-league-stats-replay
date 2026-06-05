import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { BLUE, ORANGE } from '@/lib/colors'
import { fmt } from '@/lib/formatters'

export function FieldThirdControlChart({ data }) {
  return (
    <MeasuredChart height={300}>
      {({ width, height }) => (
        <BarChart width={width} height={height} data={data} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="zone"
            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<ChartTooltip formatter={(value) => `${fmt(value, 0)}%`} />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
          <Bar dataKey="Blue" fill={BLUE} radius={[8, 8, 0, 0]} barSize={32} />
          <Bar dataKey="Orange" fill={ORANGE} radius={[8, 8, 0, 0]} barSize={32} />
        </BarChart>
      )}
    </MeasuredChart>
  )
}
