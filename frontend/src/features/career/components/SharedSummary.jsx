import { Swords } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { BLUE, GOLD, GREEN, ORANGE, PURPLE, RED } from '@/lib/colors'
import { fmt, fmtPct } from '@/lib/formatters'
import { MiniMetric } from '@/features/career/components/MiniMetric'

export function SharedSummary({ data }) {
  const summary = data.summary

  return (
    <Panel eyebrow="Shared samples" title="Together and head-to-head" Icon={Swords} accent={GOLD}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniMetric label="Shared Matches"   value={fmt(summary.sharedMatches)}                      color={GOLD}  />
        <MiniMetric label="Same Team"        value={`${fmt(summary.sameTeamMatches)} games`}         color={GREEN} />
        <MiniMetric label="Opposite Teams"   value={`${fmt(summary.oppositeTeamMatches)} games`}     color={RED}   />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="section-label">As Teammates</div>
              <div className="mt-2 text-sm text-white/50">Win rate when they share a team</div>
            </div>
            <div className="stat-num text-4xl font-black" style={{ color: GREEN }}>{fmtPct(summary.togetherWinRate)}</div>
          </div>
          <div className="mt-4 text-xs font-bold text-white/34">
            {fmt(summary.winsTogether)} wins, {fmt(summary.lossesTogether)} losses
            {summary.drawsTogether ? `, ${fmt(summary.drawsTogether)} draws` : ''}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="section-label">Head To Head</div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="text-right">
              <div className="truncate text-sm font-black text-white">{data.playerA.playerName}</div>
              <div className="stat-num mt-1 text-3xl font-black" style={{ color: BLUE }}>{fmt(summary.playerAWinsVsB)}</div>
              <div className="mt-1 text-xs text-white/30">{fmtPct(summary.playerAWinRateVsB)}</div>
            </div>
            <div className="text-xl font-thin text-white/18">-</div>
            <div>
              <div className="truncate text-sm font-black text-white">{data.playerB.playerName}</div>
              <div className="stat-num mt-1 text-3xl font-black" style={{ color: PURPLE }}>{fmt(summary.playerBWinsVsA)}</div>
              <div className="mt-1 text-xs text-white/30">{fmtPct(summary.playerBWinRateVsA)}</div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  )
}
