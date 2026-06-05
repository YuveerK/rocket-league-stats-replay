import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { ResponsiveRadar } from '@nivo/radar'
import FieldHeatmap from '@/components/FieldHeatmap'
import {
  Play, Pause, RotateCcw, Map as MapIcon, TrendingUp,
  Wind, Shield, Crosshair, Layers, Footprints,
} from 'lucide-react'
import { apiGet } from '@/services/apiClient'
import { TEAM_COLORS, TEAM_LABELS } from '@/lib/colors'

// ── Nivo theme ────────────────────────────────────────────────────────────
const NIVO_THEME = {
  background: 'transparent',
  text: { fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'inherit' },
  grid: { line: { stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 } },
  tooltip: {
    container: {
      background: 'rgba(10,12,22,0.97)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      padding: '8px 12px',
      color: '#fff',
      fontSize: 12,
    },
  },
}

const TEAM_COLOR = TEAM_COLORS
const TEAM_LABEL = TEAM_LABELS
const PLAYER_COLORS = [
  '#38bdf8', '#fb923c', '#a78bfa', '#34d399',
  '#f43f5e', '#facc15', '#2dd4bf', '#f472b6',
]

const ZONE_CONFIG = [
  { key: 'defPct',    label: 'Defensive', Icon: Shield,    color: '#60a5fa', group: 'field' },
  { key: 'midPct',    label: 'Midfield',  Icon: TrendingUp,color: '#a78bfa', group: 'field' },
  { key: 'attPct',    label: 'Attacking', Icon: Crosshair, color: '#34d399', group: 'field' },
  { key: 'aerialPct', label: 'Airborne',  Icon: Wind,      color: '#f59e0b', group: 'vertical' },
  { key: 'groundPct', label: 'Ground',    Icon: MapIcon,   color: '#94a3b8', group: 'vertical' },
]

const ZONE_GROUPS = [
  {
    key: 'field',
    label: 'Field Position',
    summary: 'Def + Mid + Att = 100%',
    color: '#60a5fa',
    columns: 'grid-cols-3',
  },
  {
    key: 'vertical',
    label: 'Vertical State',
    summary: 'Ground + Airborne = 100%',
    color: '#f59e0b',
    columns: 'grid-cols-2',
  },
]

const SPEEDS = [0.5, 1, 2, 4]
const TRAIL_DURATIONS = [5, 10, 20, 30]   // seconds

