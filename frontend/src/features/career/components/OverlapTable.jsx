import { ShieldCheck, Swords } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GREEN, RED } from '@/lib/colors'
import { fmt, fmtPct } from '@/lib/formatters'

export function OverlapTable({ title, rows, relation, playerA, playerB, accent }) {
  const Icon = relation === 'Common teammates' ? ShieldCheck : Swords

  return (
    <Panel eyebrow={relation} title={title} subtitle="People both compared players have sampled" Icon={Icon} accent={accent}>
      <div className="max-h-[340px] overflow-auto">
        <table className="w-full min-w-[660px] text-sm">
          <thead className="sticky top-0 z-10 bg-[#0c0f1a]/95 backdrop-blur">
            <tr className="border-b border-white/[0.06] text-xs font-bold text-white/32">
              <th className="px-3 py-3 text-left">Player</th>
              <th className="px-3 py-3 text-right">{playerA}</th>
              <th className="px-3 py-3 text-right">W%</th>
              <th className="px-3 py-3 text-right">{playerB}</th>
              <th className="px-3 py-3 text-right">W%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.playerId} className="border-b border-white/[0.045] transition-colors hover:bg-white/[0.025]">
                <td className="px-3 py-3">
                  <div className="truncate text-xs font-black text-white/72">{row.playerName}</div>
                  <div className="mt-0.5 text-[11px] text-white/28">{row.platform ?? 'Unknown platform'}</div>
                </td>
                <td className="stat-num px-3 py-3 text-right text-white/58">{fmt(row.playerA.matches)} games</td>
                <td className="stat-num px-3 py-3 text-right font-black" style={{ color: row.playerA.winRate >= 50 ? GREEN : RED }}>
                  {fmtPct(row.playerA.winRate)}
                </td>
                <td className="stat-num px-3 py-3 text-right text-white/58">{fmt(row.playerB.matches)} games</td>
                <td className="stat-num px-3 py-3 text-right font-black" style={{ color: row.playerB.winRate >= 50 ? GREEN : RED }}>
                  {fmtPct(row.playerB.winRate)}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-white/30">No overlap found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
