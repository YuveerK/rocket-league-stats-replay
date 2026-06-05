import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  BatteryCharging, Clock, Database, Gauge, Layers, PackagePlus,
  ShieldAlert, Sparkles, Upload, Zap,
} from 'lucide-react'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { Panel } from '@/components/ui/Panel'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { PageHeader } from '@/components/layout/PageHeader'
import ReplayPage from '@/components/layout/ReplayPage'
import { usePageData } from '@/hooks/usePageData'
import { useAnalysisJob } from '@/hooks/useAnalysisJob'
import { n, fmt, fmtPct, fmtSeconds, shortName } from '@/lib/formatters'
import { BLUE, ORANGE, TEAM_COLORS, TEAM_LABELS } from '@/lib/colors'

const BLUE_SHADES   = ['#60a5fa', '#93c5fd', '#3b82f6']
const ORANGE_SHADES = ['#fb923c', '#fdba74', '#f97316']

const BAND_BG_OPACITIES   = ['26', '50', '80', 'ff']
const BAND_TEXT_OPACITIES = ['70', '99', 'cc', 'ff']
const BAND_KEYS   = ['boost0To25Pct', 'boost25To50Pct', 'boost50To75Pct', 'boost75To100Pct']
const BAND_LABELS = ['0–25%', '25–50%', '50–75%', '75–100%']

const HEADER_GRADIENT =
  'radial-gradient(circle at 18% 0%, rgba(96,165,250,0.22), transparent 30%), ' +
  'radial-gradient(circle at 78% 4%, rgba(251,146,60,0.14), transparent 32%), ' +
  'linear-gradient(135deg,#080b16 0%,#05070f 60%,#090d18 100%)'

function teamColor(team) { return TEAM_COLORS[team] ?? 'rgba(255,255,255,0.45)' }
function teamLabel(team) { return TEAM_LABELS[team] ?? 'Unknown' }

function bandBg(team, i)   { return (team === 0 ? BLUE : ORANGE) + BAND_BG_OPACITIES[i] }
function bandText(team, i) { return (team === 0 ? BLUE : ORANGE) + BAND_TEXT_OPACITIES[i] }

function makeRows(players, metrics) {
  return metrics.map((metric) => {
    const row = { metric: metric.label }
    for (const player of players) row[player.key] = n(metric.value(player))
    return row
  })
}

// ── PlayerLegend ──────────────────────────────────────────────────────────────

function PlayerLegend({ players }) {
  return (
    <div className="flex flex-wrap gap-2">
      {players.map((player) => (
        <span key={player.key} className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[11px] font-bold text-white/55">
          <span className="h-2 w-2 rounded-full" style={{ background: player.color, boxShadow: `0 0 10px ${player.color}` }} />
          <span className="max-w-32.5 truncate">{shortName(player.playerName, 18)}</span>
          <span className="rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider"
            style={{ color: teamColor(player.team), background: `${teamColor(player.team)}16` }}>
            {teamLabel(player.team)}
          </span>
        </span>
      ))}
    </div>
  )
}

// ── GroupedPlayerBar ──────────────────────────────────────────────────────────

function GroupedPlayerBar({ players, rows, height = 320, formatter = fmt, yFormatter = fmt, showLabels = true }) {
  return (
    <MeasuredChart height={height}>
      {({ width, height }) => (
        <BarChart width={width} height={height} data={rows} margin={{ top: 18, right: 10, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
          <XAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.48)', fontSize: 11, fontWeight: 800 }}
            axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 11 }}
            axisLine={false} tickLine={false} tickFormatter={yFormatter} />
          <Tooltip content={<ChartTooltip formatter={formatter} />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
          <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
          {players.map((player) => (
            <Bar key={player.key} dataKey={player.key} name={player.playerName} fill={player.color} radius={[8, 8, 0, 0]} maxBarSize={36}>
              {rows.map((row) => <Cell key={`${player.key}-${row.metric}`} fill={player.color} fillOpacity={0.86} />)}
              {showLabels && (
                <LabelList dataKey={player.key} position="top" formatter={formatter}
                  fill="rgba(255,255,255,0.62)" fontSize={10} fontWeight={800} />
              )}
            </Bar>
          ))}
        </BarChart>
      )}
    </MeasuredChart>
  )
}

