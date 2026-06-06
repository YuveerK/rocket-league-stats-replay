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
      <div className="overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-xs font-bold text-white/32">
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
                <tr key={row.key} className="border-b border-white/[0.045]">
                  <td className="px-3 py-3 font-bold text-white/62">{row.label}</td>
                  <td className="stat-num px-3 py-3 text-right font-black" style={{ color: winner === 'a' ? BLUE : 'rgba(255,255,255,0.68)' }}>
                    {row.format(aVal)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex min-w-16 justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-black uppercase text-white/42">
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
