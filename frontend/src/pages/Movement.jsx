import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { Panel } from '@/components/ui/Panel'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import ReplayPage from '@/components/layout/ReplayPage'
import { usePageData } from '@/hooks/usePageData'
import { n, fmt } from '@/lib/formatters'
import { BLUE, ORANGE, GREEN, PURPLE, GOLD } from '@/lib/colors'
import {
  Wind, RotateCcw, RefreshCw, Repeat2,
  Wifi, WifiOff,
} from 'lucide-react'

const BLUE_SOFT   = 'rgba(96,165,250,0.13)'
const ORANGE_SOFT = 'rgba(251,146,60,0.13)'
const BLUE_GLOW   = 'rgba(96,165,250,0.35)'
const ORANGE_GLOW = 'rgba(251,146,60,0.35)'

const TEAM = {
  0: { color: BLUE,   soft: BLUE_SOFT,   glow: BLUE_GLOW,   name: 'Blue',   border: 'rgba(96,165,250,0.22)',  text: '#7ba7ff' },
  1: { color: ORANGE, soft: ORANGE_SOFT, glow: ORANGE_GLOW, name: 'Orange', border: 'rgba(251,146,60,0.22)',  text: '#ff9d3d' },
}

function sum(arr, k)   { return arr.reduce((a, p) => a + n(p[k]), 0) }
function maxOf(arr, k) { return Math.max(1, ...arr.map(p => n(p[k]))) }
function teamColor(team) { return TEAM[team]?.color ?? '#94a3b8' }

function netQuality(val) {
  if (val == null) return { label: '—',         color: 'text-white/20'   }
  if (val === 0)   return { label: 'Excellent',  color: 'text-emerald-400' }
  if (val === 1)   return { label: 'Good',       color: 'text-yellow-400'  }
  if (val === 2)   return { label: 'Fair',       color: 'text-orange-400'  }
  return               { label: 'Poor',       color: 'text-red-400'     }
}

// ── Arc ───────────────────────────────────────────────────────────────────────

function Arc({ pct, color, size = 72, label, value }) {
  const r    = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, n(pct)) / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ filter: `drop-shadow(0 0 5px ${color}90)`, transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x={size/2} y={size/2 - 3}  textAnchor="middle" fill="white"                    fontSize={13} fontWeight="900" fontFamily="inherit">{value ?? `${Math.round(n(pct))}%`}</text>
        <text x={size/2} y={size/2 + 11} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={9}  fontWeight="700" fontFamily="inherit">{label}</text>
      </svg>
    </div>
  )
}

// ── InlineBar ─────────────────────────────────────────────────────────────────

