import { TEAM_COLORS, TEAM_LABELS } from '@/lib/colors'
import { fmt, fmtPct, n } from '@/lib/formatters'
import { ZONE_COLORS } from '@/features/positioning/constants'

function ZoneBar({ defPct, midPct, attPct }) {
  return (
    <div className="flex h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full"
        style={{
          width: `${defPct}%`,
          background: `linear-gradient(90deg, #1d4ed8, ${ZONE_COLORS.def})`,
          boxShadow: `0 0 10px ${ZONE_COLORS.def}55`,
        }}
      />
      <div
        className="h-full"
        style={{
          width: `${midPct}%`,
          background: `linear-gradient(90deg, #5b21b6, ${ZONE_COLORS.mid})`,
          boxShadow: `0 0 10px ${ZONE_COLORS.mid}55`,
        }}
      />
      <div
        className="h-full"
        style={{
          width: `${attPct}%`,
          background: `linear-gradient(90deg, #065f46, ${ZONE_COLORS.att})`,
          boxShadow: `0 0 10px ${ZONE_COLORS.att}55`,
        }}
      />
    </div>
  )
}

function MiniBar({ value, color }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${n(value)}%`,
          background: color,
          boxShadow: `0 0 8px ${color}80`,
        }}
      />
    </div>
  )
}

export function PlayerPositionCard({ player }) {
  const tc = TEAM_COLORS[player.team] ?? '#94a3b8'
  const zones = player.zones ?? {}
  const positioning = player.positioning ?? {}

  const defPct = n(zones.defPct)
  const midPct = n(zones.midPct)
  const attPct = n(zones.attPct)
  const behindBallOwnHalfPct = n(positioning.behindBallOwnHalfPct)

  return (
    <article
      className="relative overflow-hidden rounded-2xl border"
      style={{ borderColor: `${tc}22`, background: 'rgba(7,10,20,0.75)' }}
    >
      {/* Corner glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
        style={{ background: `${tc}0d` }}
      />

      {/* ── Header ── */}
      <div className="relative border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.055)' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: tc, boxShadow: `0 0 8px ${tc}` }}
            />
            <span className="truncate text-sm font-black text-white/85">{player.playerName}</span>
          </div>
          <span
            className="shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
            style={{ borderColor: `${tc}25`, color: tc, background: `${tc}12` }}
          >
            {TEAM_LABELS[player.team] ?? 'Team'}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-white/30">
          {fmt(player.sampleCount)} position samples
        </p>
      </div>

      {/* ── Field Zones ── */}
      <div className="relative border-b px-4 py-3.5" style={{ borderColor: 'rgba(255,255,255,0.055)' }}>
        <div className="section-label mb-2.5">Field Zones</div>
        <ZoneBar defPct={defPct} midPct={midPct} attPct={attPct} />
        <div className="mt-3 grid grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: ZONE_COLORS.def }}>Def</span>
            <span className="stat-num text-base font-black text-white/80">{fmtPct(zones.defPct)}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: ZONE_COLORS.mid }}>Mid</span>
            <span className="stat-num text-base font-black text-white/80">{fmtPct(zones.midPct)}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: ZONE_COLORS.att }}>Att</span>
            <span className="stat-num text-base font-black text-white/80">{fmtPct(zones.attPct)}</span>
          </div>
        </div>
      </div>

      {/* ── Two-col stats ── */}
      <div className="grid grid-cols-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.055)' }}>
        <div className="border-r px-4 py-3.5" style={{ borderColor: 'rgba(255,255,255,0.055)' }}>
          <div className="section-label mb-1.5">Avg Dist to Ball</div>
          <div className="stat-num text-xl font-black text-white/85">
            {positioning.avgDistanceToBallUU != null ? fmt(positioning.avgDistanceToBallUU) : '—'}
          </div>
          <div className="mt-0.5 text-[10px] text-white/25">unreal units</div>
        </div>
        <div className="px-4 py-3.5">
          <div className="section-label mb-1.5">Behind Ball</div>
          <div className="stat-num text-xl font-black" style={{ color: '#f59e0b' }}>
            {positioning.behindBallPct != null ? fmtPct(positioning.behindBallPct) : '—'}
          </div>
          <div className="mt-0.5 text-[10px] text-white/25">of the time</div>
        </div>
      </div>

      {/* ── Behind ball on own half ── */}
      <div className="px-4 py-3.5">
        <div className="section-label mb-2">Behind Ball on Own Half</div>
        <div className="flex items-center gap-3">
          <span className="stat-num text-2xl font-black" style={{ color: '#a78bfa' }}>
            {positioning.behindBallOwnHalfPct != null ? fmtPct(positioning.behindBallOwnHalfPct) : '—'}
          </span>
          <div className="flex-1">
            <MiniBar value={behindBallOwnHalfPct} color="linear-gradient(90deg, #5b21b6, #a78bfa)" />
          </div>
        </div>
      </div>
    </article>
  )
}
