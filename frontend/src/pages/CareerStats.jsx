import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  BarChart3,
  BatteryCharging,
  CalendarDays,
  ChevronDown,
  Crosshair,
  Filter,
  Layers,
  Map as MapIcon,
  Shield,
  ShieldAlert,
  Star,
  Target,
  Trophy,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { apiGet } from '@/services/apiClient'
import { PageHeader } from '@/components/layout/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { BLUE, GOLD, GREEN, ORANGE, PURPLE, RED } from '@/lib/colors'
import { fmt, fmtPct, n, shortName } from '@/lib/formatters'
import { formatReplayDate, formatShortReplayDate, mapLabel, playlistLabel } from '@/lib/replayLabels'

const CAREER_HEADER_GRADIENT =
  'radial-gradient(circle at 16% 0%, rgba(96,165,250,0.17), transparent 31%), ' +
  'radial-gradient(circle at 84% 8%, rgba(251,146,60,0.14), transparent 30%), ' +
  'linear-gradient(135deg,#080b16 0%,#05070f 58%,#090d18 100%)'

const RESULT = {
  win:  { label: 'Win',  color: GREEN, bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.22)' },
  loss: { label: 'Loss', color: RED,   bg: 'rgba(244,63,94,0.11)',  border: 'rgba(244,63,94,0.22)' },
  draw: { label: 'Draw', color: '#94a3b8', bg: 'rgba(148,163,184,0.09)', border: 'rgba(148,163,184,0.18)' },
}

const EMPTY_ARRAY = []

function resultTone(result) {
  return RESULT[result] ?? RESULT.draw
}

