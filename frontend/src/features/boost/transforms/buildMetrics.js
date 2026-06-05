import { n } from '@/lib/formatters'

export function buildMetrics(players, data) {
  const totalEvents  = data?.events?.length ?? 0
  const totalBig     = players.reduce((s, p) => s + n(p.bigPads),     0)
  const totalSmall   = players.reduce((s, p) => s + n(p.smallPads),   0)
  const totalStolen  = players.reduce((s, p) => s + n(p.boostStolen), 0)
  const topCollector = players.reduce((best, p) => n(p.pickups)      > n(best?.pickups)      ? p : best, players[0])
  const topStealer   = players.reduce((best, p) => n(p.boostStolen)  > n(best?.boostStolen)  ? p : best, players[0])
  return { totalEvents, totalBig, totalSmall, totalStolen, topCollector, topStealer }
}
