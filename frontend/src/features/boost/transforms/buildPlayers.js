import { n } from '@/lib/formatters'
import { BLUE_SHADES, ORANGE_SHADES } from '@/lib/team'

export function buildPlayers(rawPlayers) {
  const sorted = [...(rawPlayers ?? [])].sort(
    (a, b) => n(a.team) - n(b.team) || n(b.pickups) - n(a.pickups),
  )
  const tc = {}
  return sorted.map((p, i) => {
    const shades = p.team === 0 ? BLUE_SHADES : ORANGE_SHADES
    const ti = tc[p.team] ?? 0
    tc[p.team] = ti + 1
    return { ...p, key: `p${i}`, color: shades[ti % shades.length] }
  })
}
