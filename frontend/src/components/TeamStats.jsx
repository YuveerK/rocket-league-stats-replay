import {
  Activity, BatteryCharging, Crosshair, Gauge, Goal, Shield,
  Sparkles, Target, Zap,
} from 'lucide-react'

const BLUE = '#60a5fa'
const ORANGE = '#fb923c'

const STATS = [
  { key: 'goals', label: 'Goals', Icon: Goal },
  { key: 'shots', label: 'Shots', Icon: Crosshair },
  { key: 'assists', label: 'Assists', Icon: Sparkles },
  { key: 'saves', label: 'Saves', Icon: Shield },
  { key: 'shootingPct', label: 'Shooting %', Icon: Target, fmt: value => `${fmt(value, 1)}%`, max: 100 },
  { key: 'possession', label: 'Possession', Icon: Activity, fmt: value => value != null ? `${fmt(value, 1)}%` : '-', max: 100 },
  { key: 'demosInflicted', label: 'Demos', Icon: Zap },
  { key: 'bpm', label: 'BPM', Icon: Gauge, fmt: value => fmt(value, 1) },
  { key: 'boostCollected', label: 'Boost Collected (units)', Icon: BatteryCharging, fmt: value => fmt(value, 1) },
  { key: 'boostUsed', label: 'Boost Used', Icon: BatteryCharging, fmt: value => fmt(value, 1) },
  { key: 'boostStolen', label: 'Boost Stolen', Icon: Zap },
  { key: 'unknownPads', label: 'Unknown Pads', Icon: Gauge },
  { key: 'bigPads', label: 'Big Pads', Icon: BatteryCharging },
  { key: 'smallPads', label: 'Small Pads', Icon: BatteryCharging },
]

function n(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function fmt(value, decimals = 0) {
  return n(value).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
}

function display(stat, value) {
  return (stat.fmt ?? (v => fmt(v)))(value)
}

function statWinner(v0, v1) {
  const blue = n(v0)
  const orange = n(v1)
  if (blue === orange) return 'draw'
  return blue > orange ? 'blue' : 'orange'
}

function InsightCard({ label, blue, orange, Icon, formatter = value => fmt(value) }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="section-label">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/4 text-white/40">
          <Icon size={15} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className="stat-num text-xl font-black text-blue-300">{formatter(blue)}</span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white/30">vs</span>
        <span className="stat-num text-xl font-black text-orange-300">{formatter(orange)}</span>
      </div>
      <SplitBar v0={blue} v1={orange} className="mt-3" />
    </div>
  )
}

