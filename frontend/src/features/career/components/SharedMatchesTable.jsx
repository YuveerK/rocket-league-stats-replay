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
      {/* Mobile: cards */}
      <div className="max-h-120 space-y-2.5 overflow-y-auto md:hidden">
        {matches.map((match) => (
          <div key={match.replayId} className="rounded-xl border border-white/6 bg-white/3 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white/56">{formatReplayDate(match.date)}</div>
                <div className="mt-0.5 text-xs font-bold text-white/68">{mapLabel(match.mapName)}</div>
                <div className="text-[11px] text-white/38">{playlistLabel(match.playlist)}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="stat-num text-xs text-white/62">
                  <span style={{ color: BLUE }}>{match.team0Score ?? '-'}</span>
                  <span className="mx-1 text-white/20">-</span>
                  <span style={{ color: ORANGE }}>{match.team1Score ?? '-'}</span>
                </div>
                <span className="mt-1 inline-flex rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[10px] font-black uppercase text-white/42">
                  {match.relationship}
                </span>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-white/6 pt-2.5 text-xs">
              <div>
                <div className="truncate text-[11px] text-white/30">{playerA}</div>
                <div className="stat-num text-white/62">{fmt(match.playerA.score)} pts · {fmt(match.playerA.goals)}G</div>
              </div>
              <div className="text-right">
                <div className="truncate text-[11px] text-white/30">{playerB}</div>
                <div className="stat-num text-white/62">{fmt(match.playerB.score)} pts · {fmt(match.playerB.goals)}G</div>
              </div>
            </div>
          </div>
        ))}
        {!matches.length && (
          <div className="py-8 text-center text-sm text-white/30">
            These players have not appeared in the same indexed replay yet.
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden max-h-120 overflow-auto md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[#0c0f1a]/95 backdrop-blur">
            <tr className="border-b border-white/6 text-xs font-bold text-white/32">
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
              <tr key={match.replayId} className="border-b border-white/4.5 transition-colors hover:bg-white/2.5">
                <td className="px-3 py-3 text-xs font-bold text-white/56">{formatReplayDate(match.date)}</td>
                <td className="px-3 py-3 text-xs font-bold text-white/68">{mapLabel(match.mapName)}</td>
                <td className="px-3 py-3 text-xs text-white/38">{playlistLabel(match.playlist)}</td>
                <td className="stat-num px-3 py-3 text-center text-xs text-white/62">
                  <span style={{ color: BLUE }}>{match.team0Score ?? '-'}</span>
                  <span className="mx-1 text-white/20">-</span>
                  <span style={{ color: ORANGE }}>{match.team1Score ?? '-'}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] font-black uppercase text-white/42">
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
