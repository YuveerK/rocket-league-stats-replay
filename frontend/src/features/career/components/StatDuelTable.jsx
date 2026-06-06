import { BarChart3 } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { BLUE, PURPLE } from '@/lib/colors'
import { n } from '@/lib/formatters'
import { STAT_ROWS } from '@/features/career/constants'

export function StatDuelTable({ playerA, playerB }) {
  const a = playerA.summary
  const b = playerB.summary

  return (
    <Panel eyebrow="Career comparison" title="Side-by-side player profile" Icon={BarChart3} accent={BLUE}>
      {/* Mobile: stacked metric rows */}
      <div className="space-y-1.5 md:hidden">
        {STAT_ROWS.map((row) => {
          const aVal = n(a[row.key])
          const bVal = n(b[row.key])
          const winner = row.higher === 'neutral' || aVal === bVal ? 'even' : aVal > bVal ? 'a' : 'b'
          return (
            <div key={row.key} className="rounded-xl border border-white/6 bg-white/3 px-3 py-2.5">
              <div className="mb-2 text-[11px] font-bold text-white/40">{row.label}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-right">
                  <span className="stat-num text-sm font-black" style={{ color: winner === 'a' ? BLUE : 'rgba(255,255,255,0.68)' }}>
                    {row.format(aVal)}
                  </span>
                  <div className="truncate text-[10px] text-white/28">{playerA.playerName}</div>
                </div>
                <span className="inline-flex min-w-12 shrink-0 justify-center rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[10px] font-black uppercase text-white/42">
                  {winner === 'even' ? 'Even' : winner === 'a' ? 'A' : 'B'}
                </span>
                <div className="flex-1 text-left">
                  <span className="stat-num text-sm font-black" style={{ color: winner === 'b' ? PURPLE : 'rgba(255,255,255,0.68)' }}>
                    {row.format(bVal)}
                  </span>
                  <div className="truncate text-[10px] text-white/28">{playerB.playerName}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/6 text-xs font-bold text-white/32">
              <th className="px-3 py-3 text-left">Metric</th>
              <th className="px-3 py-3 text-right">{playerA.playerName}</th>
              <th className="px-3 py-3 text-center">Edge</th>
              <th className="px-3 py-3 text-right">{playerB.playerName}</th>
            </tr>
          </thead>
          <tbody>
            {STAT_ROWS.map((row) => {
              const aVal = n(a[row.key])
              const bVal = n(b[row.key])
              const winner = row.higher === 'neutral' || aVal === bVal ? 'even' : aVal > bVal ? 'a' : 'b'
              return (
                <tr key={row.key} className="border-b border-white/4.5">
                  <td className="px-3 py-3 font-bold text-white/62">{row.label}</td>
                  <td className="stat-num px-3 py-3 text-right font-black" style={{ color: winner === 'a' ? BLUE : 'rgba(255,255,255,0.68)' }}>
                    {row.format(aVal)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex min-w-16 justify-center rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] font-black uppercase text-white/42">
                      {winner === 'even' ? 'Even' : winner === 'a' ? 'A' : 'B'}
                    </span>
                  </td>
                  <td className="stat-num px-3 py-3 text-right font-black" style={{ color: winner === 'b' ? PURPLE : 'rgba(255,255,255,0.68)' }}>
                    {row.format(bVal)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
