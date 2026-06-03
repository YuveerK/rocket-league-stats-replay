import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { fmtPct } from '@/lib/formatters'
import { BLUE, ORANGE } from '@/lib/colors'

export function MomentumTimelineChart({ rows }) {
  return (
    <MeasuredChart height={260}>
      {({ width, height }) => (
        <AreaChart width={width} height={height} data={rows} margin={{ top: 8, right: 10, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="blue-pressure-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity="0.45" />
              <stop offset="100%" stopColor={BLUE} stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="orange-pressure-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={ORANGE} stopOpacity="0.42" />
              <stop offset="100%" stopColor={ORANGE} stopOpacity="0.03" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            interval="preserveStartEnd"
            tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<ChartTooltip formatter={fmtPct} />} cursor={{ stroke: 'rgba(255,255,255,0.10)' }} />
          <Area type="monotone" dataKey="bluePressurePct" name="Blue pressure" stroke={BLUE} strokeWidth={2.5} fill="url(#blue-pressure-fill)" />
          <Area type="monotone" dataKey="orangePressurePct" name="Orange pressure" stroke={ORANGE} strokeWidth={2.5} fill="url(#orange-pressure-fill)" />
        </AreaChart>
      )}
    </MeasuredChart>
  )
}
