import { useLayoutEffect, useRef, useState } from 'react'
import {
  BarChart, Bar, CartesianGrid, Cell, Legend,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { Activity, Crosshair, Medal, ShieldAlert, Sparkles, Trophy } from 'lucide-react'

const BLUE = '#60a5fa'
const ORANGE = '#fb923c'
const TEAM_COLORS = { 0: BLUE, 1: ORANGE }
const TEAM_LABELS = { 0: 'Blue', 1: 'Orange' }

const METRIC_COLORS = {
  shots: '#38bdf8',
  goals: '#34d399',
  assists: '#a78bfa',
  saves: '#facc15',
  goalsConcededWhileDefender: '#f43f5e',
}

function n(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function format(value, suffix = '') {
  const num = n(value)
  return `${Number.isInteger(num) ? num : num.toFixed(1)}${suffix}`
}

function shortName(name) {
  return name?.length > 16 ? `${name.slice(0, 15)}...` : name
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#070a13]/95 px-3 py-2 shadow-2xl">
      <div className="text-xs font-bold text-white/80 mb-1">{label}</div>
      <div className="space-y-1">
        {payload.map(item => (
          <div key={item.dataKey} className="flex items-center justify-between gap-5 text-[11px]">
            <span className="flex items-center gap-1.5 text-white/45">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-bold stat-num text-white/85">{format(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Panel({ eyebrow, title, subtitle, Icon, accent = BLUE, children }) {
  return (
    <section className="card relative overflow-hidden min-w-0">
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div className="card-header">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-9 h-9 rounded-xl border flex items-center justify-center"
              style={{ background: `${accent}14`, borderColor: `${accent}30`, color: accent }}>
              <Icon size={17} />
            </div>
          )}
          <div>
            <div className="section-label">{eyebrow}</div>
            <h3 className="text-base font-black text-white/90 mt-0.5">{title}</h3>
          </div>
        </div>
        {subtitle && <span className="text-xs text-white/30 max-w-xs text-right">{subtitle}</span>}
      </div>
      <div className="p-5 min-w-0">{children}</div>
    </section>
  )
}

function TeamDuelRow({ label, blue, orange, suffix = '' }) {
  const b = n(blue)
  const o = n(orange)
  const total = Math.max(1, b + o)
  const bluePct = (b / total) * 100
  const orangePct = (o / total) * 100

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-widest text-white/40">{label}</span>
        <span className="stat-num text-white/55">
          <span className="text-blue-300">{format(b, suffix)}</span>
          <span className="mx-2 text-white/20">vs</span>
          <span className="text-orange-300">{format(o, suffix)}</span>
        </span>
      </div>
      <div className="relative h-4 rounded-full overflow-hidden bg-white/[0.04] border border-white/[0.06]">
        <div className="absolute left-0 top-0 h-full"
          style={{
            width: `${bluePct}%`,
            background: 'linear-gradient(90deg,#1d4ed8,#60a5fa)',
            boxShadow: '0 0 18px rgba(96,165,250,0.35)',
          }} />
        <div className="absolute right-0 top-0 h-full"
          style={{
            width: `${orangePct}%`,
            background: 'linear-gradient(90deg,#fb923c,#c2410c)',
            boxShadow: '0 0 18px rgba(251,146,60,0.35)',
          }} />
      </div>
    </div>
  )
}

function MeasuredChart({ height, children }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined

    const measure = () => {
      setWidth(Math.max(0, Math.floor(node.getBoundingClientRect().width)))
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="w-full min-w-0" style={{ height }}>
      {width > 0 ? children({ width, height }) : null}
    </div>
  )
}

function HorizontalRankChart({ rows, dataKey, suffix = '', domainMax }) {
  const height = Math.max(230, rows.length * 42)
  const max = domainMax ?? Math.max(1, ...rows.map(row => n(row[dataKey])))

  return (
    <MeasuredChart height={height}>
      {({ width, height }) => (
        <BarChart width={width} height={height} data={rows} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" domain={[0, max]} hide />
          <YAxis type="category" dataKey="shortName" width={118}
            tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700 }}
            axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
          <Bar dataKey={dataKey} name={suffix ? dataKey.replace(/([A-Z])/g, ' $1') : dataKey}
            radius={[0, 8, 8, 0]} barSize={14}
            label={{ position: 'right', fill: 'rgba(255,255,255,0.55)', fontSize: 11, formatter: v => format(v, suffix) }}>
            {rows.map(row => (
              <Cell key={row.playerName} fill={TEAM_COLORS[row.team] ?? '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      )}
    </MeasuredChart>
  )
}

export default function CoreAnalytics({ players = [], teams = {} }) {
  const t0 = teams?.[0] ?? {}
  const t1 = teams?.[1] ?? {}
  const teamScore0 = players.filter(p => p.team === 0).reduce((sum, p) => sum + n(p.score), 0)
  const teamScore1 = players.filter(p => p.team === 1).reduce((sum, p) => sum + n(p.score), 0)

  const teamFundamentals = [
    { metric: 'Shots', Blue: n(t0.shots), Orange: n(t1.shots) },
    { metric: 'Goals', Blue: n(t0.goals), Orange: n(t1.goals) },
    { metric: 'Assists', Blue: n(t0.assists), Orange: n(t1.assists) },
    { metric: 'Saves', Blue: n(t0.saves), Orange: n(t1.saves) },
  ]

  const playerRows = players.map(p => ({
    ...p,
    shortName: shortName(p.playerName),
    demosInflicted: n(p.kills),
    goalsConcededWhileDefender: n(p.goalsConcededWhileDefender),
    shootingPercentage: n(p.shootingPercentage),
    score: n(p.score),
    shots: n(p.shots),
    goals: n(p.goals),
    assists: n(p.assists),
    saves: n(p.saves),
  }))

  const byScore = [...playerRows].sort((a, b) => b.score - a.score)
  const byPct = [...playerRows].sort((a, b) => b.shootingPercentage - a.shootingPercentage)
  const byDemos = [...playerRows].sort((a, b) => b.demosInflicted - a.demosInflicted)

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="section-label mb-1">Core Intelligence</p>
          <h2 className="text-2xl font-black text-white tracking-tight">Match Command Center</h2>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-white/35">
          <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
          {TEAM_LABELS[0]}
          <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.8)] ml-3" />
          {TEAM_LABELS[1]}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 min-w-0">
        <Panel eyebrow="Teams Overview" title="Shot Creation Matrix"
          subtitle="Shots, goals, assists and saves" Icon={Crosshair} accent={BLUE}>
          <MeasuredChart height={300}>
            {({ width, height }) => (
              <BarChart width={width} height={height} data={teamFundamentals} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700 }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                <Bar dataKey="Blue" fill={BLUE} radius={[8, 8, 0, 0]} barSize={28} />
                <Bar dataKey="Orange" fill={ORANGE} radius={[8, 8, 0, 0]} barSize={28} />
              </BarChart>
            )}
          </MeasuredChart>
        </Panel>

        <Panel eyebrow="Teams Overview" title="Impact Split"
          subtitle="Score, conversion and demos inflicted" Icon={Sparkles} accent={ORANGE}>
          <div className="space-y-7 py-2">
            <TeamDuelRow label="Overall Score" blue={teamScore0} orange={teamScore1} />
            <TeamDuelRow label="Shooting Percentage" blue={t0.shootingPct} orange={t1.shootingPct} suffix="%" />
            <TeamDuelRow label="Demos Inflicted" blue={t0.demosInflicted} orange={t1.demosInflicted} />
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Players Overview" title="Player Stat Stack"
        subtitle="Includes goals conceded while positioned in own defensive third" Icon={Activity} accent="#a78bfa">
        <MeasuredChart height={360}>
          {({ width, height }) => (
            <BarChart width={width} height={height} data={playerRows} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="shortName" tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 700 }}
                axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
              <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
              <Bar dataKey="shots" name="Shots" fill={METRIC_COLORS.shots} radius={[7, 7, 0, 0]} />
              <Bar dataKey="goals" name="Goals" fill={METRIC_COLORS.goals} radius={[7, 7, 0, 0]} />
              <Bar dataKey="assists" name="Assists" fill={METRIC_COLORS.assists} radius={[7, 7, 0, 0]} />
              <Bar dataKey="saves" name="Saves" fill={METRIC_COLORS.saves} radius={[7, 7, 0, 0]} />
              <Bar dataKey="goalsConcededWhileDefender" name="GC as Defender" fill={METRIC_COLORS.goalsConcededWhileDefender} radius={[7, 7, 0, 0]} />
            </BarChart>
          )}
        </MeasuredChart>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 min-w-0">
        <Panel eyebrow="Player Ranking" title="Overall Score" Icon={Trophy} accent="#facc15">
          <HorizontalRankChart rows={byScore} dataKey="score" />
        </Panel>
        <Panel eyebrow="Player Ranking" title="Overall %" subtitle="Shooting percentage" Icon={Medal} accent="#34d399">
          <HorizontalRankChart rows={byPct} dataKey="shootingPercentage" suffix="%" domainMax={100} />
        </Panel>
        <Panel eyebrow="Player Ranking" title="Demos Inflicted" Icon={ShieldAlert} accent="#f43f5e">
          <HorizontalRankChart rows={byDemos} dataKey="demosInflicted" />
        </Panel>
      </div>
    </section>
  )
}
