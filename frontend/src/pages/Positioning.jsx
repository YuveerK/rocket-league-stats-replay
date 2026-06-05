import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  Crosshair, Footprints, MapPin, Navigation, Shield, Target, TrendingUp,
} from 'lucide-react'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { Panel } from '@/components/ui/Panel'
import { MeasuredChart } from '@/components/ui/MeasuredChart'
import { ChartTooltip } from '@/components/ui/ChartTooltip'
import { PageHeader } from '@/components/layout/PageHeader'
import ReplayPage from '@/components/layout/ReplayPage'
import { usePageData } from '@/hooks/usePageData'
import { useAnalysisJob } from '@/hooks/useAnalysisJob'
import { fmt, fmtPct, n, shortName } from '@/lib/formatters'
import { BLUE, ORANGE, GREEN, PURPLE, GOLD } from '@/lib/colors'
import { TEAM_COLORS, TEAM_LABELS } from '@/lib/colors'

const HEADER_GRADIENT =
  'radial-gradient(circle at 14% 0%, rgba(96,165,250,0.22), transparent 32%), ' +
  'radial-gradient(circle at 86% 0%, rgba(167,139,250,0.16), transparent 30%), ' +
  'linear-gradient(135deg,#080b16 0%,#05070f 58%,#090d18 100%)'

const ZONE_COLORS = { def: '#60a5fa', mid: '#a78bfa', att: '#34d399' }

function ZoneStack({ defPct, midPct, attPct }) {
  return (
    <div className="zone-stack">
      <div style={{ width: `${defPct}%`, background: ZONE_COLORS.def }} title={`Def ${defPct}%`} />
      <div style={{ width: `${midPct}%`, background: ZONE_COLORS.mid }} title={`Mid ${midPct}%`} />
      <div style={{ width: `${attPct}%`, background: ZONE_COLORS.att }} title={`Att ${attPct}%`} />
    </div>
  )
}

