import { BatteryCharging, Database, Gauge, Layers, Zap } from 'lucide-react'
import { fmt } from '@/lib/formatters'
import { BLUE, ORANGE } from '@/lib/colors'

function EconomyCard({ label, blue, orange, Icon, formatter = (v) => fmt(v), detail }) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="section-label">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.05] text-white/35">
          <Icon size={15} />
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-300/70">Blue</div>
          <div className="stat-num text-xl font-black text-blue-300">{formatter(blue)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-orange-300/70">Orange</div>
          <div className="stat-num text-xl font-black text-orange-300">{formatter(orange)}</div>
        </div>
      </div>
      {detail && <p className="mt-2 text-[11px] text-white/35">{detail}</p>}
    </div>
  )
}

export default function BoostEconomyPanel({ teams, players = [] }) {
  const t0 = teams?.[0] ?? {}
  const t1 = teams?.[1] ?? {}

  const efficiency = (team) => {
    const collected = team.boostCollected ?? 0
    const used = team.boostUsed ?? 0
    if (!collected) return '—'
    return fmt((used / collected) * 100, 1) + '%'
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="section-label mb-1">Boost Economy</p>
        <h2 className="text-xl font-black tracking-tight text-white/90">Collected vs Spent</h2>
        <p className="mt-1 text-sm text-white/60">
          Visible boost meter gains (units), pad counts, and total boost consumed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EconomyCard label="Collected (units)" blue={t0.boostCollected} orange={t1.boostCollected} Icon={Database} formatter={(v) => fmt(v, 1)} />
        <EconomyCard label="Boost used" blue={t0.boostUsed} orange={t1.boostUsed} Icon={BatteryCharging} formatter={(v) => fmt(v, 1)} detail="Total boost meter spent" />
        <EconomyCard label="Big / small pads" blue={`${fmt(t0.bigPads)} / ${fmt(t0.smallPads)}`} orange={`${fmt(t1.bigPads)} / ${fmt(t1.smallPads)}`} Icon={Layers} formatter={(v) => v} />
        <EconomyCard label="Use / collect ratio" blue={efficiency(t0)} orange={efficiency(t1)} Icon={Gauge} formatter={(v) => v} detail="Boost used ÷ boost collected" />
      </div>

      {players.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
          <div className="grid grid-cols-[1fr_repeat(5,minmax(64px,auto))] gap-2 border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/32">
            <span>Player</span>
            <span className="text-right">Collect</span>
            <span className="text-right">Used</span>
            <span className="text-right">Big</span>
            <span className="text-right">Small</span>
            <span className="text-right">Unk.</span>
          </div>
          {[...players].sort((a, b) => (a.team ?? 0) - (b.team ?? 0) || (b.boostCollectedApprox ?? 0) - (a.boostCollectedApprox ?? 0)).map((p) => {
            const color = p.team === 0 ? BLUE : ORANGE
            return (
              <div key={p.playerName} className="grid grid-cols-[1fr_repeat(5,minmax(64px,auto))] items-center gap-2 border-b border-white/[0.04] px-4 py-3 last:border-b-0 hover:bg-white/[0.02]">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                  <span className="truncate text-sm font-bold text-white/78">{p.playerName}</span>
                </div>
                <span className="stat-num text-right text-sm font-black text-emerald-300">{fmt(p.boostCollectedApprox, 1)}</span>
                <span className="stat-num text-right text-sm font-black text-white/70">{fmt(p.boostUsed, 1)}</span>
                <span className="stat-num text-right text-sm font-black text-sky-300">{fmt(p.bigPads)}</span>
                <span className="stat-num text-right text-sm font-black text-violet-300">{fmt(p.smallPads)}</span>
                <span className="stat-num text-right text-sm font-black text-white/35">{fmt(p.unknownPads)}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
