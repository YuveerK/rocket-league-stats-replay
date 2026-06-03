import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Activity,
  BarChart3,
  ChevronDown,
  GitCompareArrows,
  Map as MapIcon,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Users,
} from 'lucide-react'
import { apiGet } from '@/services/apiClient'
import { PageHeader } from '@/components/layout/PageHeader'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { Panel } from '@/components/ui/Panel'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { BLUE, GOLD, GREEN, ORANGE, PURPLE, RED } from '@/lib/colors'
import { fmt, fmtPct, n, shortName } from '@/lib/formatters'
import { formatReplayDate, mapLabel, playlistLabel } from '@/lib/replayLabels'

const COMPARE_HEADER_GRADIENT =
  'radial-gradient(circle at 16% 0%, rgba(96,165,250,0.17), transparent 31%), ' +
  'radial-gradient(circle at 84% 8%, rgba(168,85,247,0.15), transparent 30%), ' +
  'linear-gradient(135deg,#080b16 0%,#05070f 58%,#090d18 100%)'

const EMPTY_ARRAY = []

const STAT_ROWS = [
  { label: 'Matches', key: 'totalMatches', format: (value) => fmt(value), higher: 'better' },
  { label: 'Win Rate', key: 'winRate', format: (value) => fmtPct(value), higher: 'better' },
  { label: 'Avg Score', key: 'avgScore', format: (value) => fmt(value, 1), higher: 'better' },
  { label: 'Goals / Game', key: 'avgGoals', format: (value) => fmt(value, 2), higher: 'better' },
  { label: 'Assists / Game', key: 'avgAssists', format: (value) => fmt(value, 2), higher: 'better' },
  { label: 'Saves / Game', key: 'avgSaves', format: (value) => fmt(value, 2), higher: 'better' },
  { label: 'Shots / Game', key: 'avgShots', format: (value) => fmt(value, 2), higher: 'better' },
  { label: 'Shooting %', key: 'avgShootingPct', format: (value) => `${fmt(value, 1)}%`, higher: 'better' },
  { label: 'Avg Boost', key: 'avgBoost', format: (value) => `${fmt(value, 1)}%`, higher: 'neutral' },
  { label: 'Supersonic %', key: 'avgSupersonicPct', format: (value) => `${fmt(value, 1)}%`, higher: 'neutral' },
  { label: 'Airborne %', key: 'avgAirbornePct', format: (value) => `${fmt(value, 1)}%`, higher: 'neutral' },
  { label: 'BPM', key: 'avgBpm', format: (value) => fmt(value, 1), higher: 'neutral' },
  { label: 'Total Demos', key: 'totalKills', format: (value) => fmt(value), higher: 'better' },
]

function PlayerSelector({ label, players, value, otherValue, onChange, color }) {
  return (
    <label className="min-w-0">
      <span className="mb-2 block text-xs font-bold text-white/35">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={!players.length}
          className="w-full appearance-none rounded-xl border border-white/[0.1] bg-[#0a0e19] px-3 py-3 pr-9 text-sm font-bold text-white outline-none transition disabled:cursor-not-allowed disabled:text-white/25"
          style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 42px ${color}12` }}
        >
          {players.length === 0 && <option value="">No players found</option>}
          {players.map((player) => (
            <option key={player.playerName} value={player.playerName} disabled={player.playerName === otherValue} className="bg-[#0a0e19] text-white">
              {player.playerName}
            </option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
      </span>
    </label>
  )
}

function ComparePicker({ players, playerA, playerB, onPlayerA, onPlayerB, totalShared }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full blur-3xl" style={{ background: 'rgba(96,165,250,0.16)' }} />
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl" style={{ background: 'rgba(168,85,247,0.16)' }} />
      <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
        <PlayerSelector label="Player A" players={players} value={playerA} otherValue={playerB} onChange={onPlayerA} color={BLUE} />
        <div className="flex items-center justify-center pb-1">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.045] text-white/42">
            <GitCompareArrows size={18} />
          </div>
        </div>
        <PlayerSelector label="Player B" players={players} value={playerB} otherValue={playerA} onChange={onPlayerB} color={PURPLE} />
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2 text-xs text-white/38">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1">
          <Users size={12} /> {fmt(players.length)} selectable players
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1">
          <Activity size={12} /> {fmt(totalShared)} shared replay samples
        </span>
      </div>
    </div>
  )
}

function EmptyState({ title, detail, tone = BLUE }) {
  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border"
          style={{ color: tone, background: `${tone}12`, borderColor: `${tone}30` }}>
          <GitCompareArrows size={20} />
        </div>
        <h2 className="mt-5 text-lg font-black text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/35">{detail}</p>
      </div>
    </div>
  )
}

function PlayerCard({ player, color, side }) {
  const summary = player.summary
  return (
    <div className="relative overflow-hidden rounded-2xl border p-5"
      style={{
        borderColor: `${color}2F`,
        background: `linear-gradient(145deg, ${color}15, rgba(255,255,255,0.035))`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 22px 60px ${color}0D`,
      }}>
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl" style={{ background: `${color}22` }} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="section-label">{side}</div>
          <h2 className="mt-2 truncate text-2xl font-black text-white">{player.playerName}</h2>
          <p className="mt-1 text-xs text-white/32">{fmt(summary.wins)}-{fmt(summary.losses)}{summary.draws ? `-${fmt(summary.draws)}` : ''} career record</p>
        </div>
        <div className="text-right">
          <div className="stat-num text-4xl font-black" style={{ color }}>{fmtPct(summary.winRate)}</div>
          <div className="section-label mt-1">Win Rate</div>
        </div>
      </div>
      <div className="relative mt-5 grid grid-cols-3 gap-3">
        <MiniMetric label="Avg Score" value={fmt(summary.avgScore, 1)} color={color} />
        <MiniMetric label="G / A / S" value={`${fmt(summary.avgGoals, 1)} / ${fmt(summary.avgAssists, 1)} / ${fmt(summary.avgSaves, 1)}`} color={color} />
        <MiniMetric label="Shooting" value={`${fmt(summary.avgShootingPct, 1)}%`} color={color} />
      </div>
    </div>
  )
}