// ── PlayerCards ───────────────────────────────────────────────────────────────

function PlayerCards({ players }) {
  const maxBpm = Math.max(1, ...players.map((p) => n(p.bpm)))
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {players.map((player) => {
        const color = player.color
        const tc = teamColor(player.team)
        return (
          <article key={player.key} className="relative overflow-hidden rounded-2xl border bg-white/2.5 p-4" style={{ borderColor: `${tc}22` }}>
            <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full blur-2xl" style={{ background: `${tc}14` }} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                  <h4 className="truncate text-sm font-black text-white/82">{player.playerName}</h4>
                </div>
                <p className="mt-1 text-xs text-white/32">{teamLabel(player.team)} team · {player.car ?? 'Unknown car'}</p>
              </div>
              <span className="shrink-0 rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-widest"
                style={{ borderColor: `${tc}25`, color: tc, background: `${tc}12` }}>
                {teamLabel(player.team)}
              </span>
            </div>
            <div className="relative mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
              <div><div className="section-label">BPM</div><div className="stat-num mt-1 text-lg font-black" style={{ color }}>{fmt(player.bpm, 1)}</div></div>
              <div><div className="section-label">Units</div><div className="stat-num mt-1 text-lg font-black text-emerald-300">{fmt(player.boostCollectedApprox)}</div></div>
              <div><div className="section-label">Big</div><div className="stat-num mt-1 text-lg font-black text-sky-300">{fmt(player.bigPads)}</div></div>
              <div><div className="section-label">Small</div><div className="stat-num mt-1 text-lg font-black text-violet-300">{fmt(player.smallPads)}</div></div>
              <div><div className="section-label">Stolen</div><div className="stat-num mt-1 text-lg font-black text-amber-300">{fmt(player.amountStolen)}</div></div>
            </div>
            <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-white/7">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (n(player.bpm) / maxBpm) * 100)}%`, background: color, boxShadow: `0 0 8px ${color}60` }} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

// ── RangeStack ────────────────────────────────────────────────────────────────

function RangeStack({ players }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {BAND_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-2 w-8 rounded-sm" style={{ background: `linear-gradient(90deg, ${bandBg(0, i)}, ${bandBg(1, i)})` }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-white/20 italic">brighter = more time at high boost</span>
      </div>

      {players.map((player) => {
        const totalSec = n(player.boost0To25Seconds) + n(player.boost25To50Seconds) + n(player.boost50To75Seconds) + n(player.boost75To100Seconds)
        return (
          <div key={player.key}>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: player.color, boxShadow: `0 0 8px ${player.color}` }} />
                <span className="truncate text-sm font-black text-white/80">{player.playerName}</span>
                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: teamColor(player.team), background: `${teamColor(player.team)}18` }}>
                  {teamLabel(player.team)}
                </span>
              </div>
              {totalSec > 0 && <span className="shrink-0 text-[10px] text-white/30">{fmtSeconds(totalSec)}</span>}
            </div>
            <div className="relative flex h-7 overflow-hidden rounded-xl bg-white/4">
              {BAND_KEYS.map((key, i) => {
                const pct = n(player[key])
                return (
                  <div key={key} className="relative flex items-center justify-center overflow-hidden"
                    style={{ width: `${Math.max(0, pct)}%`, background: bandBg(player.team, i) }}
                    title={`${BAND_LABELS[i]}: ${fmtPct(pct)}`}>
                    {pct >= 12 && <span className="text-[9px] font-black text-white/90 drop-shadow">{Math.round(pct)}%</span>}
                  </div>
                )
              })}
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {BAND_KEYS.map((key, i) => (
                <div key={key} className="min-w-0 text-center">
                  <div className="text-[11px] font-black" style={{ color: bandText(player.team, i) }}>{fmtPct(n(player[key]))}</div>
                  <div className="text-[9px] tracking-wide text-white/25">{BAND_LABELS[i]}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── DetailTable ───────────────────────────────────────────────────────────────

function DetailTable({ players }) {
  const columns = [
    ['BPM',                (p) => fmt(p.bpm, 1)],
    ['Avg boost',          (p) => fmt(p.averageBoost, 1)],
    ['0 boost',            (p) => fmtSeconds(p.zeroBoostSeconds)],
    ['100 boost',          (p) => fmtSeconds(p.fullBoostSeconds)],
    ['0-25%',              (p) => fmtPct(p.boost0To25Pct)],
    ['25-50%',             (p) => fmtPct(p.boost25To50Pct)],
    ['50-75%',             (p) => fmtPct(p.boost50To75Pct)],
    ['75-100%',            (p) => fmtPct(p.boost75To100Pct)],
    ['Supersonic used',    (p) => fmt(p.boostUsedWhileSupersonic)],
    ['Big pads',           (p) => fmt(p.bigPads)],
    ['Stolen big',         (p) => fmt(p.stolenBigPads)],
    ['Small pads',         (p) => fmt(p.smallPads)],
    ['Stolen small',       (p) => fmt(p.stolenSmallPads)],
    ['Stolen side',        (p) => fmt(p.stolenOtherSidePickups)],
    ['Big collected',      (p) => fmt(p.amountCollectedBigPads)],
    ['Big stolen amt',     (p) => fmt(p.amountStolenBigPads)],
    ['Small collected',    (p) => fmt(p.amountCollectedSmallPads)],
    ['Small stolen amt',   (p) => fmt(p.amountStolenSmallPads)],
    ['Overfill',           (p) => fmt(p.overfillTotal)],
    ['Stolen overfill',    (p) => fmt(p.overfillFromStolen)],
  ]

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/7 bg-black/20">
      <table className="min-w-387.5 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/7 bg-white/[0.035]">
            <th className="sticky left-0 z-10 bg-[#0d111d] px-4 py-3 text-xs font-black uppercase tracking-widest text-white/42">Player</th>
            {columns.map(([label]) => (
              <th key={label} className="px-3 py-3 text-right text-xs font-black uppercase tracking-widest text-white/34">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.key} className="border-b border-white/5.5 last:border-b-0">
              <td className="sticky left-0 z-10 bg-[#0b0f1a] px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: player.color, boxShadow: `0 0 10px ${player.color}` }} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-white/78">{player.playerName}</div>
                    <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: teamColor(player.team) }}>{teamLabel(player.team)}</div>
                  </div>
                </div>
              </td>
              {columns.map(([label, render]) => (
                <td key={label} className="stat-num px-3 py-3 text-right text-xs font-bold text-white/64">{render(player)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BoostPlayers() {
  const { data, loading, error, refetch } = usePageData('/api/boost-players')
  const analysis = useAnalysisJob(refetch)

  const status = loading ? 'loading' : (error || !data) ? 'empty' : 'ready'

  const players = useMemo(() => {
    const sorted = [...(data?.players ?? [])].sort((a, b) => n(a.team) - n(b.team) || n(b.bpm) - n(a.bpm))
    const teamCounts = {}
    return sorted.map((player, index) => {
      const shades = player.team === 0 ? BLUE_SHADES : ORANGE_SHADES
      const ti = teamCounts[player.team] ?? 0
      teamCounts[player.team] = ti + 1
      return { ...player, key: `p${index}`, color: shades[ti % shades.length] }
    })
  }, [data])

  const economyRows    = useMemo(() => makeRows(players, [{ label: 'BPM', value: (p) => p.bpm }, { label: 'Avg boost', value: (p) => p.averageBoost }]), [players])
  const reserveRows    = useMemo(() => makeRows(players, [{ label: '0 boost', value: (p) => p.zeroBoostSeconds }, { label: '100 boost', value: (p) => p.fullBoostSeconds }]), [players])
  const supersonicRows = useMemo(() => makeRows(players, [{ label: 'Used while supersonic', value: (p) => p.boostUsedWhileSupersonic }]), [players])
  const padRows        = useMemo(() => makeRows(players, [{ label: 'Big pads', value: (p) => p.bigPads }, { label: 'Stolen big', value: (p) => p.stolenBigPads }, { label: 'Small pads', value: (p) => p.smallPads }, { label: 'Stolen small', value: (p) => p.stolenSmallPads }]), [players])
  const amountRows     = useMemo(() => makeRows(players, [{ label: 'Big collected', value: (p) => p.amountCollectedBigPads }, { label: 'Big stolen', value: (p) => p.amountStolenBigPads }, { label: 'Small collected', value: (p) => p.amountCollectedSmallPads }, { label: 'Small stolen', value: (p) => p.amountStolenSmallPads }]), [players])
  const overfillRows   = useMemo(() => makeRows(players, [{ label: 'Overfill total', value: (p) => p.overfillTotal }, { label: 'From stolen', value: (p) => p.overfillFromStolen }]), [players])

  const highestBpm   = players.reduce((best, p) => (n(p.bpm)          > n(best?.bpm)          ? p : best), players[0])
  const mostOverfill = players.reduce((best, p) => (n(p.overfillTotal) > n(best?.overfillTotal) ? p : best), players[0])
  const totalStolen  = players.reduce((sum, p) => sum + n(p.amountStolen), 0)
  const totalBigPads = players.reduce((sum, p) => sum + n(p.bigPads), 0)
  const totalSmallPads = players.reduce((sum, p) => sum + n(p.smallPads), 0)
  const topPadCollector = players.reduce((best, p) => (n(p.pickups) > n(best?.pickups) ? p : best), players[0])

  return (
    <ReplayPage status={status} analysis={analysis} error={error}>
      <div className="anim-fade-in">
        <PageHeader
          gradient={HEADER_GRADIENT}
          eyebrow="Player boost command center"
          EyebrowIcon={Sparkles}
          eyebrowColor="#93c5fd"
          title="Boost Player Analytics"
          description="Individual boost economy, reserve pressure, pad control, stolen pickups, supersonic spend and overfill waste."
          onUpload={analysis.handleAnalysisStart}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <HeroMetric label="Players"         value={fmt(players.length)}                        detail="Tracked from replay PRI data"                 color={BLUE}                     Icon={Database}       />
            <HeroMetric label="Big Pads"        value={fmt(totalBigPads)}                          detail="Large pad pickups (match total)"              color={BLUE}                     Icon={BatteryCharging}/>
            <HeroMetric label="Small Pads"      value={fmt(totalSmallPads)}                        detail="Small pad pickups (match total)"              color={ORANGE}                   Icon={Layers}          />
            <HeroMetric label="Top Collector"   value={shortName(topPadCollector?.playerName, 12)} detail={`${fmt(topPadCollector?.pickups)} pads · ${fmt(topPadCollector?.bigPads)} big`} color={topPadCollector?.color ?? BLUE} Icon={Gauge} />
            <HeroMetric label="BPM Leader"      value={shortName(highestBpm?.playerName, 12)}      detail={`${fmt(highestBpm?.bpm, 1)} boost per minute`} color={highestBpm?.color ?? BLUE} Icon={Gauge}        />
            <HeroMetric label="Total Stolen"    value={fmt(totalStolen)}                           detail="Other-side pickup boost (units)"              color={ORANGE}                   Icon={ShieldAlert}    />
            <HeroMetric label="Overfill Leader" value={shortName(mostOverfill?.playerName, 12)}    detail={`${fmt(mostOverfill?.overfillTotal)} boost lost to cap`} color={BLUE}        Icon={BatteryCharging}/>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-white/35">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/7 bg-white/4 px-2.5 py-1"><Layers size={12} /> {data?.replayName ?? 'Replay'}</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/7 bg-white/4 px-2.5 py-1"><Clock size={12} /> {fmtSeconds(data?.matchDuration)} match time</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/7 bg-white/4 px-2.5 py-1"><Upload size={12} /> {data?.mapName ?? 'Unknown map'}</span>
          </div>
        </PageHeader>

        <main className="mx-auto max-w-7xl space-y-6 px-8 py-8">
          <Panel eyebrow="Roster" title="Players Overview" subtitle="BPM, average boost and stolen boost at a glance" Icon={Gauge} accent={BLUE}>
            <PlayerCards players={players} />
          </Panel>

          <Panel eyebrow="Economy" title="Boost Per Minute And Average Amount" subtitle="Primary player boost economy metrics" Icon={Database} accent={BLUE}>
            <PlayerLegend players={players} />
            <div className="mt-5"><GroupedPlayerBar players={players} rows={economyRows} height={310} formatter={(v) => fmt(v, 1)} yFormatter={fmt} /></div>
          </Panel>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel eyebrow="Reserve State" title="Seconds At 0 And 100 Boost" subtitle="Time spent starved or capped" Icon={BatteryCharging} accent={BLUE}>
              <PlayerLegend players={players} />
              <div className="mt-5"><GroupedPlayerBar players={players} rows={reserveRows} height={310} formatter={fmtSeconds} yFormatter={(v) => `${fmt(v)}s`} /></div>
            </Panel>
            <Panel eyebrow="Supersonic Spend" title="Amount Used While Supersonic" subtitle="Boost decreases while car is at supersonic speed" Icon={Zap} accent={ORANGE}>
              <PlayerLegend players={players} />
              <div className="mt-5"><GroupedPlayerBar players={players} rows={supersonicRows} height={310} formatter={fmt} yFormatter={fmt} /></div>
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <Panel eyebrow="Boost Ranges" title="Time Spent In Boost Bands" subtitle="Percent of player boost sample time in each band" Icon={PackagePlus} accent={BLUE}>
              <RangeStack players={players} />
            </Panel>
            <Panel eyebrow="Pad Control" title="Collected Pads" subtitle="Stolen means other team's side; midfield pickups are excluded" Icon={ShieldAlert} accent={ORANGE}>
              <PlayerLegend players={players} />
              <div className="mt-5"><GroupedPlayerBar players={players} rows={padRows} height={350} formatter={fmt} yFormatter={fmt} showLabels={false} /></div>
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel eyebrow="Collected Amounts" title="Big And Small Pad Amounts" subtitle="Visible boost gained from pad pickups, split by stolen and non-stolen totals" Icon={Database} accent={BLUE}>
              <PlayerLegend players={players} />
              <div className="mt-5"><GroupedPlayerBar players={players} rows={amountRows} height={330} formatter={fmt} yFormatter={fmt} showLabels={false} /></div>
            </Panel>
            <Panel eyebrow="Overfill" title="Boost Lost To The Cap" subtitle="At 80 boost, collecting a big pad overfills by 80" Icon={BatteryCharging} accent={ORANGE}>
              <PlayerLegend players={players} />
              <div className="mt-5"><GroupedPlayerBar players={players} rows={overfillRows} height={330} formatter={fmt} yFormatter={fmt} /></div>
            </Panel>
          </section>

          <Panel eyebrow="Reference" title="Player Boost Stat Sheet" subtitle="Every requested boost player metric in one table" Icon={Layers} accent={BLUE}>
            <DetailTable players={players} />
            <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-white/34 md:grid-cols-3">
              <p className="rounded-xl border border-white/7 bg-white/2.5 p-3"><span className="font-black text-white/55">Stolen:</span> pickups on the other team's side only. Middle boosts are not counted.</p>
              <p className="rounded-xl border border-white/7 bg-white/2.5 p-3"><span className="font-black text-white/55">Overfill:</span> pad value minus visible boost gain, so 80 boost plus a big pad wastes 80.</p>
              <p className="rounded-xl border border-white/7 bg-white/2.5 p-3"><span className="font-black text-white/55">Ranges:</span> percentages are time-weighted from each player's replicated boost meter.</p>
            </div>
          </Panel>
        </main>
      </div>
    </ReplayPage>
  )
}
