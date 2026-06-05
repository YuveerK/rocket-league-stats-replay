import { useMemo } from 'react'
import { Swords } from 'lucide-react'
import { fmt, shortName } from '@/lib/formatters'
import { TEAM_COLORS } from '@/lib/colors'

function cellTone(count, max) {
  if (!count) return { bg: 'rgba(255,255,255,0.02)', text: 'rgba(255,255,255,0.12)' }
  const intensity = Math.min(1, count / Math.max(1, max))
  return {
    bg: `rgba(244,63,94,${0.12 + intensity * 0.45})`,
    text: intensity > 0.5 ? '#fff' : 'rgba(255,255,255,0.75)',
    glow: intensity > 0.6 ? '0 0 16px rgba(244,63,94,0.35)' : undefined,
  }
}

export default function DemoMatrix({ matrix, players = [] }) {
  const names = matrix?.players?.length ? matrix.players : players.map((p) => p.playerName)
  const cells = matrix?.cells ?? []
  const maxCount = Math.max(1, ...cells.map((c) => c.count))

  const playerMeta = useMemo(() => {
    const map = new Map()
    for (const p of players) map.set(p.playerName, p)
    return map
  }, [players])

  const lookup = useMemo(() => {
    const map = new Map()
    for (const c of cells) map.set(`${c.attacker}|${c.victim}`, c.count)
    return map
  }, [cells])

  if (!names.length) return null

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label mb-1">Demo War Room</p>
          <h2 className="section-heading">Demo Matrix</h2>
          <p className="mt-1 text-sm text-white/60">
            Rows inflicted · columns were demoed · brighter cells = more demos.
          </p>
        </div>
        {matrix?.topPair && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm">
            <span className="text-white/40">Top rivalry </span>
            <span className="font-black text-white">{shortName(matrix.topPair.attacker, 14)}</span>
            <span className="text-red-300"> → </span>
            <span className="font-black text-white">{shortName(matrix.topPair.victim, 14)}</span>
            <span className="ml-2 font-mono text-red-200">×{fmt(matrix.topPair.count)}</span>
          </div>
        )}
      </div>

      <div className="theme-card-gradient card relative overflow-hidden">
        <div className="theme-card-top-line absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/35 to-transparent" />

        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[640px] border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[#0a0e19]/95 px-2 py-2 text-left">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                    <Swords size={12} className="text-red-400" />
                    Inflicted ↓
                  </span>
                </th>
                {names.map((name) => (
                  <th key={name} className="px-1 py-2 text-center">
                    <span className="block max-w-[72px] truncate text-[10px] font-black uppercase tracking-wide text-white/40" title={name}>
                      {shortName(name, 10)}
                    </span>
                    <span className="mt-0.5 block text-[9px] text-white/22">victim</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {names.map((attacker) => {
                const meta = playerMeta.get(attacker)
                const teamColor = TEAM_COLORS[meta?.team] ?? '#94a3b8'
                return (
                  <tr key={attacker}>
                    <td className="sticky left-0 z-10 rounded-lg border border-white/[0.06] bg-[#0a0e19]/95 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: teamColor, boxShadow: `0 0 8px ${teamColor}` }} />
                        <span className="max-w-[120px] truncate text-xs font-bold text-white/75" title={attacker}>
                          {shortName(attacker, 16)}
                        </span>
                      </div>
                    </td>
                    {names.map((victim) => {
                      const count = attacker === victim ? 0 : (lookup.get(`${attacker}|${victim}`) ?? 0)
                      const tone = cellTone(count, maxCount)
                      return (
                        <td key={`${attacker}-${victim}`} className="p-0.5">
                          <div
                            className="flex h-11 min-w-[52px] items-center justify-center rounded-lg border border-white/[0.05] font-mono text-sm font-black transition"
                            style={{
                              background: tone.bg,
                              color: tone.text,
                              boxShadow: tone.glow,
                            }}
                            title={count ? `${attacker} demoed ${victim} ${count}×` : undefined}
                          >
                            {count || '·'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
