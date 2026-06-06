import { ShieldCheck, Swords } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GREEN, RED } from '@/lib/colors'
import { fmt, fmtPct, n } from '@/lib/formatters'
import { formatShortReplayDate, mapLabel } from '@/lib/replayLabels'
import { PeerBarsChart } from '@/features/career/charts/PeerBarsChart'

function WinRateBar({ value, color }) {
  const width = Math.max(0, Math.min(100, n(value)))
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color, boxShadow: `0 0 10px ${color}70` }} />
      </div>
      <span className="stat-num w-10 text-right font-black" style={{ color }}>{fmtPct(value)}</span>
    </div>
  )
}

export function PeerTable({ title, rows, relation, accent, subtitle }) {
  const Icon = relation === 'teammate' ? ShieldCheck : Swords
  const eyebrow = relation === 'teammate' ? 'Teammate splits' : 'Opponent splits'
  const relationLabel = relation === 'teammate' ? 'With' : 'Against'

  return (
    <Panel eyebrow={eyebrow} title={title} subtitle={subtitle} Icon={Icon} accent={accent}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <PeerBarsChart rows={rows} relation={relation} />

        <div>
          {/* Mobile: cards */}
          <div className="max-h-107.5 space-y-2.5 overflow-y-auto md:hidden">
            {rows.map((peer) => (
              <div key={peer.playerId} className="rounded-xl border border-white/6 bg-white/3 p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-white/78">{peer.playerName}</div>
                    <div className="text-[11px] text-white/28">{peer.platform ?? 'Unknown platform'}{peer.isBot ? ' · bot' : ''}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-bold text-white/50">{formatShortReplayDate(peer.lastPlayedAt)}</div>
                    <div className="text-[11px] text-white/25">{mapLabel(peer.lastMapName)}</div>
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-white/6 pt-2.5 text-center text-xs">
                  <div>
                    <div className="text-[11px] text-white/30">{relationLabel}</div>
                    <div className="stat-num font-black text-white/80">{fmt(peer.matches)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-white/30">Record</div>
                    <div className="stat-num text-white/55">{fmt(peer.wins)}-{fmt(peer.losses)}{peer.draws ? `-${fmt(peer.draws)}` : ''}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-white/30">Avg Pts</div>
                    <div className="stat-num font-black text-white/76">{fmt(peer.avgScore, 1)}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="shrink-0 text-[11px] text-white/30">W%</span>
                  <div className="flex-1">
                    <WinRateBar value={peer.winRate} color={peer.winRate >= 50 ? GREEN : RED} />
                  </div>
                </div>
              </div>
            ))}
            {!rows.length && (
              <div className="py-8 text-center text-sm text-white/30">No {relation} samples found.</div>
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden max-h-107.5 overflow-auto md:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#0c0f1a]/95 backdrop-blur">
                <tr className="border-b border-white/6 text-xs font-bold text-white/32">
                  <th className="px-3 py-3 text-left">Player</th>
                  <th className="px-3 py-3 text-right">{relationLabel}</th>
                  <th className="px-3 py-3 text-right">Record</th>
                  <th className="px-3 py-3 text-right">W%</th>
                  <th className="px-3 py-3 text-right">Avg Pts</th>
                  <th className="px-3 py-3 text-right">G/A/S</th>
                  <th className="px-3 py-3 text-right">Sh%</th>
                  <th className="px-3 py-3 text-right">Last</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((peer) => (
                  <tr key={peer.playerId} className="border-b border-white/4.5 transition-colors hover:bg-white/2.5">
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-white/78">{peer.playerName}</div>
                          <div className="mt-0.5 truncate text-[11px] text-white/28">
                            {peer.platform ?? 'Unknown platform'}{peer.isBot ? ' - bot' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="stat-num px-3 py-3 text-right font-black text-white/80">{fmt(peer.matches)}</td>
                    <td className="stat-num px-3 py-3 text-right text-white/55">
                      {fmt(peer.wins)}-{fmt(peer.losses)}{peer.draws ? `-${fmt(peer.draws)}` : ''}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <WinRateBar value={peer.winRate} color={peer.winRate >= 50 ? GREEN : RED} />
                    </td>
                    <td className="stat-num px-3 py-3 text-right font-black text-white/76">{fmt(peer.avgScore, 1)}</td>
                    <td className="stat-num px-3 py-3 text-right text-white/58">
                      {fmt(peer.avgGoals, 2)} / {fmt(peer.avgAssists, 2)} / {fmt(peer.avgSaves, 2)}
                    </td>
                    <td className="stat-num px-3 py-3 text-right text-white/48">{fmt(peer.avgShootingPct, 1)}%</td>
                    <td className="px-3 py-3 text-right">
                      <div className="text-xs font-bold text-white/50">{formatShortReplayDate(peer.lastPlayedAt)}</div>
                      <div className="mt-0.5 text-[11px] text-white/25">{mapLabel(peer.lastMapName)}</div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-white/30">No {relation} samples found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Panel>
  )
}