function MiniMetric({ label, value, color }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-white/25">{label}</div>
      <div className="stat-num mt-2 truncate text-lg font-black" style={{ color }}>{value}</div>
    </div>
  )
}

function StatDuelTable({ playerA, playerB }) {
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
              const aValue = n(a[row.key])
              const bValue = n(b[row.key])
              const winner = row.higher === 'neutral' || aValue === bValue ? 'even' : aValue > bValue ? 'a' : 'b'
              return (
                <tr key={row.key} className="border-b border-white/[0.045]">
                  <td className="px-3 py-3 font-bold text-white/62">{row.label}</td>
                  <td className="stat-num px-3 py-3 text-right font-black" style={{ color: winner === 'a' ? BLUE : 'rgba(255,255,255,0.68)' }}>{row.format(aValue)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex min-w-16 justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-black uppercase text-white/42">
                      {winner === 'even' ? 'Even' : winner === 'a' ? 'A' : 'B'}
                    </span>
                  </td>
                  <td className="stat-num px-3 py-3 text-right font-black" style={{ color: winner === 'b' ? PURPLE : 'rgba(255,255,255,0.68)' }}>{row.format(bValue)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function SharedSummary({ data }) {
  const summary = data.summary

  return (
    <Panel eyebrow="Shared samples" title="Together and head-to-head" Icon={Swords} accent={GOLD}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniMetric label="Shared Matches" value={fmt(summary.sharedMatches)} color={GOLD} />
        <MiniMetric label="Same Team" value={`${fmt(summary.sameTeamMatches)} games`} color={GREEN} />
        <MiniMetric label="Opposite Teams" value={`${fmt(summary.oppositeTeamMatches)} games`} color={RED} />
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
            {fmt(summary.winsTogether)} wins, {fmt(summary.lossesTogether)} losses{summary.drawsTogether ? `, ${fmt(summary.drawsTogether)} draws` : ''}
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

function SharedScoreChart({ data }) {
  const rows = [
    {
      metric: 'Shared Avg Score',
      [data.playerA.playerName]: n(data.summary.playerAAvgScoreShared),
      [data.playerB.playerName]: n(data.summary.playerBAvgScoreShared),
    },
    {
      metric: 'Shared Avg Goals',
      [data.playerA.playerName]: n(data.summary.playerAAvgGoalsShared),
      [data.playerB.playerName]: n(data.summary.playerBAvgGoalsShared),
    },
    {
      metric: 'Career Avg Score',
      [data.playerA.playerName]: n(data.playerA.summary.avgScore),
      [data.playerB.playerName]: n(data.playerB.summary.avgScore),
    },
  ]

  return (
    <Panel eyebrow="Shared match production" title="Shared sample output" Icon={Target} accent={ORANGE}>
      <MeasuredChart height={290}>
        {({ width, height }) => (
          <BarChart width={width} height={height} data={rows} margin={{ top: 8, right: 18, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<ChartTooltip formatter={(value) => fmt(value, 1)} />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
            <Bar dataKey={data.playerA.playerName} fill={BLUE} radius={[8, 8, 0, 0]} barSize={24} />
            <Bar dataKey={data.playerB.playerName} fill={PURPLE} radius={[8, 8, 0, 0]} barSize={24} />
          </BarChart>
        )}
      </MeasuredChart>
    </Panel>
  )
}

function MapCompare({ rows, playerA, playerB }) {
  return (
    <Panel eyebrow="Common maps" title="Map performance comparison" subtitle="Average score, goals and win rate grouped by map" Icon={MapIcon} accent={PURPLE}>
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="sticky top-0 z-10 bg-[#0c0f1a]/95 backdrop-blur">
            <tr className="border-b border-white/[0.06] text-xs font-bold text-white/32">
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
                <tr key={row.mapName} className="border-b border-white/[0.045] transition-colors hover:bg-white/[0.025]">
                  <td className="px-3 py-3 text-xs font-black text-white/70">{mapLabel(row.mapName)}</td>
                  <td className="stat-num px-3 py-3 text-right text-white/54">{a ? fmt(a.matches) : '-'}</td>
                  <td className="stat-num px-3 py-3 text-right font-black" style={{ color: a ? (a.winRate >= 50 ? GREEN : RED) : 'rgba(255,255,255,0.22)' }}>{a ? fmtPct(a.winRate) : '-'}</td>
                  <td className="stat-num px-3 py-3 text-right text-white/58">{a ? `${fmt(a.avgScore, 1)} / ${fmt(a.avgGoals, 2)}G` : '-'}</td>
                  <td className="stat-num px-3 py-3 text-right text-white/54">{b ? fmt(b.matches) : '-'}</td>
                  <td className="stat-num px-3 py-3 text-right font-black" style={{ color: b ? (b.winRate >= 50 ? GREEN : RED) : 'rgba(255,255,255,0.22)' }}>{b ? fmtPct(b.winRate) : '-'}</td>
                  <td className="stat-num px-3 py-3 text-right text-white/58">{b ? `${fmt(b.avgScore, 1)} / ${fmt(b.avgGoals, 2)}G` : '-'}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex min-w-14 justify-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-black uppercase text-white/42">{edge}</span>
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

function OverlapTable({ title, rows, relation, playerA, playerB, accent }) {
  return (
    <Panel eyebrow={relation} title={title} subtitle="People both compared players have sampled" Icon={relation === 'Common teammates' ? ShieldCheck : Swords} accent={accent}>
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
                <td className="stat-num px-3 py-3 text-right font-black" style={{ color: row.playerA.winRate >= 50 ? GREEN : RED }}>{fmtPct(row.playerA.winRate)}</td>
                <td className="stat-num px-3 py-3 text-right text-white/58">{fmt(row.playerB.matches)} games</td>
                <td className="stat-num px-3 py-3 text-right font-black" style={{ color: row.playerB.winRate >= 50 ? GREEN : RED }}>{fmtPct(row.playerB.winRate)}</td>
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

function SharedMatchesTable({ matches, playerA, playerB }) {
  return (
    <Panel eyebrow="Match ledger" title="Shared matches" subtitle={`${fmt(matches.length)} newest shared samples shown`} Icon={Sparkles} accent={BLUE}>
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
                <td colSpan={7} className="py-10 text-center text-sm text-white/30">These players have not appeared in the same indexed replay yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export default function PlayerCompare() {
  const [players, setPlayers] = useState([])
  const [playersLoading, setPlayersLoading] = useState(true)
  const [playerA, setPlayerA] = useState('')
  const [playerB, setPlayerB] = useState('')
  const [compare, setCompare] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    apiGet('/api/career/players')
      .then((rows) => {
        if (!cancelled) {
          setPlayers(rows)
          setPlayerA(rows[0]?.playerName ?? '')
          setPlayerB(rows[1]?.playerName ?? '')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load player list.')
      })
      .finally(() => {
        if (!cancelled) setPlayersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!playerA || !playerB || playerA === playerB) return undefined

    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })

    apiGet(`/api/career/compare?playerA=${encodeURIComponent(playerA)}&playerB=${encodeURIComponent(playerB)}`)
      .then((payload) => {
        if (!cancelled) setCompare(payload)
      })
      .catch((err) => {
        if (!cancelled) {
          setCompare(null)
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [playerA, playerB])

  const activeCompare = compare?.playerA?.playerName === playerA && compare?.playerB?.playerName === playerB ? compare : null
  const commonMaps = activeCompare?.commonMaps ?? EMPTY_ARRAY
  const commonTeammates = activeCompare?.peerOverlap?.teammates ?? EMPTY_ARRAY
  const commonOpponents = activeCompare?.peerOverlap?.opponents ?? EMPTY_ARRAY
  const sharedMatches = activeCompare?.sharedMatches ?? EMPTY_ARRAY
  const needsSecondPlayer = !playersLoading && players.length < 2
  const samePlayer = Boolean(playerA && playerB && playerA === playerB)
  const isLoading = playersLoading || loading || Boolean(playerA && playerB && !activeCompare && !error && !samePlayer)

  return (
    <div className="anim-fade-in">
      <PageHeader
        gradient={COMPARE_HEADER_GRADIENT}
        eyebrow="Player comparison lab"
        EyebrowIcon={GitCompareArrows}
        eyebrowColor={PURPLE}
        title="Player Compare"
        description="Compare two indexed players across career stats, shared matches, map splits and roster overlap."
      >
        <ComparePicker
          players={players}
          playerA={playerA}
          playerB={playerB}
          onPlayerA={setPlayerA}
          onPlayerB={setPlayerB}
          totalShared={activeCompare?.summary?.sharedMatches ?? 0}
        />

        {activeCompare && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <HeroMetric label="Shared Matches" value={fmt(activeCompare.summary.sharedMatches)} detail={`${fmt(activeCompare.summary.sameTeamMatches)} with, ${fmt(activeCompare.summary.oppositeTeamMatches)} against`} color={BLUE} Icon={Activity} />
            <HeroMetric label="Together W%" value={fmtPct(activeCompare.summary.togetherWinRate)} detail={`${fmt(activeCompare.summary.winsTogether)} wins as teammates`} color={GREEN} Icon={ShieldCheck} />
            <HeroMetric label={`${shortName(playerA, 9)} vs ${shortName(playerB, 9)}`} value={`${fmt(activeCompare.summary.playerAWinsVsB)}-${fmt(activeCompare.summary.playerBWinsVsA)}`} detail={`${fmt(activeCompare.summary.drawsVs)} draws head-to-head`} color={RED} Icon={Swords} />
            <HeroMetric label="Common Maps" value={fmt(commonMaps.length)} detail="union of career map samples" color={PURPLE} Icon={MapIcon} />
            <HeroMetric label="Peer Overlap" value={fmt(commonTeammates.length + commonOpponents.length)} detail={`${fmt(commonTeammates.length)} teammates, ${fmt(commonOpponents.length)} opponents`} color={GOLD} Icon={Users} />
          </div>
        )}
      </PageHeader>

      {isLoading && (
        <EmptyState title="Loading player comparison" detail="Building career, shared-match, map and roster overlap splits..." tone={BLUE} />
      )}

      {!isLoading && needsSecondPlayer && (
        <EmptyState title="Need two players" detail="Import replays with at least two non-bot players to use Player Compare." tone={GOLD} />
      )}

      {!isLoading && samePlayer && (
        <EmptyState title="Choose two different players" detail="Player Compare needs two distinct player profiles." tone={GOLD} />
      )}

      {!isLoading && error && !samePlayer && (
        <EmptyState title="Comparison unavailable" detail={error} tone={RED} />
      )}

      {activeCompare && !isLoading && !error && !samePlayer && (
        <main className="mx-auto max-w-7xl space-y-6 px-8 py-8">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <PlayerCard player={activeCompare.playerA} color={BLUE} side="Player A" />
            <PlayerCard player={activeCompare.playerB} color={PURPLE} side="Player B" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <SharedSummary data={activeCompare} />
            <SharedScoreChart data={activeCompare} />
          </div>

          <StatDuelTable playerA={activeCompare.playerA} playerB={activeCompare.playerB} />

          <MapCompare rows={commonMaps} playerA={playerA} playerB={playerB} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <OverlapTable title="Common teammate overlap" rows={commonTeammates} relation="Common teammates" playerA={playerA} playerB={playerB} accent={GREEN} />
            <OverlapTable title="Common opponent overlap" rows={commonOpponents} relation="Common opponents" playerA={playerA} playerB={playerB} accent={RED} />
          </div>

          <SharedMatchesTable matches={sharedMatches} playerA={playerA} playerB={playerB} />
        </main>
      )}
    </div>
  )
}
