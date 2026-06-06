import { Sparkles } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { BLUE, ORANGE } from '@/lib/colors'
import { fmt } from '@/lib/formatters'
import { formatReplayDate, mapLabel, playlistLabel } from '@/lib/replayLabels'

export function SharedMatchesTable({ matches, playerA, playerB }) {
  return (
    <Panel
      eyebrow="Match ledger"
      title="Shared matches"
      subtitle={`${fmt(matches.length)} newest shared samples shown`}
      Icon={Sparkles}
      accent={BLUE}
    >
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="sticky top-0 z-10 bg-[#0c0f1a]/95 backdrop-blur">
            <tr className="border-b border-white/[0.06] text-xs font-bold text-white/32">
              <th className="px-3 py-3 text-left">Match</th>
              <th className="px-3 py-3 text-left">Map</th>
              <th className="px-3 py-3 text-left">Mode</th>
              <th className="px-3 py-3 text-center">Scoreline</th>
              <th className="px-3 py-3 text-center">Relation</th>
              <th className="px-3 py-3 text-right">{playerA}</th>
              <th className="px-3 py-3 text-right">{playerB}</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.replayId} className="border-b border-white/[0.045] transition-colors hover:bg-white/[0.025]">
                <td className="px-3 py-3 text-xs font-bold text-white/56">{formatReplayDate(match.date)}</td>
                <td className="px-3 py-3 text-xs font-bold text-white/68">{mapLabel(match.mapName)}</td>
                <td className="px-3 py-3 text-xs text-white/38">{playlistLabel(match.playlist)}</td>
                <td className="stat-num px-3 py-3 text-center text-xs text-white/62">
                  <span style={{ color: BLUE }}>{match.team0Score ?? '-'}</span>
                  <span className="mx-1 text-white/20">-</span>
                  <span style={{ color: ORANGE }}>{match.team1Score ?? '-'}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-black uppercase text-white/42">
                    {match.relationship}
                  </span>
                </td>
                <td className="stat-num px-3 py-3 text-right text-white/62">{fmt(match.playerA.score)} pts / {fmt(match.playerA.goals)}G</td>
                <td className="stat-num px-3 py-3 text-right text-white/62">{fmt(match.playerB.score)} pts / {fmt(match.playerB.goals)}G</td>
              </tr>
            ))}
            {!matches.length && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-white/30">
                  These players have not appeared in the same indexed replay yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