function SplitBar({ v0, v1, max, className = '' }) {
  const blue = n(v0)
  const orange = n(v1)
  const scale = max ?? Math.max(blue, orange, 1)
  const bluePct = Math.min(100, (blue / scale) * 100)
  const orangePct = Math.min(100, (orange / scale) * 100)

  return (
    <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="absolute right-0 top-0 h-full rounded-full"
          style={{
            width: `${bluePct}%`,
            background: BLUE,
            boxShadow: blue > orange ? `0 0 12px ${BLUE}55` : undefined,
          }} />
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${orangePct}%`,
            background: ORANGE,
            boxShadow: orange > blue ? `0 0 12px ${ORANGE}55` : undefined,
          }} />
      </div>
    </div>
  )
}

function StatRow({ stat, t0, t1 }) {
  const v0 = t0[stat.key] ?? 0
  const v1 = t1[stat.key] ?? 0
  const winner = statWinner(v0, v1)
  const Icon = stat.Icon

  return (
    <div className="border-b border-white/5.5 last:border-b-0 hover:bg-white/[0.035]">
      {/* Mobile: stacked label → values → bar */}
      <div className="px-4 py-3 md:hidden">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-white/40">
            <Icon size={11} />
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest text-white/42">{stat.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 text-right">
            <div className={`stat-num text-base font-black ${winner === 'blue' ? 'text-white' : 'text-white/38'}`}>
              {display(stat, v0)}
            </div>
            {winner === 'blue' && <div className="text-[9px] font-black uppercase tracking-widest text-blue-300/70">Edge</div>}
          </div>
          <span className="shrink-0 rounded-full border border-white/8 bg-white/4 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white/30">vs</span>
          <div className="flex-1">
            <div className={`stat-num text-base font-black ${winner === 'orange' ? 'text-white' : 'text-white/38'}`}>
              {display(stat, v1)}
            </div>
            {winner === 'orange' && <div className="text-[9px] font-black uppercase tracking-widest text-orange-300/70">Edge</div>}
          </div>
        </div>
        <SplitBar v0={v0} v1={v1} max={stat.max} className="mt-2" />
      </div>

      {/* Desktop: original 3-col grid */}
      <div className="hidden items-center gap-4 px-5 py-3.5 md:grid md:grid-cols-[96px_minmax(150px,1fr)_96px]">
        <div className="min-w-0">
          <div className={`stat-num text-lg font-black ${winner === 'blue' ? 'text-white' : 'text-white/38'}`}>
            {display(stat, v0)}
          </div>
          {winner === 'blue' && <div className="text-[9px] font-black uppercase tracking-widest text-blue-300/70">Edge</div>}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/4 text-white/40">
              <Icon size={13} />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-white/42">{stat.label}</span>
          </div>
          <SplitBar v0={v0} v1={v1} max={stat.max} />
        </div>

        <div className="min-w-0 text-right">
          <div className={`stat-num text-lg font-black ${winner === 'orange' ? 'text-white' : 'text-white/38'}`}>
            {display(stat, v1)}
          </div>
          {winner === 'orange' && <div className="text-[9px] font-black uppercase tracking-widest text-orange-300/70">Edge</div>}
        </div>
      </div>
    </div>
  )
}

export default function TeamStats({ teams }) {
  const t0 = teams?.[0] ?? {}
  const t1 = teams?.[1] ?? {}

  return (
    <section className="space-y-4">
      <div>
        <p className="section-label mb-1">Team Stats</p>
        <h2 className="text-xl font-black tracking-tight text-white">Team Command Center</h2>
        <p className="mt-1 text-sm text-white/35">Compact team comparison across scoring, control and boost economy.</p>
      </div>

      <div
        className="card relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(17,24,39,0.94), rgba(8,10,18,0.96) 55%, rgba(15,23,42,0.92))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 60px rgba(0,0,0,0.24)',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: BLUE, boxShadow: `0 0 12px ${BLUE}` }} />
            <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-300">Blue</span>
            <span className="mx-2 h-px w-8 bg-white/12" />
            <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Orange</span>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: ORANGE, boxShadow: `0 0 12px ${ORANGE}` }} />
          </div>
          <p className="text-xs font-semibold text-white/35">Side-by-side pressure, control and resource efficiency.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-white/6 p-4 lg:grid-cols-4">
          <InsightCard label="Shot Pressure" blue={t0.shots} orange={t1.shots} Icon={Crosshair} />
          <InsightCard label="Conversion" blue={t0.shootingPct} orange={t1.shootingPct} Icon={Target} formatter={value => `${fmt(value, 1)}%`} />
          <InsightCard label="Possession" blue={t0.possession ?? 0} orange={t1.possession ?? 0} Icon={Activity} formatter={value => `${fmt(value, 1)}%`} />
          <InsightCard label="Boost Collected (units)" blue={t0.boostCollected} orange={t1.boostCollected} Icon={BatteryCharging} formatter={value => fmt(value, 1)} />
          <InsightCard label="Boost Used" blue={t0.boostUsed} orange={t1.boostUsed} Icon={BatteryCharging} formatter={value => fmt(value, 1)} />
          <InsightCard label="Big Pads" blue={t0.bigPads} orange={t1.bigPads} Icon={BatteryCharging} />
          <InsightCard label="Small Pads" blue={t0.smallPads} orange={t1.smallPads} Icon={Gauge} />
        </div>

        <p className="border-b border-white/6 px-5 pb-4 text-xs text-white/35">
          Pad counts (big / small) are estimated from replay pickup events. Boost collected is visible boost meter gain in units, not pad count.
        </p>

        <div className="border-b border-white/6 px-5 py-3">
          {/* Mobile */}
          <div className="flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: BLUE, boxShadow: `0 0 10px ${BLUE}` }} />
              <span className="section-label text-blue-300">Blue</span>
            </div>
            <span className="section-label">Stat Duel</span>
            <div className="flex items-center gap-2">
              <span className="section-label text-orange-300">Orange</span>
              <span className="h-2 w-2 rounded-full" style={{ background: ORANGE, boxShadow: `0 0 10px ${ORANGE}` }} />
            </div>
          </div>
          {/* Desktop */}
          <div className="hidden grid-cols-[96px_minmax(150px,1fr)_96px] gap-4 md:grid">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: BLUE, boxShadow: `0 0 10px ${BLUE}` }} />
              <span className="section-label text-blue-300">Blue</span>
            </div>
            <div className="text-center section-label">Stat Duel</div>
            <div className="flex items-center justify-end gap-2">
              <span className="section-label text-orange-300">Orange</span>
              <span className="h-2 w-2 rounded-full" style={{ background: ORANGE, boxShadow: `0 0 10px ${ORANGE}` }} />
            </div>
          </div>
        </div>

        {STATS.map(stat => (
          <StatRow key={stat.key} stat={stat} t0={t0} t1={t1} />
        ))}
      </div>
    </section>
  )
}