function PlayerPositionCard({ player }) {
  const tc = TEAM_COLORS[player.team] ?? '#94a3b8'
  const z = player.zones ?? {}
  const pos = player.positioning ?? {}

  return (
    <article className="player-accent-card p-4" style={{ '--card-accent': tc }}>
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl opacity-30" style={{ background: tc }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: tc, boxShadow: `0 0 10px ${tc}` }} />
            <h4 className="truncate text-sm font-black text-[var(--app-text)]">{player.playerName}</h4>
          </div>
          <p className="mt-1 text-xs text-[var(--app-text-secondary)]">{TEAM_LABELS[player.team] ?? 'Team'} · {fmt(player.sampleCount)} samples</p>
        </div>
      </div>

      <div className="relative mt-4">
        <ZoneStack defPct={n(z.defPct)} midPct={n(z.midPct)} attPct={n(z.attPct)} />
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase tracking-wider">
          <span style={{ color: ZONE_COLORS.def }}>Def {fmtPct(z.defPct)}</span>
          <span style={{ color: ZONE_COLORS.mid }}>Mid {fmtPct(z.midPct)}</span>
          <span style={{ color: ZONE_COLORS.att }}>Att {fmtPct(z.attPct)}</span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3">
        <div className="player-accent-card__stat">
          <div className="section-label">Avg dist to ball</div>
          <div className="stat-num mt-1 text-lg font-black text-[var(--app-text)]">{pos.avgDistanceToBallUU != null ? `${fmt(pos.avgDistanceToBallUU)} uu` : '—'}</div>
        </div>
        <div className="player-accent-card__stat">
          <div className="section-label">Behind ball</div>
          <div className="stat-num mt-1 text-lg font-black text-amber-500">{pos.behindBallPct != null ? fmtPct(pos.behindBallPct) : '—'}</div>
        </div>
        <div className="player-accent-card__stat col-span-2">
          <div className="section-label">Behind ball on own half</div>
          <div className="stat-num mt-1 text-lg font-black text-violet-500">
            {pos.behindBallOwnHalfPct != null ? fmtPct(pos.behindBallOwnHalfPct) : '—'}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function Positioning() {
  const { data, loading, error, refetch } = usePageData('/api/positioning')
  const analysis = useAnalysisJob(refetch)
  const status = loading ? 'loading' : (error || !data) ? 'empty' : 'ready'

  const players = useMemo(
    () => [...(data?.players ?? [])].sort((a, b) => n(a.team) - n(b.team) || n(b.positioning?.avgDistanceToBallUU) - n(a.positioning?.avgDistanceToBallUU)),
    [data],
  )

  const blue = data?.teams?.find((t) => t.team === 0) ?? {}
  const orange = data?.teams?.find((t) => t.team === 1) ?? {}

  const zoneRows = useMemo(() => [
    { zone: 'Defensive', Blue: n(blue.defPct), Orange: n(orange.defPct) },
    { zone: 'Midfield', Blue: n(blue.midPct), Orange: n(orange.midPct) },
    { zone: 'Attacking', Blue: n(blue.attPct), Orange: n(orange.attPct) },
  ], [blue, orange])

  const distanceRows = useMemo(() => players.map((p) => ({
    name: shortName(p.playerName, 14),
    distance: n(p.positioning?.avgDistanceToBallUU),
    team: p.team,
    color: TEAM_COLORS[p.team],
  })), [players])

  const closestPlayer = players.reduce((best, p) => {
    const d = p.positioning?.avgDistanceToBallUU
    if (d == null) return best
    if (!best || d < best.positioning?.avgDistanceToBallUU) return p
    return best
  }, null)

  const mostDefensive = players.reduce((best, p) => (n(p.zones?.defPct) > n(best?.zones?.defPct) ? p : best), players[0])

  return (
    <ReplayPage status={status} analysis={analysis} error={error}>
      <div className="anim-fade-in">
        <PageHeader
          gradient={HEADER_GRADIENT}
          eyebrow="Spatial intelligence"
          EyebrowIcon={Crosshair}
          eyebrowColor="#93c5fd"
          title="Positioning Analytics"
          description="Field thirds, ball proximity, and defensive spacing — team-relative zones from car position samples."
          onUpload={analysis.handleAnalysisStart}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <HeroMetric label="Closest to ball" value={shortName(closestPlayer?.playerName, 12) ?? '—'} detail={closestPlayer ? `${fmt(closestPlayer.positioning?.avgDistanceToBallUU)} uu avg` : 'No samples'} color={GREEN} Icon={Target} />
            <HeroMetric label="Most defensive" value={shortName(mostDefensive?.playerName, 12) ?? '—'} detail={mostDefensive ? `${fmtPct(mostDefensive.zones?.defPct)} in def third` : '—'} color={BLUE} Icon={Shield} />
            <HeroMetric label="Blue behind ball" value={blue.behindBallPct != null ? fmtPct(blue.behindBallPct) : '—'} detail="All samples" color={BLUE} Icon={Navigation} />
            <HeroMetric label="Orange behind ball" value={orange.behindBallPct != null ? fmtPct(orange.behindBallPct) : '—'} detail="All samples" color={ORANGE} Icon={Navigation} />
            <HeroMetric label="Match time" value={data?.matchDuration ? `${Math.floor(n(data.matchDuration) / 60)}:${String(Math.floor(n(data.matchDuration) % 60)).padStart(2, '0')}` : '—'} detail={data?.mapName ?? 'Replay'} color={PURPLE} Icon={MapPin} />
          </div>
        </PageHeader>

        <main className="mx-auto max-w-7xl space-y-6 px-8 py-8">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Panel eyebrow="Teams" title="Field Third Control" subtitle="Share of car samples in each zone (team-relative)" Icon={TrendingUp} accent={BLUE}>
              <MeasuredChart height={300}>
                {({ width, height }) => (
                  <BarChart width={width} height={height} data={zoneRows} margin={{ top: 8, right: 10, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="zone" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${fmt(v, 0)}%`} />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
                    <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                    <Bar dataKey="Blue" fill={BLUE} radius={[8, 8, 0, 0]} barSize={32} />
                    <Bar dataKey="Orange" fill={ORANGE} radius={[8, 8, 0, 0]} barSize={32} />
                  </BarChart>
                )}
              </MeasuredChart>
            </Panel>

            <Panel eyebrow="Spacing" title="Team Ball Proximity" subtitle="Average distance to ball and behind-ball rate" Icon={Footprints} accent={GOLD}>
              <div className="space-y-5 py-1">
                {[
                  { label: 'Avg distance to ball', blue: blue.avgDistanceToBallUU, orange: orange.avgDistanceToBallUU, suffix: ' uu' },
                  { label: 'Behind ball (all)', blue: blue.behindBallPct, orange: orange.behindBallPct, pct: true },
                  { label: 'Behind ball (own half)', blue: blue.behindBallOwnHalfPct, orange: orange.behindBallOwnHalfPct, pct: true },
                ].map((row) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-white/40">
                      <span>{row.label}</span>
                      <span>
                        <span className="text-blue-300">{row.pct ? fmtPct(row.blue) : `${fmt(row.blue)}${row.suffix ?? ''}`}</span>
                        <span className="mx-2 text-white/20">vs</span>
                        <span className="text-orange-300">{row.pct ? fmtPct(row.orange) : `${fmt(row.orange)}${row.suffix ?? ''}`}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="h-2 overflow-hidden rounded-full bg-white/6">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${row.pct ? n(row.blue) : Math.min(100, (n(row.blue) / Math.max(n(row.blue), n(row.orange), 1)) * 100)}%` }} />
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/6">
                        <div className="ml-auto h-full rounded-full bg-orange-500" style={{ width: `${row.pct ? n(row.orange) : Math.min(100, (n(row.orange) / Math.max(n(row.blue), n(row.orange), 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <Panel eyebrow="Players" title="Distance To Ball" subtitle="Lower = tighter to play; ranked by average UU distance" Icon={Target} accent={GREEN}>
            <MeasuredChart height={Math.max(260, distanceRows.length * 44)}>
              {({ width, height }) => (
                <BarChart width={width} height={height} data={distanceRows} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${fmt(v)} uu`} />} />
                  <Bar dataKey="distance" name="Avg distance" radius={[0, 8, 8, 0]} barSize={14}>
                    {distanceRows.map((row) => (
                      <Cell key={row.name} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </MeasuredChart>
          </Panel>

          <Panel eyebrow="Roster" title="Player Position Profiles" subtitle="Zone split and defensive positioning per player" Icon={Crosshair} accent={PURPLE}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {players.map((p) => (
                <PlayerPositionCard key={p.playerName} player={p} />
              ))}
            </div>
          </Panel>
        </main>
      </div>
    </ReplayPage>
  )
}