function InlineBar({ value, max, color, label }) {
  const pct = max > 0 ? Math.min(100, (n(value) / max) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-22.5 shrink-0 text-right text-[10px] font-bold tracking-wide text-white/30 uppercase">{label}</div>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/6">
        <div className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}70`, transition: 'width 0.5s ease' }} />
      </div>
      <div className="w-8 shrink-0 text-right text-sm font-black tabular-nums"
        style={{ color: value == null ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)' }}>
        {value == null ? '—' : n(value)}
      </div>
    </div>
  )
}

// ── PlayerCard ────────────────────────────────────────────────────────────────

function PlayerCard({ player, maxes }) {
  const cfg = TEAM[player.team] ?? TEAM[0]
  return (
    <div className="relative overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(145deg, ${cfg.soft}, rgba(8,11,20,0.96) 40%)`,
        border: `1px solid ${cfg.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.3)',
      }}>
      <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl"
        style={{ background: cfg.glow, opacity: 0.3 }} />

      <div className="relative flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.color, boxShadow: `0 0 12px ${cfg.glow}` }} />
          <span className="font-black text-sm text-white/90 truncate">{player.playerName}</span>
          {player.isBot && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-white/5 text-white/25 border border-white/8">BOT</span>
          )}
          {player.platform && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-white/5 text-white/35 border border-white/8">{player.platform}</span>
          )}
        </div>
        {player.partyLeaderId && (
          <span className="text-[9px] font-mono text-white/20 shrink-0 ml-2">
            Party {player.partyLeaderId.split(':').pop().slice(0, 6)}
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-around px-5 pb-4">
        <Arc pct={n(player.supersonicPct)} color={cfg.color} label="Supersonic" size={76} />
        <Arc pct={n(player.airbornePct)}   color={PURPLE}    label="Airborne"   size={76} />
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-3xl font-black tabular-nums" style={{ color: cfg.color, textShadow: `0 0 20px ${cfg.glow}` }}>
            {player.dodgeCount ?? '—'}
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest text-white/25">Dodges</div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-3xl font-black tabular-nums text-white/80">{player.airRolls ?? '—'}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-white/25">Air Rolls</div>
        </div>
      </div>

      <div className="relative px-5 pb-5 space-y-2.5 border-t border-white/5 pt-4">
        <InlineBar label="Dodge Refresh" value={player.dodgesRefreshed} max={maxes.dodgesRefreshed} color={GREEN} />
        <InlineBar label="Double Jumps"  value={player.doubleJumps}     max={maxes.doubleJumps}     color={GOLD}  />
        <InlineBar label="Max Speed"     value={player.maxSpeedUU != null ? Math.round(n(player.maxSpeedUU)) : null} max={maxes.maxSpeedUU} color={cfg.color} />
        <InlineBar label="Steer Dev"     value={player.avgSteerDeviation != null ? `${fmt(player.avgSteerDeviation, 1)}%` : null} max={100} color={PURPLE} />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Movement() {
  const { data, loading, error } = usePageData('/api/movement')

  const status = loading ? 'loading' : (error || !data) ? 'empty' : 'ready'

  const players = data?.players ?? []
  const blue   = players.filter(p => p.team === 0)
  const orange = players.filter(p => p.team === 1)

  const maxes = {
    airRolls:        maxOf(players, 'airRolls'),
    dodgeCount:      maxOf(players, 'dodgeCount'),
    dodgesRefreshed: maxOf(players, 'dodgesRefreshed'),
    doubleJumps:     maxOf(players, 'doubleJumps'),
    maxSpeedUU:      maxOf(players, 'maxSpeedUU'),
  }

  const totalAirRolls  = sum(players, 'airRolls')
  const totalDodges    = sum(players, 'dodgeCount')
  const totalRefreshes = sum(players, 'dodgesRefreshed')
  const totalDblJumps  = sum(players, 'doubleJumps')

  const pingsAvail = players.filter(p => p.avgPing != null)
  const avgPing = pingsAvail.length
    ? Math.round(pingsAvail.reduce((a, p) => a + n(p.avgPing), 0) / pingsAvail.length)
    : null

  const mechData = players.map(p => ({
    name:      p.playerName.length > 12 ? p.playerName.slice(0, 11) + '…' : p.playerName,
    full:      p.playerName,
    airRolls:  n(p.airRolls),
    dodges:    n(p.dodgeCount),
    refreshes: n(p.dodgesRefreshed),
    dblJumps:  n(p.doubleJumps),
    color:     teamColor(p.team),
  }))

  const speedData = players.map(p => ({
    name:           p.playerName.length > 12 ? p.playerName.slice(0, 11) + '…' : p.playerName,
    full:           p.playerName,
    'Supersonic %': n(p.supersonicPct),
    'Airborne %':   n(p.airbornePct),
    color:          teamColor(p.team),
  }))

  const radarKeys = ['Air Rolls', 'Dodges', 'Refreshes', 'Dbl Jumps', 'Supersonic', 'Airborne']
  const radarData = radarKeys.map(key => {
    const row = { subject: key }
    players.forEach(p => {
      let raw
      if (key === 'Air Rolls')  raw = n(p.airRolls)        / Math.max(1, maxes.airRolls)        * 100
      if (key === 'Dodges')     raw = n(p.dodgeCount)       / Math.max(1, maxes.dodgeCount)       * 100
      if (key === 'Refreshes')  raw = n(p.dodgesRefreshed)  / Math.max(1, maxes.dodgesRefreshed)  * 100
      if (key === 'Dbl Jumps')  raw = n(p.doubleJumps)      / Math.max(1, maxes.doubleJumps)      * 100
      if (key === 'Supersonic') raw = n(p.supersonicPct)
      if (key === 'Airborne')   raw = n(p.airbornePct)
      row[p.playerName] = Number(raw.toFixed(1))
    })
    return row
  })

  return (
    <ReplayPage status={status}>
      <div className="anim-fade-in">
        <div className="relative overflow-hidden border-b border-white/6"
          style={{ background: 'linear-gradient(135deg,rgba(37,99,235,0.10) 0%,#05070f 40%,#05070f 60%,rgba(234,88,12,0.10) 100%)' }}>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-0 w-72 h-72 rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.5) 0%,transparent 70%)', transform: 'translate(-35%,-35%)' }} />
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle,rgba(249,115,22,0.5) 0%,transparent 70%)', transform: 'translate(35%,-35%)' }} />
          </div>
          <div className="relative px-4 py-5 flex items-start justify-between gap-4 max-w-7xl mx-auto sm:px-8 sm:py-7">
            <div>
              <p className="section-label">Movement</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Mechanics &amp; Movement</h1>
              {data?.replayName && (
                <p className="mt-1 text-sm text-white/30 truncate max-w-lg">{data.replayName}</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-5 space-y-6 max-w-7xl mx-auto sm:px-8 sm:py-7">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            <HeroMetric label="Air Rolls"        value={totalAirRolls}  detail="jump + flip + air roll activations"  color={BLUE}   Icon={Wind}      />
            <HeroMetric label="Dodges"           value={totalDodges}    detail="total dodges executed"               color={PURPLE} Icon={RotateCcw} />
            <HeroMetric label="Dodge Refreshes"  value={totalRefreshes} detail="wall / ceiling touches"              color={GREEN}  Icon={RefreshCw} />
            <HeroMetric label="Double Jumps"     value={totalDblJumps}  detail="total across all players"            color={GOLD}   Icon={Repeat2}   />
            <HeroMetric
              label="Avg Ping"
              value={avgPing != null ? `${avgPing} ms` : 'N/A'}
              detail={avgPing != null ? 'average across online players' : 'bot match — no network data'}
              color={avgPing != null ? (avgPing < 60 ? GREEN : avgPing < 120 ? GOLD : ORANGE) : 'rgba(255,255,255,0.2)'}
              Icon={avgPing != null ? Wifi : WifiOff}
            />
          </div>

          <div>
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <p className="section-label">Per player</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-white">Player Profiles</h2>
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400/60 px-1">Blue Team</p>
                {blue.map(p => <PlayerCard key={p.playerName} player={p} maxes={maxes} />)}
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-400/60 px-1">Orange Team</p>
                {orange.map(p => <PlayerCard key={p.playerName} player={p} maxes={maxes} />)}
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel eyebrow="Mechanics breakdown" title="Air Rolls &amp; Dodges">
              <MeasuredChart height={220}>
                {({ width }) => (
                  <BarChart data={mechData} width={width} height={220} barGap={3} barCategoryGap="24%">
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.18)', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="airRolls" name="Air Rolls" radius={[3,3,0,0]}>
                      {mechData.map((e,i) => <Cell key={i} fill={e.color} fillOpacity={0.9} />)}
                    </Bar>
                    <Bar dataKey="dodges" name="Dodges" radius={[3,3,0,0]}>
                      {mechData.map((e,i) => <Cell key={i} fill={e.color} fillOpacity={0.45} />)}
                    </Bar>
                  </BarChart>
                )}
              </MeasuredChart>
              <div className="flex items-center gap-5 mt-3 justify-center">
                {[['Air Rolls','rgba(255,255,255,0.75)'],['Dodges','rgba(255,255,255,0.3)']].map(([l,c]) => (
                  <span key={l} className="flex items-center gap-1.5 text-[11px] text-white/30">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />{l}
                  </span>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Speed &amp; altitude" title="Supersonic &amp; Airborne %">
              <MeasuredChart height={220}>
                {({ width }) => (
                  <BarChart data={speedData} width={width} height={220} barGap={3} barCategoryGap="24%">
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.18)', fontSize: 10 }} axisLine={false} tickLine={false} width={26} unit="%" />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${fmt(v, 1)}%`} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="Supersonic %" radius={[3,3,0,0]}>
                      {speedData.map((e,i) => <Cell key={i} fill={e.color} fillOpacity={0.9} />)}
                    </Bar>
                    <Bar dataKey="Airborne %" radius={[3,3,0,0]}>
                      {speedData.map((e,i) => <Cell key={i} fill={PURPLE} fillOpacity={0.55} />)}
                    </Bar>
                  </BarChart>
                )}
              </MeasuredChart>
              <div className="flex items-center gap-5 mt-3 justify-center">
                {[['Supersonic %','rgba(255,255,255,0.75)'],[`Airborne %`,PURPLE]].map(([l,c]) => (
                  <span key={l} className="flex items-center gap-1.5 text-[11px] text-white/30">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c, opacity: 0.8 }} />{l}
                  </span>
                ))}
              </div>
            </Panel>
          </div>

          {players.length > 0 && (
            <Panel eyebrow="Mechanical profile" title="Player Radar — Normalised to Match Ceiling">
              <MeasuredChart height={300}>
                {({ width }) => (
                  <RadarChart cx={width / 2} cy={150} outerRadius={110} width={width} height={300} data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.07)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700 }} />
                    {players.map(p => (
                      <Radar key={p.playerName} name={p.playerName} dataKey={p.playerName}
                        stroke={teamColor(p.team)} fill={teamColor(p.team)} fillOpacity={0.08}
                        strokeWidth={2} dot={{ r: 2, fill: teamColor(p.team) }} />
                    ))}
                    <Legend iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{v}</span>} />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${fmt(v, 1)}%`} />} cursor={false} />
                  </RadarChart>
                )}
              </MeasuredChart>
              <p className="text-[11px] text-white/20 mt-1">All axes normalised: 100 = highest value in this match. Supersonic &amp; Airborne shown as raw %.</p>
            </Panel>
          )}

          <Panel eyebrow="Speed stats" title="Speed &amp; Input Reference">
            {/* Mobile: cards */}
            <div className="space-y-2.5 md:hidden">
              {[...blue, ...orange].map((p) => (
                <div key={p.playerName} className="rounded-xl border border-white/6 bg-white/3 p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: teamColor(p.team) }} />
                    <span className="font-bold text-sm text-white/85">{p.playerName}</span>
                    {p.isBot && <span className="rounded border border-white/8 bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/20">BOT</span>}
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-x-4 gap-y-2 border-t border-white/6 pt-2.5 text-center">
                    <div>
                      <div className="stat-num text-sm font-black text-white/75">{p.maxSpeedUU != null ? Math.round(n(p.maxSpeedUU)).toLocaleString() : '—'}</div>
                      <div className="text-[10px] text-white/28">Max Speed</div>
                    </div>
                    <div>
                      <div className="stat-num text-sm text-white/45">{p.avgSpeedUU != null ? Math.round(n(p.avgSpeedUU)).toLocaleString() : '—'}</div>
                      <div className="text-[10px] text-white/28">Avg Speed</div>
                    </div>
                    <div>
                      <div className="stat-num text-sm font-bold text-white/75">{p.supersonicPct != null ? `${fmt(p.supersonicPct, 1)}%` : '—'}</div>
                      <div className="text-[10px] text-white/28">Supersonic</div>
                    </div>
                    <div>
                      <div className="stat-num text-sm text-white/50">{p.airbornePct != null ? `${fmt(p.airbornePct, 1)}%` : '—'}</div>
                      <div className="text-[10px] text-white/28">Airborne</div>
                    </div>
                    <div>
                      <div className="stat-num text-sm text-white/45">{p.handbrakeUsagePct != null ? `${fmt(p.handbrakeUsagePct, 1)}%` : '—'}</div>
                      <div className="text-[10px] text-white/28">Handbrake</div>
                    </div>
                    <div>
                      <div className="stat-num text-sm text-white/40">{p.avgSteerDeviation != null ? `${fmt(p.avgSteerDeviation, 1)}%` : '—'}</div>
                      <div className="text-[10px] text-white/28">Steer Dev</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-white/20">
                    {['Player', 'Max Speed', 'Avg Speed', 'Supersonic %', 'Airborne %', 'Handbrake %', 'Steer Dev'].map((h, i) => (
                      <th key={h} className={`pb-2.5 font-black ${i === 0 ? 'pr-4 text-left' : 'px-3 text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...blue, ...orange].map((p) => (
                    <tr key={p.playerName} className="border-t border-white/4 transition-colors hover:bg-white/2">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: teamColor(p.team) }} />
                          <span className="text-sm font-bold text-white/85">{p.playerName}</span>
                          {p.isBot && <span className="rounded border border-white/8 bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/20">BOT</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-black tabular-nums text-white/75">{p.maxSpeedUU != null ? Math.round(n(p.maxSpeedUU)).toLocaleString() : '—'}</td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-white/45">{p.avgSpeedUU != null ? Math.round(n(p.avgSpeedUU)).toLocaleString() : '—'}</td>
                      <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-white/75">{p.supersonicPct != null ? `${fmt(p.supersonicPct, 1)}%` : '—'}</td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-white/50">{p.airbornePct != null ? `${fmt(p.airbornePct, 1)}%` : '—'}</td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-white/45">{p.handbrakeUsagePct != null ? `${fmt(p.handbrakeUsagePct, 1)}%` : '—'}</td>
                      <td className="py-3 pl-3 text-right text-sm tabular-nums text-white/40">{p.avgSteerDeviation != null ? `${fmt(p.avgSteerDeviation, 1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] leading-relaxed text-white/20">
                Speed in Unreal Units/s (max car speed ≈ 2,300 UU/s). Steer deviation = average absolute deviation from center input, normalised to 0–100%.
              </p>
            </div>
          </Panel>

          <Panel eyebrow="Network &amp; identity" title="Connection Quality &amp; Player Info">
            {/* Mobile: cards */}
            <div className="space-y-2.5 md:hidden">
              {[...blue, ...orange].map((p) => {
                const careerHours = p.totalGameTimePlayed != null ? Math.round(n(p.totalGameTimePlayed) / 3600) : null
                const nq = netQuality(p.worstNetQuality)
                return (
                  <div key={p.playerName} className="rounded-xl border border-white/6 bg-white/3 p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: teamColor(p.team) }} />
                      <span className="text-sm font-bold text-white/85">{p.playerName}</span>
                      {p.isBot && <span className="rounded border border-white/8 bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/20">BOT</span>}
                      <span className="ml-auto text-xs font-bold text-white/45">{p.platform ?? '—'}</span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-x-4 gap-y-2 border-t border-white/6 pt-2.5 text-center">
                      <div>
                        <div className="stat-num text-sm font-black text-white/75">
                          {p.avgPing != null ? `${Math.round(n(p.avgPing))} ms` : <span className="text-white/20">{p.isBot ? 'bot' : '—'}</span>}
                        </div>
                        <div className="text-[10px] text-white/28">Avg Ping</div>
                      </div>
                      <div>
                        <div className="stat-num text-sm text-white/45">
                          {p.maxPing != null ? `${p.maxPing} ms` : <span className="text-white/20">{p.isBot ? 'bot' : '—'}</span>}
                        </div>
                        <div className="text-[10px] text-white/28">Max Ping</div>
                      </div>
                      <div>
                        <div className={`text-sm font-black ${nq.color}`}>
                          {p.isBot && p.worstNetQuality == null ? <span className="font-medium text-white/20">bot</span> : nq.label}
                        </div>
                        <div className="text-[10px] text-white/28">Connection</div>
                      </div>
                      <div>
                        <div className="stat-num text-sm text-white/40">
                          {careerHours != null ? `${careerHours.toLocaleString()} h` : <span className="text-white/20">—</span>}
                        </div>
                        <div className="text-[10px] text-white/28">Career Time</div>
                      </div>
                      <div className="col-span-2">
                        <div className="font-mono text-[11px] text-white/25">
                          {p.partyLeaderId ? p.partyLeaderId.split(':').pop().slice(0, 12) + '…' : <span className="font-sans text-xs not-italic text-white/15">solo</span>}
                        </div>
                        <div className="text-[10px] text-white/28">Party</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-white/20">
                    {['Player', 'Platform', 'Avg Ping', 'Max Ping', 'Connection', 'Career Time', 'Party'].map((h, i) => (
                      <th key={h} className={`pb-2.5 font-black ${i === 0 ? 'pr-4 text-left' : 'px-3 text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...blue, ...orange].map((p) => {
                    const careerHours = p.totalGameTimePlayed != null ? Math.round(n(p.totalGameTimePlayed) / 3600) : null
                    const nq = netQuality(p.worstNetQuality)
                    return (
                      <tr key={p.playerName} className="border-t border-white/4 transition-colors hover:bg-white/2">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: teamColor(p.team) }} />
                            <span className="text-sm font-bold text-white/85">{p.playerName}</span>
                            {p.isBot && <span className="rounded border border-white/8 bg-white/5 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/20">BOT</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right"><span className="text-xs font-bold text-white/45">{p.platform ?? <span className="text-white/15">—</span>}</span></td>
                        <td className="px-3 py-3 text-right text-sm font-black tabular-nums text-white/75">
                          {p.avgPing != null ? `${Math.round(n(p.avgPing))} ms` : <span className="text-xs text-white/15">{p.isBot ? 'bot' : '—'}</span>}
                        </td>
                        <td className="px-3 py-3 text-right text-sm tabular-nums text-white/45">
                          {p.maxPing != null ? `${p.maxPing} ms` : <span className="text-xs text-white/15">{p.isBot ? 'bot' : '—'}</span>}
                        </td>
                        <td className={`px-3 py-3 text-right text-xs font-black ${nq.color}`}>
                          {p.isBot && p.worstNetQuality == null ? <span className="font-medium text-white/15">bot</span> : nq.label}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-white/40">
                          {careerHours != null ? `${careerHours.toLocaleString()} h` : <span className="text-white/15">—</span>}
                        </td>
                        <td className="py-3 pl-3 text-right font-mono text-[11px] text-white/25">
                          {p.partyLeaderId ? p.partyLeaderId.split(':').pop().slice(0, 8) + '…' : <span className="not-italic font-sans text-xs text-white/10">solo</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="mt-4 text-[11px] leading-relaxed text-white/15">
                Ping and connection quality are only available for human players in online matches.
                Bot players show "bot" as their network fields are not replicated.
                Career time is total Rocket League playtime in seconds from the network data, converted to hours.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </ReplayPage>
  )
}
