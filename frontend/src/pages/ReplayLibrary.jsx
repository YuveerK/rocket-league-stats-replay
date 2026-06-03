import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AnalysisProgress from '@/components/AnalysisProgress'
import { apiGet } from '@/services/apiClient'
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  FolderOpen,
  Map as MapIcon,
  Play,
  RefreshCcw,
  Search,
  Target,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react'

function formatDuration(seconds) {
  if (typeof seconds !== 'number') return 'Unknown'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function replayDate(replay) {
  if (typeof replay.matchStartEpoch === 'number') {
    return new Date(replay.matchStartEpoch * 1000)
  }

  if (replay.date) {
    const normalized = replay.date.replace(
      /^(\d{4})-(\d{2})-(\d{2}) (\d{2})-(\d{2})-(\d{2})$/,
      '$1-$2-$3T$4:$5:$6',
    )
    const parsed = new Date(normalized)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  const modified = new Date(replay.modifiedAt)
  return Number.isNaN(modified.getTime()) ? null : modified
}

function dateInputBoundary(value, endOfDay = false) {
  if (!value) return null

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null

  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day)

  const time = date.getTime()
  return Number.isNaN(time) ? null : time
}

function formatDate(replay) {
  const date = replayDate(replay)
  if (!date) return 'Unknown date'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(replay) {
  const date = replayDate(replay)
  if (!date) return ''
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fileSize(bytes) {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

function replayTitle(replay) {
  return replay.replayName || replay.fileName?.replace(/\.replay$/i, '') || 'Replay'
}

function teamPlayers(replay, team) {
  return (replay.players ?? []).filter((player) => player.team === team)
}

function resultForPrimaryPlayer(replay) {
  if (replay.primaryPlayerTeam === null || replay.primaryPlayerTeam === undefined) return null
  if (replay.winningTeam === null || replay.winningTeam === undefined) return null
  return replay.primaryPlayerTeam === replay.winningTeam ? 'WIN' : 'LOSS'
}

function scorerSummary(replay) {
  const counts = new Map()
  for (const goal of replay.goals ?? []) {
    counts.set(goal.playerName, (counts.get(goal.playerName) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
}

function searchableText(replay) {
  return [
    replay.fileName,
    replay.replayName,
    replay.replayId,
    replay.mapName,
    replay.mapDisplayName,
    replay.matchType,
    replay.primaryPlayerName,
    `${replay.team0Score}-${replay.team1Score}`,
    ...(replay.players ?? []).map((player) => player.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function StatTile({ label, value, icon: Icon, color }) {
  return (
    <div
      className="rounded-2xl border p-4 overflow-hidden relative"
      style={{
        background: `linear-gradient(145deg, ${color}17, rgba(255,255,255,0.035))`,
        borderColor: `${color}30`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 50px ${color}0F`,
      }}
    >
      <div
        className="absolute -right-5 -top-5 h-20 w-20 rounded-full blur-2xl"
        style={{ background: `${color}30` }}
      />
      <div className="relative flex items-center justify-between">
        <p className="section-label">{label}</p>
        <Icon size={15} style={{ color }} />
      </div>
      <p className="relative mt-3 text-3xl font-black stat-num text-white">{value}</p>
    </div>
  )
}

function Badge({ children, tone = 'neutral' }) {
  const styles = {
    neutral: 'bg-white/[0.06] text-white/55 border-white/[0.09]',
    blue: 'bg-blue-500/12 text-blue-200 border-blue-400/20',
    orange: 'bg-orange-500/12 text-orange-200 border-orange-400/20',
    green: 'bg-emerald-500/12 text-emerald-200 border-emerald-400/20',
    yellow: 'bg-yellow-500/12 text-yellow-200 border-yellow-400/20',
    red: 'bg-rose-500/12 text-rose-200 border-rose-400/20',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] uppercase ${styles[tone]}`}>
      {children}
    </span>
  )
}

function PlayerPill({ player }) {
  const color = player.team === 0 ? '#60a5fa' : '#fb923c'
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.045] px-2 py-1 text-xs text-white/70">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
      <span className="truncate">{player.name}</span>
      <span className="text-white/28 stat-num">{player.goals}G</span>
    </span>
  )
}

function ReplayCard({ replay, selected, onSelect, onAnalyze }) {
  const result = resultForPrimaryPlayer(replay)
  const bluePlayers = teamPlayers(replay, 0)
  const orangePlayers = teamPlayers(replay, 1)
  const scorers = scorerSummary(replay)

  return (
    <button
      type="button"
      onClick={() => onSelect(replay)}
      className="group w-full text-left rounded-2xl border p-4 transition-all duration-200"
      style={{
        background: selected
          ? 'linear-gradient(135deg, rgba(59,130,246,0.16), rgba(251,146,60,0.10) 58%, rgba(255,255,255,0.045))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025))',
        borderColor: selected ? 'rgba(96,165,250,0.42)' : 'rgba(255,255,255,0.08)',
        boxShadow: selected ? '0 24px 70px rgba(37,99,235,0.16)' : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {replay.current && <Badge tone="green">Current</Badge>}
            {replay.analyzed && <Badge tone="blue">Indexed</Badge>}
            {replay.overtime && <Badge tone="yellow">OT</Badge>}
            {replay.forfeit && <Badge tone="red">Forfeit</Badge>}
            {result && <Badge tone={result === 'WIN' ? 'green' : 'red'}>{result}</Badge>}
          </div>
          <h3 className="mt-3 truncate text-lg font-black tracking-tight text-white">
            {replayTitle(replay)}
          </h3>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/42">
            <span className="inline-flex items-center gap-1.5"><Calendar size={12} /> {formatDate(replay)}</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={12} /> {formatTime(replay)}</span>
            <span className="inline-flex items-center gap-1.5"><MapIcon size={12} /> {replay.mapDisplayName ?? replay.mapName ?? 'Unknown map'}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="flex items-center gap-2 text-3xl font-black stat-num leading-none">
            <span className="text-blue-300">{replay.team0Score ?? '-'}</span>
            <span className="text-white/18">-</span>
            <span className="text-orange-300">{replay.team1Score ?? '-'}</span>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/30">
            {formatDuration(replay.totalSecondsPlayed)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-blue-400/10 bg-blue-500/[0.045] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200/70">Blue</span>
            <span className="text-xs text-white/28">{bluePlayers.length} players</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bluePlayers.map((player) => <PlayerPill key={player.name} player={player} />)}
            {bluePlayers.length === 0 && <span className="text-xs text-white/25">No team data</span>}
          </div>
        </div>

        <div className="rounded-xl border border-orange-400/10 bg-orange-500/[0.045] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200/70">Orange</span>
            <span className="text-xs text-white/28">{orangePlayers.length} players</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {orangePlayers.map((player) => <PlayerPill key={player.name} player={player} />)}
            {orangePlayers.length === 0 && <span className="text-xs text-white/25">No team data</span>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-white/38">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1">
            <Target size={12} /> {replay.goalCount ?? 0} goals
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1">
            <Users size={12} /> {replay.players?.length ?? 0} players
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1">
            <Upload size={12} /> {fileSize(replay.size)}
          </span>
          {scorers.map(([name, goals]) => (
            <span key={name} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1">
              <Trophy size={12} className="text-yellow-300" /> {name} {goals}
            </span>
          ))}
        </div>

        <span
          onClick={(event) => {
            event.stopPropagation()
            onAnalyze(replay)
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-colors group-hover:bg-blue-400"
        >
          <Play size={14} />
          Analyze
        </span>
      </div>

      {replay.parseError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertCircle size={13} />
          {replay.parseError}
        </div>
      )}
    </button>
  )
}

function SelectedReplay({ replay, onAnalyze }) {
  if (!replay) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-8 text-center text-white/35">
        Select a replay to inspect its match card.
      </div>
    )
  }

  const bluePlayers = teamPlayers(replay, 0)
  const orangePlayers = teamPlayers(replay, 1)
  const result = resultForPrimaryPlayer(replay)

  return (
    <div
      className="sticky top-6 overflow-hidden rounded-3xl border p-5"
      style={{
        background: 'radial-gradient(circle at 16% 0%, rgba(96,165,250,0.18), transparent 34%), radial-gradient(circle at 88% 4%, rgba(251,146,60,0.16), transparent 32%), linear-gradient(145deg, rgba(13,18,32,0.96), rgba(6,8,17,0.98))',
        borderColor: 'rgba(255,255,255,0.10)',
        boxShadow: '0 30px 90px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-label">Selected Replay</p>
          <h2 className="mt-2 truncate text-2xl font-black tracking-tight text-white">
            {replayTitle(replay)}
          </h2>
          <p className="mt-2 text-sm text-white/40">
            {formatDate(replay)} {formatTime(replay)} - {replay.mapDisplayName ?? replay.mapName ?? 'Unknown map'}
          </p>
        </div>
        {replay.current && (
          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/12 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-200">
            Live
          </span>
        )}
      </div>

      <div className="my-6 flex items-center justify-center gap-5">
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200/70">Blue</p>
          <p className="text-7xl font-black leading-none text-blue-300 stat-num" style={{ textShadow: '0 0 40px rgba(96,165,250,0.45)' }}>
            {replay.team0Score ?? '-'}
          </p>
        </div>
        <div className="text-3xl font-thin text-white/20">-</div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-200/70">Orange</p>
          <p className="text-7xl font-black leading-none text-orange-300 stat-num" style={{ textShadow: '0 0 40px rgba(251,146,60,0.45)' }}>
            {replay.team1Score ?? '-'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3">
          <p className="section-label">Duration</p>
          <p className="mt-2 text-xl font-black text-white stat-num">{formatDuration(replay.totalSecondsPlayed)}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3">
          <p className="section-label">Result</p>
          <p className="mt-2 text-xl font-black text-white">{result ?? 'Unknown'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {replay.overtime && <Badge tone="yellow">Overtime</Badge>}
        {replay.forfeit && <Badge tone="red">Forfeit</Badge>}
        {replay.analyzed && <Badge tone="blue"><CheckCircle size={12} /> Indexed</Badge>}
        <Badge>{replay.matchType ?? 'Replay'}</Badge>
        <Badge>{replay.teamSize ? `${replay.teamSize}v${replay.teamSize}` : `${replay.players?.length ?? 0} players`}</Badge>
      </div>

      <div className="mt-5 grid gap-3">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200/60">Blue roster</p>
          <div className="flex flex-wrap gap-1.5">
            {bluePlayers.map((player) => <PlayerPill key={player.name} player={player} />)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-orange-200/60">Orange roster</p>
          <div className="flex flex-wrap gap-1.5">
            {orangePlayers.map((player) => <PlayerPill key={player.name} player={player} />)}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAnalyze(replay)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-blue-500/20 transition-colors hover:bg-blue-400"
      >
        <Play size={16} />
        Analyze this replay
      </button>
    </div>
  )
}

export default function ReplayLibrary() {
  const navigate = useNavigate()
  const [library, setLibrary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [analysisJob, setAnalysisJob] = useState(null)

  const loadReplays = useCallback((force = false) => {
    if (force) setRefreshing(true)
    else setLoading(true)

    apiGet(`/api/replays${force ? '?refresh=1' : ''}`)
      .then((data) => {
        setLibrary(data)
        setError(null)
        setSelectedId((current) => current ?? data.replays.find((replay) => replay.current)?.fileName ?? data.replays[0]?.fileName ?? null)
      })
      .catch((err) => {
        setError(String(err))
        setLibrary(null)
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    loadReplays(false)
  }, [loadReplays])

  const replays = library?.replays ?? []
  const filteredReplays = useMemo(() => {
    const text = query.trim().toLowerCase()
    const fromTime = dateInputBoundary(dateFrom)
    const toTime = dateInputBoundary(dateTo, true)

    return replays
      .filter((replay) => {
        if (text && !searchableText(replay).includes(text)) return false

        if (fromTime !== null || toTime !== null) {
          const replayTime = replayDate(replay)?.getTime()
          if (!Number.isFinite(replayTime)) return false
          if (fromTime !== null && replayTime < fromTime) return false
          if (toTime !== null && replayTime > toTime) return false
        }

        if (filter === 'current') return replay.current
        if (filter === 'analyzed') return replay.analyzed
        if (filter === 'overtime') return replay.overtime
        if (filter === 'forfeit') return replay.forfeit
        if (filter === 'standard') return !replay.overtime && !replay.forfeit
        return true
      })
      .sort((a, b) => {
        if (sort === 'oldest') return (replayDate(a)?.getTime() ?? 0) - (replayDate(b)?.getTime() ?? 0)
        if (sort === 'duration') return (b.totalSecondsPlayed ?? 0) - (a.totalSecondsPlayed ?? 0)
        if (sort === 'goals') return (b.goalCount ?? 0) - (a.goalCount ?? 0)
        if (sort === 'score') return ((b.team0Score ?? 0) + (b.team1Score ?? 0)) - ((a.team0Score ?? 0) + (a.team1Score ?? 0))
        return (replayDate(b)?.getTime() ?? 0) - (replayDate(a)?.getTime() ?? 0)
      })
  }, [dateFrom, dateTo, filter, query, replays, sort])

  const selectedReplay = useMemo(() => {
    return (
      filteredReplays.find((replay) => replay.fileName === selectedId) ??
      filteredReplays[0] ??
      null
    )
  }, [filteredReplays, selectedId])

  const handleAnalyze = useCallback((replay) => {
    setAnalysisJob({
      replayPath: replay.replayPath,
      replayName: replayTitle(replay),
    })
  }, [])

  const handleAnalysisComplete = useCallback(() => {
    setAnalysisJob(null)
    loadReplays(true)
    navigate('/')
  }, [loadReplays, navigate])

  const clearFilters = () => {
    setQuery('')
    setFilter('all')
    setSort('newest')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="anim-fade-in min-h-screen">
      {analysisJob && (
        <AnalysisProgress
          replayPath={analysisJob.replayPath}
          replayName={analysisJob.replayName}
          onComplete={handleAnalysisComplete}
        />
      )}

      <header
        className="relative overflow-hidden border-b border-white/[0.06]"
        style={{
          background: 'radial-gradient(circle at 18% -12%, rgba(96,165,250,0.28), transparent 34%), radial-gradient(circle at 88% 0%, rgba(251,146,60,0.18), transparent 30%), linear-gradient(135deg,#080b16 0%,#05070f 58%,#080b16 100%)',
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-8 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs text-white/45">
                <FolderOpen size={13} className="text-blue-300" />
                Replay library
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">Choose Your Replay</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/38">
                Search by player, map, scoreline or match state, then analyze the exact replay you want.
              </p>
              {library?.sourceDir && (
                <p className="mt-2 max-w-3xl truncate text-xs text-white/28">
                  Source folder: {library.sourceDir}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => loadReplays(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.055] px-3 py-2 text-sm font-bold text-white/70 transition-colors hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh index
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-4">
            <StatTile label="Replays" value={library?.summary?.total ?? '-'} icon={FolderOpen} color="#60a5fa" />
            <StatTile label="Analyzed" value={library?.summary?.analyzed ?? '-'} icon={CheckCircle} color="#34d399" />
            <StatTile label="Overtime" value={library?.summary?.overtime ?? '-'} icon={Clock} color="#facc15" />
            <StatTile label="Maps" value={library?.summary?.maps ?? '-'} icon={MapIcon} color="#a78bfa" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-8 py-8 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 space-y-5">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/28" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search player, map, replay ID or score..."
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/24 focus:border-blue-300/40"
                />
              </label>

              <label className="relative block">
                <Filter size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/28" />
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="h-12 w-full appearance-none rounded-2xl border border-white/[0.08] bg-black/20 pl-10 pr-4 text-sm font-bold text-white/72 outline-none focus:border-blue-300/40"
                >
                  <option value="all">All replays</option>
                  <option value="current">Current</option>
                  <option value="analyzed">Analyzed</option>
                  <option value="overtime">Overtime</option>
                  <option value="forfeit">Forfeit</option>
                  <option value="standard">Standard</option>
                </select>
              </label>

              <label className="relative block">
                <Activity size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/28" />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="h-12 w-full appearance-none rounded-2xl border border-white/[0.08] bg-black/20 pl-10 pr-4 text-sm font-bold text-white/72 outline-none focus:border-blue-300/40"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="duration">Longest</option>
                  <option value="goals">Most goals</option>
                  <option value="score">Highest scoreline</option>
                </select>
              </label>

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm font-bold text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white/75"
              >
                <X size={14} />
                Clear
              </button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[180px_180px_minmax(0,1fr)]">
              <label className="relative block">
                <Calendar size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/28" />
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                  aria-label="Replay date from"
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-black/20 pl-10 pr-4 text-sm font-bold text-white/72 outline-none [color-scheme:dark] focus:border-blue-300/40"
                />
              </label>

              <label className="relative block">
                <Calendar size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/28" />
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  aria-label="Replay date to"
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-black/20 pl-10 pr-4 text-sm font-bold text-white/72 outline-none [color-scheme:dark] focus:border-blue-300/40"
                />
              </label>

              <div className="flex h-12 items-center rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-white/45">
                Showing <span className="mx-1 font-black text-white/75">{filteredReplays.length}</span> of {replays.length} replays
              </div>
            </div>
          </div>

          {loading && (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-10 text-center">
              <RefreshCcw size={22} className="mx-auto mb-3 animate-spin text-blue-300" />
              <p className="font-bold text-white">Indexing replay headers...</p>
              <p className="mt-1 text-sm text-white/35">This is fast after the first cache pass.</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle size={17} />
                Replay library failed
              </div>
              <p className="mt-2 text-sm text-rose-100/75">{error}</p>
            </div>
          )}

          {!loading && !error && replays.length === 0 && (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-10 text-center">
              <FolderOpen size={24} className="mx-auto mb-3 text-white/30" />
              <p className="font-bold text-white">No replay files found.</p>
              <p className="mx-auto mt-2 max-w-xl text-sm text-white/35">
                Save or move Rocket League replays into {library?.sourceDir ?? 'your DemosEpic folder'}, then refresh the index.
              </p>
            </div>
          )}

          {!loading && !error && replays.length > 0 && filteredReplays.length === 0 && (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-10 text-center">
              <Search size={22} className="mx-auto mb-3 text-white/30" />
              <p className="font-bold text-white">No replays match those filters.</p>
              <button type="button" onClick={clearFilters} className="mt-4 rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-bold text-white/65">
                Reset filters
              </button>
            </div>
          )}

          <div className="space-y-3">
            {filteredReplays.map((replay) => {
              const key = replay.fileName
              return (
                <ReplayCard
                  key={key}
                  replay={replay}
                  selected={selectedReplay?.fileName === key}
                  onSelect={(nextReplay) => setSelectedId(nextReplay.fileName)}
                  onAnalyze={handleAnalyze}
                />
              )
            })}
          </div>
        </section>

        <aside>
          <SelectedReplay replay={selectedReplay} onAnalyze={handleAnalyze} />
        </aside>
      </main>
    </div>
  )
}
