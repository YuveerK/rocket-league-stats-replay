import { Map as MapIcon } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GREEN, PURPLE, RED } from '@/lib/colors'
import { fmt, fmtPct, n } from '@/lib/formatters'
import { mapLabel } from '@/lib/replayLabels'

export function MapCompare({ rows, playerA, playerB }) {
  return (
    <Panel
      eyebrow="Common maps"
      title="Map performance comparison"
      subtitle="Average score, goals and win rate grouped by map"
      Icon={MapIcon}
      accent={PURPLE}
    >
      {/* Mobile: cards */}
      <div className="max-h-115 space-y-2 overflow-y-auto md:hidden">
        {rows.map((row) => {
          const a = row.playerA
          const b = row.playerB
          const edge = n(a?.winRate) === n(b?.winRate) ? 'Even' : n(a?.winRate) > n(b?.winRate) ? 'A' : 'B'
          return (
            <div key={row.mapName} className="rounded-xl border border-white/6 bg-white/3 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-xs font-black text-white/70">{mapLabel(row.mapName)}</div>
                <span className="inline-flex min-w-12 shrink-0 justify-center rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[10px] font-black uppercase text-white/42">
                  {edge}
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-3 border-t border-white/6 pt-2.5 text-xs">
                <div>
                  <div className="truncate text-[11px] text-white/30">{playerA}</div>
                  <div className="stat-num mt-0.5 text-white/54">{a ? fmt(a.matches) : '-'} GP</div>
                  <div className="stat-num font-black" style={{ color: a ? (a.winRate >= 50 ? GREEN : RED) : 'rgba(255,255,255,0.22)' }}>
                    {a ? fmtPct(a.winRate) : '-'}
                  </div>
                  <div className="stat-num text-white/55">{a ? `${fmt(a.avgScore, 1)} avg` : '-'}</div>
                </div>
                <div className="text-right">
                  <div className="truncate text-[11px] text-white/30">{playerB}</div>
                  <div className="stat-num mt-0.5 text-white/54">{b ? fmt(b.matches) : '-'} GP</div>
                  <div className="stat-num font-black" style={{ color: b ? (b.winRate >= 50 ? GREEN : RED) : 'rgba(255,255,255,0.22)' }}>
                    {b ? fmtPct(b.winRate) : '-'}
                  </div>
                  <div className="stat-num text-white/55">{b ? `${fmt(b.avgScore, 1)} avg` : '-'}</div>
                </div>
              </div>
            </div>
          )
        })}
        {!rows.length && (
          <div className="py-8 text-center text-sm text-white/30">No common maps found.</div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden max-h-115 overflow-auto md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[#0c0f1a]/95 backdrop-blur">
            <tr className="border-b border-white/6 text-xs font-bold text-white/32">
              <th className="px-3 py-3 text-left">Map</th>
              <th className="px-3 py-3 text-right">{playerA} GP</th>
              <th className="px-3 py-3 text-right">{playerA} W%</th>
              <th className="px-3 py-3 text-right">{playerA} Avg</th>
              <th className="px-3 py-3 text-right">{playerB} GP</th>
              <th className="px-3 py-3 text-right">{playerB} W%</th>
              <th className="px-3 py-3 text-right">{playerB} Avg</th>
              <th className="px-3 py-3 text-center">Edge</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const a = row.playerA
              const b = row.playerB
              const edge = n(a?.winRate) === n(b?.winRate) ? 'Even' : n(a?.winRate) > n(b?.winRate) ? 'A' : 'B'
              return (
                <tr key={row.mapName} className="border-b border-white/4.5 transition-colors hover:bg-white/2.5">
                  <td className="px-3 py-3 text-xs font-black text-white/70">{mapLabel(row.mapName)}</td>
                  <td className="stat-num px-3 py-3 text-right text-white/54">{a ? fmt(a.matches) : '-'}</td>
                  <td className="stat-num px-3 py-3 text-right font-black" style={{ color: a ? (a.winRate >= 50 ? GREEN : RED) : 'rgba(255,255,255,0.22)' }}>
                    {a ? fmtPct(a.winRate) : '-'}
                  </td>
                  <td className="stat-num px-3 py-3 text-right text-white/58">{a ? `${fmt(a.avgScore, 1)} / ${fmt(a.avgGoals, 2)}G` : '-'}</td>
                  <td className="stat-num px-3 py-3 text-right text-white/54">{b ? fmt(b.matches) : '-'}</td>
                  <td className="stat-num px-3 py-3 text-right font-black" style={{ color: b ? (b.winRate >= 50 ? GREEN : RED) : 'rgba(255,255,255,0.22)' }}>
                    {b ? fmtPct(b.winRate) : '-'}
                  </td>
                  <td className="stat-num px-3 py-3 text-right text-white/58">{b ? `${fmt(b.avgScore, 1)} / ${fmt(b.avgGoals, 2)}G` : '-'}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex min-w-14 justify-center rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] font-black uppercase text-white/42">
                      {edge}
                    </span>
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
