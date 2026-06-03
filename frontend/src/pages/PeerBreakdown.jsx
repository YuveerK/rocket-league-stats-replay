import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Activity,
  ChevronDown,
  Crosshair,
  Shield,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import { apiGet } from '@/services/apiClient'
import { PageHeader } from '@/components/layout/PageHeader'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { Panel } from '@/components/ui/Panel'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { BLUE, GOLD, GREEN, PURPLE, RED } from '@/lib/colors'
import { fmt, fmtPct, n, shortName } from '@/lib/formatters'
import { formatShortReplayDate, mapLabel } from '@/lib/replayLabels'

const PEER_HEADER_GRADIENT =
  'radial-gradient(circle at 14% 0%, rgba(52,211,153,0.15), transparent 31%), ' +
  'radial-gradient(circle at 86% 8%, rgba(244,63,94,0.13), transparent 30%), ' +
  'linear-gradient(135deg,#080b16 0%,#05070f 58%,#090d18 100%)'

const EMPTY_ARRAY = []

function PlayerSelector({ players, selected, selectedPlayer, onSelect, totalMatches }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl" style={{ background: 'rgba(52,211,153,0.18)' }} />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="section-label">Selected player</div>
          <h2 className="mt-2 truncate text-3xl font-black text-white">{selected || 'No player'}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/38">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1">
              <Shield size={12} /> {selectedPlayer?.platform ?? 'Platform unknown'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1">
              <Activity size={12} /> {fmt(totalMatches)} shared match samples
            </span>
          </div>
        </div>

        <label className="w-full shrink-0 md:w-64">
          <span className="mb-2 block text-xs font-bold text-white/35">Player</span>
          <span className="relative block">
            <select
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
              disabled={!players.length}
              className="w-full appearance-none rounded-xl border border-white/[0.1] bg-[#0a0e19] px-3 py-2.5 pr-9 text-sm font-bold text-white outline-none transition focus:border-emerald-300/50 disabled:cursor-not-allowed disabled:text-white/25"
            >
              {players.length === 0 && <option value="">No players found</option>}
              {players.map((player) => (
                <option key={player.playerName} value={player.playerName} className="bg-[#0a0e19] text-white">
                  {player.playerName}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
          </span>
        </label>
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
          <Users size={20} />
        </div>
        <h2 className="mt-5 text-lg font-black text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/35">{detail}</p>
      </div>
    </div>
  )
}

function PeerSpotlight({ title, peer, icon: Icon, color, fallback }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="section-label">{title}</div>
          <div className="mt-2 truncate text-lg font-black text-white">{peer ? peer.playerName : fallback}</div>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
          style={{ color, background: `${color}12`, borderColor: `${color}30` }}>
          <Icon size={18} />
        </div>
      </div>
      {peer && (
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="stat-num text-xl font-black text-white">{fmt(peer.matches)}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/25">Matches</div>
          </div>
          <div>
            <div className="stat-num text-xl font-black" style={{ color }}>{fmtPct(peer.winRate)}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/25">Win Rate</div>
          </div>
          <div>
            <div className="stat-num text-xl font-black text-white/75">{fmt(peer.avgScore, 1)}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/25">Avg Pts</div>
          </div>
        </div>
      )}
    </div>
  )
}

function PeerBars({ rows, relation }) {
  const topRows = rows.slice(0, 10).map((row) => ({
    ...row,
    short: shortName(row.playerName, 16),
  }))
  const color = relation === 'teammate' ? GREEN : RED

  if (!topRows.length) {
    return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm text-white/35">No peer samples available.</div>
  }

  return (
    <MeasuredChart height={Math.max(260, topRows.length * 36)}>
      {({ width, height }) => (
        <BarChart width={width} height={height} data={topRows} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="short"
            width={124}
            tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
          <Bar dataKey="matches" name="Matches" fill={color} radius={[0, 8, 8, 0]} barSize={15} />
        </BarChart>
      )}
    </MeasuredChart>
  )
}

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

function PeerTable({ title, rows, relation, accent, subtitle }) {
  const relationLabel = relation === 'teammate' ? 'With' : 'Against'

  return (
    <Panel eyebrow={relation === 'teammate' ? 'Teammate splits' : 'Opponent splits'} title={title} subtitle={subtitle} Icon={relation === 'teammate' ? ShieldCheck : Swords} accent={accent}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <PeerBars rows={rows} relation={relation} />

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
                        <div className="mt-0.5 truncate text-[11px] text-white/28">{peer.platform ?? 'Unknown platform'}{peer.isBot ? ' - bot' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="stat-num px-3 py-3 text-right font-black text-white/80">{fmt(peer.matches)}</td>
                  <td className="stat-num px-3 py-3 text-right text-white/55">{fmt(peer.wins)}-{fmt(peer.losses)}{peer.draws ? `-${fmt(peer.draws)}` : ''}</td>
                  <td className="px-3 py-3 text-right"><WinRateBar value={peer.winRate} color={peer.winRate >= 50 ? GREEN : RED} /></td>
                  <td className="stat-num px-3 py-3 text-right font-black text-white/76">{fmt(peer.avgScore, 1)}</td>
                  <td className="stat-num px-3 py-3 text-right text-white/58">{fmt(peer.avgGoals, 2)} / {fmt(peer.avgAssists, 2)} / {fmt(peer.avgSaves, 2)}</td>
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

export default function PeerBreakdown() {
  const [players, setPlayers] = useState([])
  const [playersLoading, setPlayersLoading] = useState(true)
  const [selected, setSelected] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    apiGet('/api/career/players')
      .then((rows) => {
        if (!cancelled) {
          setPlayers(rows)
          if (rows.length > 0) setSelected(rows[0].playerName)
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
    if (!selected) return undefined

    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })

    apiGet(`/api/career/peers?player=${encodeURIComponent(selected)}`)
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null)
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selected])

  const selectedPlayer = useMemo(
    () => players.find((player) => player.playerName === selected),
    [players, selected],
  )
  const activeData = data?.playerName === selected ? data : null
  const summary = activeData?.summary
  const teammates = activeData?.teammates ?? EMPTY_ARRAY
  const opponents = activeData?.opponents ?? EMPTY_ARRAY
  const isLoading = playersLoading || loading || Boolean(selected && !summary && !error)

  const teammateGames = useMemo(() => teammates.reduce((sum, row) => sum + n(row.matches), 0), [teammates])
  const opponentGames = useMemo(() => opponents.reduce((sum, row) => sum + n(row.matches), 0), [opponents])

  return (
    <div className="anim-fade-in">
      <PageHeader
        gradient={PEER_HEADER_GRADIENT}
        eyebrow="Roster relationship matrix"
        EyebrowIcon={Users}
        eyebrowColor={GREEN}
        title="Opponent & Teammate Breakdown"
        description="See who appears with you most often, who you beat most often, and how your own stats shift with each teammate."
      >
        <PlayerSelector
          players={players}
          selected={selected}
          selectedPlayer={selectedPlayer}
          onSelect={setSelected}
          totalMatches={summary?.totalMatches ?? 0}
        />

        {summary && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <HeroMetric label="Matches" value={fmt(summary.totalMatches)} detail="selected player sample" color={BLUE} Icon={Activity} />
            <HeroMetric label="Teammates" value={fmt(summary.uniqueTeammates)} detail={`${fmt(teammateGames)} teammate pairings`} color={GREEN} Icon={ShieldCheck} />
            <HeroMetric label="Opponents" value={fmt(summary.uniqueOpponents)} detail={`${fmt(opponentGames)} opponent pairings`} color={RED} Icon={Swords} />
            <HeroMetric label="Best Teammate" value={summary.bestTeammate ? shortName(summary.bestTeammate.playerName, 12) : 'N/A'} detail={summary.bestTeammate ? `${fmtPct(summary.bestTeammate.winRate)} across ${fmt(summary.bestTeammate.matches)}` : 'No teammate samples'} color={GOLD} Icon={Trophy} />
            <HeroMetric label="Toughest Opponent" value={summary.toughestOpponent ? shortName(summary.toughestOpponent.playerName, 12) : 'N/A'} detail={summary.toughestOpponent ? `${fmtPct(summary.toughestOpponent.winRate)} win rate against` : 'No opponent samples'} color={PURPLE} Icon={Crosshair} />
          </div>
        )}
      </PageHeader>

      {isLoading && (
        <EmptyState title="Loading relationship breakdown" detail="Aggregating same-team and opposite-team samples from indexed replays..." tone={BLUE} />
      )}

      {!isLoading && error && (
        <EmptyState title="Relationship data unavailable" detail={error} tone={RED} />
      )}

      {!isLoading && !error && !summary && (
        <EmptyState title="No peer data yet" detail="Import multi-player replays to populate teammate and opponent splits." tone={GOLD} />
      )}

      {summary && !isLoading && !error && (
        <main className="mx-auto max-w-7xl space-y-6 px-8 py-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <PeerSpotlight title="Most played with" peer={summary.mostPlayedWith} icon={ShieldCheck} color={GREEN} fallback="No teammate" />
            <PeerSpotlight title="Most played against" peer={summary.mostPlayedAgainst} icon={Swords} color={RED} fallback="No opponent" />
            <PeerSpotlight title="Best teammate" peer={summary.bestTeammate} icon={Trophy} color={GOLD} fallback="No teammate" />
            <PeerSpotlight title="Toughest opponent" peer={summary.toughestOpponent} icon={Target} color={PURPLE} fallback="No opponent" />
          </div>

          <PeerTable
            title="Your stats with each teammate"
            rows={teammates}
            relation="teammate"
            accent={GREEN}
            subtitle="Averages are your stats in games where that player was on your team"
          />

          <PeerTable
            title="Your record against each opponent"
            rows={opponents}
            relation="opponent"
            accent={RED}
            subtitle="Win rate is from the selected player's perspective"
          />
        </main>
      )}
    </div>
  )
}