function fmt(s) {
  if (s == null) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function StatPill({ label, value, color, Icon }) {
  return (
    <div className="flex flex-col gap-1.5 p-4 rounded-xl border"
      style={{ background: 'rgba(12,15,26,0.8)', borderColor: `${color}28` }}>
      <div className="flex items-center gap-1.5">
        <Icon size={11} style={{ color }} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-black stat-num" style={{ color }}>{value}</span>
        <span className="text-sm mb-0.5 text-white/25">%</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
      </div>
    </div>
  )
}

export default function Heatmaps() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [selected, setSelected] = useState(null)
  const [visiblePlayers, setVisiblePlayers] = useState([])

  // ── Playback state ───────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying]         = useState(false)
  const [speed, setSpeed]             = useState(1)
  const [mode, setMode]               = useState('cumulative')   // 'cumulative' | 'window'
  const [showTrail, setShowTrail]     = useState(false)
  const [trailSecs, setTrailSecs]     = useState(10)

  const rafRef      = useRef(null)
  const lastTsRef   = useRef(null)
  const playingRef  = useRef(false)
  const speedRef    = useRef(1)
  const duration    = data?.matchDuration ?? 300
  const colorByName = useMemo(() => {
    const entries = (data?.players ?? []).map((p, index) => [
      p.playerName,
      PLAYER_COLORS[index % PLAYER_COLORS.length],
    ])
    return new Map(entries)
  }, [data])

  // Keep refs in sync
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { speedRef.current = speed },     [speed])

  // ── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTsRef.current = null
      return
    }

    const tick = (ts) => {
      if (!playingRef.current) return
      if (lastTsRef.current !== null) {
        const delta = (ts - lastTsRef.current) / 1000 * speedRef.current
        setCurrentTime(prev => {
          const next = prev + delta
          if (next >= duration) {
            setPlaying(false)
            return duration
          }
          return next
        })
      }
      lastTsRef.current = ts
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, duration])

  const reset = useCallback(() => {
    setPlaying(false)
    setCurrentTime(0)
  }, [])

  const handleScrub = useCallback((e) => {
    setCurrentTime(Number(e.target.value))
  }, [])

  // ── Data fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    apiGet('/api/heatmap-data')
      .then(d => {
        setData(d)
        setCurrentTime(d.matchDuration ?? 300)   // start at full heatmap
        setSelected(d.players[0]?.playerName ?? null)
        setVisiblePlayers(d.players[0]?.playerName ? [d.players[0].playerName] : [])
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const togglePlayer = useCallback((playerName) => {
    setVisiblePlayers(prev => {
      if (prev.includes(playerName)) {
        return prev.length === 1 ? prev : prev.filter(name => name !== playerName)
      }
      return [...prev, playerName]
    })
    setSelected(playerName)
  }, [])

  const visiblePlayerList = useMemo(() => {
    const players = data?.players ?? []
    const visible = new Set(visiblePlayers)
    const selectedPlayers = players.filter(p => visible.has(p.playerName))
    return selectedPlayers.length ? selectedPlayers : players.slice(0, 1)
  }, [data, visiblePlayers])

  const heatmapLayers = useMemo(() => visiblePlayerList.map((p) => ({
    id: p.playerName,
    label: p.playerName,
    samples: p.samples,
    color: colorByName.get(p.playerName) ?? TEAM_COLOR[p.team] ?? '#60a5fa',
  })), [colorByName, visiblePlayerList])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-white/30 text-sm">
      Loading heatmap data…
    </div>
  )
  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  )

  const focusedName = visiblePlayers.includes(selected)
    ? selected
    : visiblePlayerList[0]?.playerName ?? selected
  const player  = data.players.find(p => p.playerName === focusedName) ?? data.players[0]
  if (!player) return null

  const team0      = data.players.filter(p => p.team === 0)
  const team1      = data.players.filter(p => p.team === 1)
  const pColor     = colorByName.get(player.playerName) ?? TEAM_COLOR[player.team] ?? '#60a5fa'
  const scrubPct   = duration > 0 ? (currentTime / duration) * 100 : 0

  const maxTime    = currentTime
  const minTime    = mode === 'window' ? Math.max(0, currentTime - trailSecs) : 0

  const radarData  = ZONE_CONFIG.map(({ key, label }) => ({
    metric: label,
    [player.playerName]: player.zones[key] ?? 0,
  }))

  return (
    <div className="anim-fade-in">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b" style={{
        borderColor: 'rgba(255,255,255,0.06)',
        background: 'linear-gradient(135deg,rgba(37,99,235,0.08) 0%,#05070f 40%,#05070f 60%,rgba(234,88,12,0.08) 100%)',
      }}>
        <div className="px-8 py-6 max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <p className="section-label mb-1">Positioning</p>
            <h1 className="text-2xl font-black text-white">Player Heatmaps</h1>
            <p className="text-white/35 text-sm mt-1">
              Position density · brighter = more time spent
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500/60 inline-block" />
            <span className="mr-3">Blue</span>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500/60 inline-block" />
            Orange
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">

        {/* ── Player tabs ───────────────────────────────────────────── */}
        <div className="flex gap-1.5 flex-wrap">
          {team0.map(p => (
            <PlayerTab key={p.playerName} player={p} focused={focusedName === p.playerName}
              active={visiblePlayers.includes(p.playerName)}
              color={colorByName.get(p.playerName) ?? TEAM_COLOR[0]}
              onClick={() => togglePlayer(p.playerName)} />
          ))}
          <div className="w-px self-stretch mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
          {team1.map(p => (
            <PlayerTab key={p.playerName} player={p} focused={focusedName === p.playerName}
              active={visiblePlayers.includes(p.playerName)}
              color={colorByName.get(p.playerName) ?? TEAM_COLOR[1]}
              onClick={() => togglePlayer(p.playerName)} />
          ))}
        </div>

        {/* ── Main layout ───────────────────────────────────────────── */}
        <div className="grid grid-cols-[320px_1fr] gap-6 items-start">

          {/* ── Left: Heatmap + Controls ─────────────────────────── */}
          <div className="card p-0 overflow-hidden">
            {/* Player badge */}
            <div className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: pColor, boxShadow: `0 0 8px ${pColor}` }} />
                <span className="font-semibold text-sm text-white/90">{player.playerName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: `${pColor}20`, color: pColor }}>
                  {TEAM_LABEL[player.team]}
                </span>
              </div>
              <span className="text-[10px] text-white/25 stat-num">
                {visiblePlayerList.length} layer{visiblePlayerList.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Canvas */}
            <div className="px-4 pt-4 pb-3" style={{ background: 'rgba(6,8,18,0.95)' }}>
              <FieldHeatmap
                layers={heatmapLayers}
                maxTime={maxTime}
                minTime={minTime}
                currentTime={currentTime}
                teamColor={pColor}
                showTrail={showTrail}
                trailWindowSeconds={trailSecs}
              />
              <p className="mt-2 text-center text-[10px] text-white/30">
                {showTrail ? 'Trail overlay on · toggle off for density only' : 'Brighter areas = more time spent'}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {visiblePlayerList.map(p => {
                  const color = colorByName.get(p.playerName) ?? TEAM_COLOR[p.team] ?? '#60a5fa'
                  return (
                    <button key={p.playerName}
                      onClick={() => setSelected(p.playerName)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                        focusedName === p.playerName ? 'text-white' : 'text-white/45 hover:text-white/70'
                      }`}
                      style={{
                        background: focusedName === p.playerName ? `${color}20` : 'rgba(255,255,255,0.04)',
                        borderColor: focusedName === p.playerName ? `${color}70` : 'rgba(255,255,255,0.08)',
                      }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      {p.playerName}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Playback controls ─────────────────────────────── */}
            <div className="px-4 pb-4 space-y-3" style={{ background: 'rgba(6,8,18,0.95)' }}>

              {/* Scrubber */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  className="scrubber"
                  style={{
                    background: `linear-gradient(to right, ${pColor} 0%, ${pColor} ${scrubPct}%, rgba(255,255,255,0.10) ${scrubPct}%, rgba(255,255,255,0.10) 100%)`,
                  }}
                  min={0}
                  max={duration}
                  step={duration / 500}
                  value={currentTime}
                  onChange={handleScrub}
                />
                <div className="flex justify-between text-[10px] stat-num text-white/30">
                  <span>{fmt(currentTime)}</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>

              {/* Transport row */}
              <div className="flex items-center gap-2">
                {/* Reset */}
                <button onClick={reset}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors">
                  <RotateCcw size={13} />
                </button>

                {/* Play / Pause */}
                <button
                  onClick={() => setPlaying(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: playing ? `${pColor}25` : pColor,
                    color: playing ? pColor : '#fff',
                    border: `1px solid ${pColor}60`,
                    boxShadow: playing ? 'none' : `0 0 14px ${pColor}40`,
                  }}
                >
                  {playing ? <Pause size={13} /> : <Play size={13} />}
                  {playing ? 'Pause' : 'Play'}
                </button>

                {/* Speed */}
                <div className="ml-auto flex items-center gap-1">
                  {SPEEDS.map(s => (
                    <button key={s} onClick={() => setSpeed(s)}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                        speed === s
                          ? 'text-white'
                          : 'text-white/30 hover:text-white/60'
                      }`}
                      style={speed === s ? {
                        background: `${pColor}25`,
                        border: `1px solid ${pColor}50`,
                      } : {}}>
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Density mode */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setMode('cumulative')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    mode === 'cumulative' ? 'text-white' : 'text-white/30 hover:text-white/55'
                  }`}
                  style={mode === 'cumulative' ? {
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  } : {}}
                >
                  <Layers size={11} /> Cumulative
                </button>
                <button
                  onClick={() => setMode('window')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    mode === 'window' ? 'text-white' : 'text-white/30 hover:text-white/55'
                  }`}
                  style={mode === 'window' ? {
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  } : {}}
                >
                  <Layers size={11} /> Recent
                </button>
              </div>

              {/* Trail overlay */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTrail(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    showTrail ? 'text-white' : 'text-white/30 hover:text-white/55'
                  }`}
                  style={showTrail ? {
                    background: `${pColor}25`,
                    border: `1px solid ${pColor}50`,
                  } : {}}
                >
                  <Footprints size={11} /> Trail
                </button>

                {showTrail && (
                  <div className="ml-auto flex items-center gap-1">
                    {TRAIL_DURATIONS.map(s => (
                      <button key={s} onClick={() => setTrailSecs(s)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          trailSecs === s ? 'text-white' : 'text-white/25 hover:text-white/50'
                        }`}
                        style={trailSecs === s ? {
                          background: 'rgba(255,255,255,0.10)',
                          border: '1px solid rgba(255,255,255,0.15)',
                        } : {}}>
                        {s}s
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Radar + Stats ──────────────────────────────── */}
          <div className="space-y-5">

            {/* Radar */}
            <div className="card">
              <div className="card-header">
                <span className="section-label">Positioning Profile</span>
                <span className="text-xs text-white/25">% of match time</span>
              </div>
              <div style={{ height: 290, padding: '8px 0' }}>
                <ResponsiveRadar
                  data={radarData}
                  keys={[player.playerName]}
                  indexBy="metric"
                  maxValue={100}
                  valueFormat=">-.0f"
                  margin={{ top: 38, right: 58, bottom: 38, left: 58 }}
                  curve="linearClosed"
                  borderWidth={2}
                  borderColor={pColor}
                  gridLevels={4}
                  gridShape="circular"
                  gridLabelOffset={14}
                  enableDots={true}
                  dotSize={8}
                  dotColor={pColor}
                  dotBorderWidth={2}
                  dotBorderColor="rgba(5,7,15,0.9)"
                  enableDotLabel={false}
                  colors={[pColor]}
                  fillOpacity={0.15}
                  blendMode="screen"
                  animate={true}
                  theme={NIVO_THEME}
                />
              </div>
              <div className="px-5 pb-4 flex flex-wrap gap-2">
                {ZONE_GROUPS.map(group => (
                  <div key={group.key}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color: group.color,
                      background: `${group.color}12`,
                      borderColor: `${group.color}35`,
                    }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: group.color }} />
                    <span>{group.label}</span>
                    <span className="text-white/25 normal-case tracking-normal">{group.summary}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone pills */}
            <div>
              <p className="section-label mb-3">Zone Breakdown</p>
              <div className="space-y-5">
                {ZONE_GROUPS.map(group => (
                  <section key={group.key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full" style={{ background: group.color }} />
                        <span className="text-xs font-black uppercase tracking-widest text-white/55">
                          {group.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/25">
                        {group.summary}
                      </span>
                    </div>
                    <div className={`grid ${group.columns} gap-2.5`}>
                      {ZONE_CONFIG.filter(({ group: zoneGroup }) => zoneGroup === group.key)
                        .map(({ key, label, Icon, color }) => (
                          <StatPill key={key} label={label}
                            value={player.zones[key] ?? 0}
                            color={color} Icon={Icon} />
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            {/* Comparison table */}
            <div className="card">
              <div className="card-header">
                <span className="section-label">All Players — Zone Comparison</span>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {data.players.map(p => {
                  const pc = colorByName.get(p.playerName) ?? TEAM_COLOR[p.team] ?? '#60a5fa'
                  const isSel = p.playerName === focusedName
                  const isVisible = visiblePlayers.includes(p.playerName)
                  return (
                    <button key={p.playerName}
                      onClick={() => setSelected(p.playerName)}
                      className={`w-full flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/3 ${isSel ? 'bg-white/5' : ''}`}>
                      <div className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          background: pc,
                          boxShadow: isVisible ? `0 0 6px ${pc}` : 'none',
                          opacity: isVisible ? 1 : 0.35,
                        }} />
                      <span className={`text-sm font-medium min-w-0 truncate text-left ${isSel ? 'text-white' : 'text-white/55'}`}>
                        {p.playerName}
                      </span>
                      <div className="ml-auto flex items-center gap-2.5">
                        {[
                          { v: p.zones.defPct, c: '#60a5fa', label: 'D' },
                          { v: p.zones.midPct, c: '#a78bfa', label: 'M' },
                          { v: p.zones.attPct, c: '#34d399', label: 'A' },
                        ].map(({ v, c, label }) => (
                          <div key={label} className="flex flex-col items-center gap-0.5">
                            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
                              <div className="h-full rounded-full" style={{ width: `${v}%`, background: c }} />
                            </div>
                            <span className="text-[9px] stat-num" style={{ color: 'rgba(255,255,255,0.25)' }}>{v}%</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayerTab({ player, active, focused, color, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
        active ? 'text-white' : 'text-white/40 hover:text-white/70'
      }`}
      style={active ? {
        background: `${color}22`,
        borderColor: focused ? `${color}90` : `${color}50`,
        boxShadow: focused ? `0 0 18px ${color}24` : 'none',
      } : { background: 'rgba(12,15,26,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <span className="w-2 h-2 rounded-full shrink-0"
        style={{ background: color, boxShadow: active ? `0 0 6px ${color}` : 'none' }} />
      {player.playerName}
    </button>
  )
}
