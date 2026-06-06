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

        <div className="max-h-[430px] overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10 bg-[#0c0f1a]/95 backdrop-blur">
              <tr className="border-b border-white/[0.06] text-xs font-bold text-white/32">
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
                <tr key={peer.playerId} className="border-b border-white/[0.045] transition-colors hover:bg-white/[0.025]">
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
    </Panel>
  )
}
