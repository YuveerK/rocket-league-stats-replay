import { fmt } from '@/lib/formatters'

/**
 * Shared recharts tooltip.
 * Pass `formatter` to override how values are displayed (e.g. fmtPct for % charts).
 */
export function ChartTooltip({ active, payload, label, formatter = fmt }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-white/10 bg-[#070a13]/95 px-3 py-2 shadow-2xl">
      <div className="mb-1 text-xs font-bold text-white/80">{label}</div>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={`${item.dataKey}-${item.name}`} className="flex items-center justify-between gap-5 text-[11px]">
            <span className="flex items-center gap-1.5 text-white/45">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="stat-num font-bold text-white/85">{formatter(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