function SelectPanel({ players, selected, selectedPlayer, onSelect, totalMatches }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl" style={{ background: 'rgba(96,165,250,0.18)' }} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="section-label">Selected player</div>
          <h2 className="mt-2 truncate text-3xl font-black text-white">{selected || 'No player'}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/38">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1">
              <Shield size={12} /> {selectedPlayer?.platform ?? 'Platform unknown'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1">
              <BarChart3 size={12} /> {fmt(totalMatches)} replay sample
            </span>
          </div>
        </div>

        <label className="w-full sm:w-56 sm:shrink-0">
          <span className="mb-2 block text-xs font-bold text-white/35">Player</span>
          <span className="relative block">
            <select
              value={selected}
              onChange={(event) => onSelect(event.target.value)}
              disabled={!players.length}
              className="w-full appearance-none rounded-xl border border-white/[0.1] bg-[#0a0e19] px-3 py-2.5 pr-9 text-sm font-bold text-white outline-none transition focus:border-blue-300/50 disabled:cursor-not-allowed disabled:text-white/25"
            >
              {players.length === 0 && <option value="">No players found</option>}
              {players.map((player) => (
                <option key={player.playerName} value={player.playerName} className="bg-[#0a0e19] text-white">
                  {player.playerName}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35"
            />
          </span>
        </label>
      </div>
    </div>
  )
}

function ResultBadge({ result }) {
  const tone = resultTone(result)
  return (
    <span
      className="inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase"
      style={{ color: tone.color, background: tone.bg, borderColor: tone.border }}
    >
      {tone.label}
    </span>
  )
}

function RecordRing({ summary }) {
  const winRate = Math.max(0, Math.min(100, n(summary.winRate)))
  const degrees = winRate * 3.6

  return (
    <div className="flex flex-col items-center gap-5 md:flex-row">
      <div
        className="grid h-40 w-40 shrink-0 place-items-center rounded-full p-2"
        style={{
          background: `conic-gradient(${GREEN} 0deg ${degrees}deg, rgba(244,63,94,0.58) ${degrees}deg 360deg)`,
          boxShadow: `0 0 42px rgba(52,211,153,0.12), inset 0 0 18px rgba(255,255,255,0.05)`,
        }}
      >
        <div className="grid h-full w-full place-items-center rounded-full border border-white/[0.08] bg-[#080b14]">
          <div className="text-center">
            <div className="stat-num text-4xl font-black text-white">{fmtPct(winRate)}</div>
            <div className="section-label mt-1">Win rate</div>
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-3 gap-4 text-center sm:text-left">
        <div>
          <div className="stat-num text-4xl font-black" style={{ color: GREEN }}>{fmt(summary.wins)}</div>
          <div className="mt-1 text-xs font-bold text-white/35">Wins</div>
        </div>
        <div>
          <div className="stat-num text-4xl font-black" style={{ color: RED }}>{fmt(summary.losses)}</div>
          <div className="mt-1 text-xs font-bold text-white/35">Losses</div>
        </div>
        <div>
          <div className="stat-num text-4xl font-black text-white/65">{fmt(summary.draws)}</div>
          <div className="mt-1 text-xs font-bold text-white/35">Draws</div>
        </div>
      </div>
    </div>
  )
}

function ProgressMetric({ label, value, max = 100, color, suffix = '', detail }) {
  const width = max > 0 ? Math.max(0, Math.min(100, (n(value) / max) * 100)) : 0

  return (
    <div className="border-b border-white/[0.06] py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white/72">{label}</div>
          {detail && <div className="mt-0.5 truncate text-xs text-white/28">{detail}</div>}
        </div>
        <div className="stat-num shrink-0 text-sm font-black text-white">{fmt(value, Number.isInteger(n(value)) ? 0 : 1)}{suffix}</div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, background: color, boxShadow: `0 0 12px ${color}70` }}
        />
      </div>
    </div>
  )
}

function SplitMetric({ label, value, detail, color, Icon }) {
  return (
    <div className="border-b border-white/[0.06] py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={14} style={{ color }} />}
            <span className="text-sm font-bold text-white/72">{label}</span>
          </div>
          {detail && <p className="mt-1 text-xs text-white/30">{detail}</p>}
        </div>
        <div className="stat-num shrink-0 text-2xl font-black" style={{ color }}>{value}</div>
      </div>
    </div>
  )
}

function RecentForm({ matches }) {
  const recent = matches.slice(0, 12).reverse()

  if (!recent.length) {
    return <div className="text-sm text-white/30">No recent matches available.</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="section-label">Last 12</div>
          <h4 className="mt-1 text-sm font-black text-white/85">Recent form</h4>
        </div>
        <span className="text-xs text-white/30">Oldest to newest</span>
      </div>
      <div className="grid grid-cols-6 gap-2 md:grid-cols-12">
        {recent.map((match) => {
          const tone = resultTone(match.result)
          return (
            <div
              key={match.replayId}
              title={`${formatShortReplayDate(match.date)} - ${tone.label} - ${mapLabel(match.mapName)}`}
              className="h-10 rounded-xl border"
              style={{ background: tone.bg, borderColor: tone.border, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05)` }}
            >
              <div className="flex h-full items-center justify-center text-xs font-black" style={{ color: tone.color }}>
                {tone.label.charAt(0)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyState({ title, detail, tone = BLUE }) {
  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-8 text-center">
        <div
          className="mx-auto grid h-12 w-12 place-items-center rounded-xl border"
          style={{ color: tone, background: `${tone}12`, borderColor: `${tone}30` }}
        >
          <Trophy size={20} />
        </div>
        <h2 className="mt-5 text-lg font-black text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/35">{detail}</p>
      </div>
    </div>
  )
}

function ScoreCell({ match }) {
  return (
    <span className="font-mono text-xs text-white/65">
      {match.myTeam === 0 ? (
        <>
          <span style={{ color: BLUE }}>{match.team0Score ?? '-'}</span>
          <span className="mx-1 text-white/20">-</span>
          {match.team1Score ?? '-'}
        </>
      ) : (
        <>
          {match.team0Score ?? '-'}
          <span className="mx-1 text-white/20">-</span>
          <span style={{ color: ORANGE }}>{match.team1Score ?? '-'}</span>
        </>
      )}
    </span>
  )
}

function CareerFilters({ filterOptions, playlist, mapName, onPlaylist, onMap }) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/35">
        <Filter size={14} className="text-blue-300" />
        Filters
      </div>
      <label className="min-w-[160px]">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/30">Playlist</span>
        <select
          value={playlist}
          onChange={(e) => onPlaylist(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/[0.1] bg-[#0a0e19] px-3 py-2 text-sm font-bold text-white outline-none focus:border-blue-300/50"
        >
          <option value="all">All playlists</option>
          {(filterOptions?.playlists ?? []).map((id) => (
            <option key={id} value={String(id)}>{playlistLabel(id)}</option>
          ))}
        </select>
      </label>
      <label className="min-w-[200px] flex-1">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/30">Map</span>
        <select
          value={mapName}
          onChange={(e) => onMap(e.target.value)}
          className="w-full appearance-none rounded-xl border border-white/[0.1] bg-[#0a0e19] px-3 py-2 text-sm font-bold text-white outline-none focus:border-blue-300/50"
        >
          <option value="all">All maps</option>
          {(filterOptions?.maps ?? []).map((map) => (
            <option key={map} value={map}>{mapLabel(map)}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

function MatchTable({ matches }) {
  if (!matches.length) {
    return <div className="py-10 text-center text-sm text-white/30">No matches found for this player.</div>
  }

  return (
    <div className="max-h-[560px] overflow-auto">
      <table className="w-full min-w-135 text-sm">
        <thead className="sticky top-0 z-10 bg-[#0c0f1a]/95 backdrop-blur">
          <tr className="border-b border-white/[0.06] text-xs font-bold text-white/32">
            <th className="px-3 py-3 text-left">Match</th>
            <th className="px-3 py-3 text-left">Map</th>
            <th className="hidden px-3 py-3 text-left sm:table-cell">Playlist</th>
            <th className="px-3 py-3 text-center">Score</th>
            <th className="px-3 py-3 text-center">Result</th>
            <th className="px-3 py-3 text-right">Pts</th>
            <th className="px-3 py-3 text-right">G</th>
            <th className="px-3 py-3 text-right">A</th>
            <th className="px-3 py-3 text-right">Sv</th>
            <th className="hidden px-3 py-3 text-right sm:table-cell">Sh%</th>
            <th className="hidden px-3 py-3 text-right md:table-cell">BPM</th>
            <th className="hidden px-3 py-3 text-right md:table-cell">Used</th>
            <th className="hidden px-3 py-3 text-right md:table-cell">Pads</th>
            <th className="hidden px-3 py-3 text-right md:table-cell">Demos</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={match.replayId} className="border-b border-white/[0.045] transition-colors hover:bg-white/[0.025]">
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-white/24" />
                  <div>
                    <div className="text-xs font-bold text-white/62">{formatReplayDate(match.date)}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/28">
                      {match.overtime && <span className="font-black" style={{ color: GOLD }}>OT</span>}
                      {match.forfeit && <span className="font-black" style={{ color: RED }}>Forfeit</span>}
                      {!match.overtime && !match.forfeit && <span>Regulation</span>}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-xs font-bold text-white/65">{mapLabel(match.mapName)}</td>
              <td className="hidden px-3 py-3 text-xs text-white/38 sm:table-cell">{playlistLabel(match.playlist)}</td>
              <td className="px-3 py-3 text-center"><ScoreCell match={match} /></td>
              <td className="px-3 py-3 text-center"><ResultBadge result={match.result} /></td>
              <td className="stat-num px-3 py-3 text-right font-black text-white/82">{fmt(match.score)}</td>
              <td className="stat-num px-3 py-3 text-right text-white/70">{fmt(match.goals)}</td>
              <td className="stat-num px-3 py-3 text-right text-white/70">{fmt(match.assists)}</td>
              <td className="stat-num px-3 py-3 text-right text-white/70">{fmt(match.saves)}</td>
              <td className="stat-num hidden px-3 py-3 text-right text-white/48 sm:table-cell">{fmt(match.shootingPercentage, 0)}%</td>
              <td className="stat-num hidden px-3 py-3 text-right text-white/48 md:table-cell">{fmt(match.bpm, 0)}</td>
              <td className="stat-num hidden px-3 py-3 text-right text-white/45 md:table-cell">{fmt(match.boostUsed, 0)}</td>
              <td className="stat-num hidden px-3 py-3 text-right text-sky-300/80 md:table-cell">{fmt((match.bigPads ?? 0) + (match.smallPads ?? 0))}</td>
              <td className="stat-num hidden px-3 py-3 text-right text-rose-300/80 md:table-cell">{match.netDemos > 0 ? `+${fmt(match.netDemos)}` : fmt(match.netDemos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function summarizeCareer(matches, mapStats) {
  const lastTen = matches.slice(0, 10)
  const lastTenWins = lastTen.filter((match) => match.result === 'win').length
  const firstResult = matches[0]?.result
  const streakCount = firstResult
    ? matches.findIndex((match) => match.result !== firstResult)
    : 0
  const streak = firstResult
    ? (streakCount === -1 ? matches.length : streakCount)
    : 0
  const bestMatch = matches.reduce((best, match) => n(match.score) > n(best?.score) ? match : best, null)
  const bestMap = [...mapStats]
    .filter((map) => map.matches >= 2)
    .sort((a, b) => b.winRate - a.winRate || b.matches - a.matches)[0] ?? mapStats[0]
  const favoriteMap = mapStats[0]

  return {
    lastTenLabel: `${lastTenWins}-${Math.max(0, lastTen.length - lastTenWins)}`,
    lastTenWinRate: lastTen.length ? Math.round((lastTenWins / lastTen.length) * 100) : 0,
    streakLabel: firstResult ? `${streak} ${resultTone(firstResult).label}${streak === 1 ? '' : 's'}` : 'No streak',
    streakColor: firstResult ? resultTone(firstResult).color : '#94a3b8',
    bestMatch,
    bestMap,
    favoriteMap,
  }
}

export default function CareerStats() {
  const [players, setPlayers] = useState([])
  const [playersLoading, setPlayersLoading] = useState(true)
  const [selected, setSelected] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [playlistFilter, setPlaylistFilter] = useState('all')
  const [mapFilter, setMapFilter] = useState('all')

  useEffect(() => {
    let cancelled = false

    apiGet('/api/career/players')
      .then((data) => {
        if (!cancelled) {
          setPlayers(data)
          if (data.length > 0) setSelected(data[0].playerName)
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
    if (!selected) return

    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })

    const params = new URLSearchParams({ player: selected })
    if (playlistFilter !== 'all') params.set('playlist', playlistFilter)
    if (mapFilter !== 'all') params.set('map', mapFilter)
    apiGet(`/api/career/stats?${params}`)
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setStats(null)
          setError(err.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selected, playlistFilter, mapFilter])

  const selectedPlayer = useMemo(
    () => players.find((player) => player.playerName === selected),
    [players, selected],
  )
  const activeStats = stats?.playerName === selected ? stats : null
  const summary = activeStats?.summary
  const matches = activeStats?.matches ?? EMPTY_ARRAY
  const mapStats = activeStats?.mapStats ?? EMPTY_ARRAY
  const trend = activeStats?.trend ?? EMPTY_ARRAY
  const isLoading = playersLoading || loading || Boolean(selected && !summary && !error)

  const career = useMemo(() => summarizeCareer(matches, mapStats), [matches, mapStats])
  const trendRows = useMemo(() => trend.map((row) => ({
    ...row,
    match: `#${row.index}`,
    map: mapLabel(row.mapName),
    score: n(row.score),
    goals: n(row.goals),
    saves: n(row.saves),
    winRate: n(row.winRate),
  })), [trend])
  const boostTrendRows = useMemo(() => (activeStats?.boostTrend ?? []).map((row) => ({
    ...row,
    match: `#${row.index}`,
    padTotal: n(row.pickups),
  })), [activeStats])

  const mapRows = useMemo(() => mapStats.slice(0, 8).map((map) => ({
    ...map,
    label: shortName(mapLabel(map.mapName), 20),
    fullLabel: mapLabel(map.mapName),
  })), [mapStats])

  const goalContrib = summary ? n(summary.avgGoals) + n(summary.avgAssists) : 0
  const totalContrib = summary ? n(summary.totalGoals) + n(summary.totalAssists) : 0

  return (
    <div className="anim-fade-in">
      <PageHeader
        gradient={CAREER_HEADER_GRADIENT}
        eyebrow="Cross-replay command center"
        EyebrowIcon={Trophy}
        eyebrowColor={GOLD}
        title="Career Stats"
        description="Long-run form, scoring profile, map splits and match history for the selected player."
      >
        <SelectPanel
          players={players}
          selected={selected}
          selectedPlayer={selectedPlayer}
          onSelect={setSelected}
          totalMatches={summary?.totalMatches ?? 0}
        />

        {summary && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <HeroMetric label="Matches" value={fmt(summary.totalMatches)} detail="career sample size" color={BLUE} Icon={Activity} />
            <HeroMetric label="Win Rate" value={fmtPct(summary.winRate)} detail={`${fmt(summary.wins)} wins, ${fmt(summary.losses)} losses`} color={GREEN} Icon={Trophy} />
            <HeroMetric label="Goal Involvement" value={fmt(totalContrib)} detail={`${fmt(goalContrib, 2)} per match`} color={ORANGE} Icon={Target} />
            <HeroMetric label="Avg Score" value={fmt(summary.avgScore, 1)} detail={`${fmt(summary.totalScore)} total points`} color={GOLD} Icon={Star} />
            <HeroMetric label="Last 10" value={career.lastTenLabel} detail={`${fmtPct(career.lastTenWinRate)} recent win rate`} color={PURPLE} Icon={TrendingUp} />
          </div>
        )}
      </PageHeader>

      {isLoading && (
        <EmptyState title="Loading career stats" detail="Building the player profile from indexed replays..." tone={BLUE} />
      )}

      {!isLoading && error && (
        <EmptyState title="Career stats unavailable" detail={error} tone={RED} />
      )}

      {!isLoading && !error && !summary && (
        <EmptyState title="No career data yet" detail="Import and index replays with player data to populate this view." tone={GOLD} />
      )}

      {summary && !isLoading && !error && (
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
          <CareerFilters
            filterOptions={activeStats?.filterOptions}
            playlist={playlistFilter}
            mapName={mapFilter}
            onPlaylist={setPlaylistFilter}
            onMap={setMapFilter}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroMetric label="Boost used / match" value={fmt(summary.avgBoostUsed, 1)} detail={`${fmt(summary.totalBoostUsed)} total units`} color={ORANGE} Icon={BatteryCharging} />
            <HeroMetric label="Pad pickups / match" value={fmt(summary.avgPickups, 1)} detail={`${fmt(summary.totalBigPads)} big · ${fmt(summary.totalSmallPads)} small`} color={BLUE} Icon={Layers} />
            <HeroMetric label="Demo differential" value={summary.netDemos > 0 ? `+${fmt(summary.netDemos)}` : fmt(summary.netDemos)} detail={`${fmt(summary.totalKills)} inflicted · ${fmt(summary.totalDeaths)} taken`} color={RED} Icon={ShieldAlert} />
            <HeroMetric label="Boost stolen / match" value={fmt(summary.avgBoostStolen, 1)} detail={`${fmt(summary.totalBoostStolen)} stolen pad events`} color={GOLD} Icon={Zap} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
            <Panel
              eyebrow="Form curve"
              title="Score, goals and cumulative win rate"
              subtitle={`${fmt(trendRows.length)} matches tracked`}
              Icon={TrendingUp}
              accent={BLUE}
            >
              <div className="space-y-5">
                <RecentForm matches={matches} />
                <MeasuredChart height={340}>
                  {({ width, height }) => (
                    <ComposedChart width={width} height={height} data={trendRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="careerScoreFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={BLUE} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="match"
                        tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="score"
                        tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={38}
                      />
                      <YAxis
                        yAxisId="percent"
                        orientation="right"
                        domain={[0, 100]}
                        tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={34}
                      />
                      <Tooltip content={<ChartTooltip formatter={(value) => fmt(value, 1)} />} />
                      <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, paddingTop: 10 }} />
                      <Area yAxisId="score" type="monotone" dataKey="score" name="Score" stroke={BLUE} strokeWidth={2.5} fill="url(#careerScoreFill)" dot={false} activeDot={{ r: 4 }} />
                      <Bar yAxisId="score" dataKey="goals" name="Goals" fill={ORANGE} radius={[6, 6, 0, 0]} barSize={8} />
                      <Line yAxisId="score" type="monotone" dataKey="saves" name="Saves" stroke={GREEN} strokeWidth={1.7} strokeDasharray="5 4" dot={false} />
                      <Line yAxisId="percent" type="monotone" dataKey="winRate" name="Win Rate %" stroke={GOLD} strokeWidth={2.2} dot={false} />
                    </ComposedChart>
                  )}
                </MeasuredChart>
              </div>
            </Panel>

            <div className="space-y-6">
              <Panel eyebrow="Record" title="Career result mix" Icon={Trophy} accent={GREEN}>
                <RecordRing summary={summary} />
                <div className="mt-5 border-t border-white/[0.06] pt-4">
                  <SplitMetric
                    label="Current streak"
                    value={career.streakLabel}
                    detail="Based on newest matches first"
                    color={career.streakColor}
                    Icon={Zap}
                  />
                  <SplitMetric
                    label="Best score"
                    value={career.bestMatch ? fmt(career.bestMatch.score) : 'N/A'}
                    detail={career.bestMatch ? `${formatShortReplayDate(career.bestMatch.date)} on ${mapLabel(career.bestMatch.mapName)}` : 'No match score recorded'}
                    color={GOLD}
                    Icon={Star}
                  />
                </div>
              </Panel>

              <Panel eyebrow="Production" title="Scoring profile" Icon={Target} accent={ORANGE}>
                <ProgressMetric label="Goals per match" value={summary.avgGoals} max={Math.max(4, summary.avgGoals)} color={ORANGE} detail={`${fmt(summary.totalGoals)} total goals`} />
                <ProgressMetric label="Assists per match" value={summary.avgAssists} max={Math.max(4, summary.avgAssists)} color={PURPLE} detail={`${fmt(summary.totalAssists)} total assists`} />
                <ProgressMetric label="Saves per match" value={summary.avgSaves} max={Math.max(4, summary.avgSaves)} color={GREEN} detail={`${fmt(summary.totalSaves)} total saves`} />
                <ProgressMetric label="Shots per match" value={summary.avgShots} max={Math.max(8, summary.avgShots)} color={BLUE} detail={`${fmt(summary.totalShots)} total shots`} />
                <ProgressMetric label="Shooting percentage" value={summary.avgShootingPct} max={100} suffix="%" color={GOLD} detail="Average replay shooting conversion" />
              </Panel>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Panel
              eyebrow="Map intel"
              title="Map Performance"
              subtitle="Average score, goals and win rate grouped by map"
              Icon={MapIcon}
              accent={PURPLE}
            >
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <MeasuredChart height={Math.max(260, mapRows.length * 38)}>
                  {({ width, height }) => (
                    <BarChart width={width} height={height} data={mapRows} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 8 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={128}
                        tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
                      <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }} />
                      <Bar dataKey="wins" name="Wins" fill={GREEN} radius={[0, 8, 8, 0]} barSize={14} />
                      <Bar dataKey="losses" name="Losses" fill={RED} radius={[0, 8, 8, 0]} barSize={14} />
                    </BarChart>
                  )}
                </MeasuredChart>

                <div className="space-y-4">
                  <SplitMetric
                    label="Best map"
                    value={career.bestMap ? `${fmtPct(career.bestMap.winRate)}` : 'N/A'}
                    detail={career.bestMap ? mapLabel(career.bestMap.mapName) : 'No map split available'}
                    color={GREEN}
                    Icon={Crosshair}
                  />
                  <SplitMetric
                    label="Most played"
                    value={career.favoriteMap ? fmt(career.favoriteMap.matches) : 'N/A'}
                    detail={career.favoriteMap ? mapLabel(career.favoriteMap.mapName) : 'No map split available'}
                    color={PURPLE}
                    Icon={MapIcon}
                  />
                  <SplitMetric
                    label="Map score peak"
                    value={career.bestMap ? fmt(career.bestMap.avgScore, 1) : 'N/A'}
                    detail="Average score on best map"
                    color={GOLD}
                    Icon={Star}
                  />
                </div>
              </div>

              <div className="mt-5 overflow-auto border-t border-white/[0.06] pt-4">
                <table className="w-full min-w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-white/30">
                      <th className="pb-3 text-left">Map</th>
                      <th className="pb-3 text-right">GP</th>
                      <th className="pb-3 text-right">W%</th>
                      <th className="pb-3 text-right">Avg G</th>
                      <th className="pb-3 text-right">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapStats.map((map) => (
                      <tr key={map.mapName} className="border-t border-white/[0.045]">
                        <td className="py-2.5 text-xs font-bold text-white/65">{mapLabel(map.mapName)}</td>
                        <td className="stat-num py-2.5 text-right text-white/50">{fmt(map.matches)}</td>
                        <td className="stat-num py-2.5 text-right font-black" style={{ color: n(map.winRate) >= 50 ? GREEN : RED }}>{fmtPct(map.winRate)}</td>
                        <td className="stat-num py-2.5 text-right text-white/55">{fmt(map.avgGoals, 2)}</td>
                        <td className="stat-num py-2.5 text-right text-white/55">{fmt(map.avgScore, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel eyebrow="Boost economy" title="Boost & pad trends" subtitle="Collected vs used and pad volume over career sample" Icon={BatteryCharging} accent={ORANGE}>
              <MeasuredChart height={300}>
                {({ width, height }) => (
                  <ComposedChart width={width} height={height} data={boostTrendRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="match" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
                    <Tooltip content={<ChartTooltip formatter={(v) => fmt(v, 1)} />} />
                    <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                    <Bar dataKey="boostCollected" name="Collected" fill={GREEN} radius={[5, 5, 0, 0]} barSize={7} />
                    <Bar dataKey="boostUsed" name="Used" fill={ORANGE} radius={[5, 5, 0, 0]} barSize={7} />
                    <Line type="monotone" dataKey="padTotal" name="Pads" stroke={BLUE} strokeWidth={2} dot={false} />
                  </ComposedChart>
                )}
              </MeasuredChart>
            </Panel>

            <Panel eyebrow="Boost and pace" title="Movement & boost profile" Icon={Zap} accent={GOLD}>
              <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                <ProgressMetric label="Boost collected / match" value={summary.avgBoostCollected} max={Math.max(800, summary.avgBoostCollected)} color={GREEN} detail={`${fmt(summary.totalBoostCollected)} total collected`} />
                <ProgressMetric label="Boost used / match" value={summary.avgBoostUsed} max={Math.max(800, summary.avgBoostUsed)} color={ORANGE} detail={`${fmt(summary.totalBoostUsed)} total used`} />
                <ProgressMetric label="Big pads / match" value={summary.avgBigPads} max={Math.max(12, summary.avgBigPads)} color={BLUE} detail={`${fmt(summary.totalBigPads)} career big pads`} />
                <ProgressMetric label="Small pads / match" value={summary.avgSmallPads} max={Math.max(40, summary.avgSmallPads)} color={PURPLE} detail={`${fmt(summary.totalSmallPads)} career small pads`} />
                <ProgressMetric label="Average boost held" value={summary.avgBoost} max={100} suffix="%" color={GOLD} detail="Average boost meter during samples" />
                <ProgressMetric label="Net demos / match" value={summary.avgNetDemos} max={Math.max(5, Math.abs(summary.avgNetDemos))} color={summary.avgNetDemos >= 0 ? GREEN : RED} detail={`${fmt(summary.totalKills)} inflicted · ${fmt(summary.totalDeaths)} taken`} />
              </div>
            </Panel>
          </div>

          <Panel
            eyebrow="Match ledger"
            title="All career matches"
            subtitle={`${fmt(matches.length)} newest-first records`}
            Icon={Shield}
            accent={BLUE}
          >
            <MatchTable matches={matches} />
          </Panel>
        </main>
      )}
    </div>
  )
}
