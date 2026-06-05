import { TEAM_COLORS } from '@/lib/colors'
import { n, shortName } from '@/lib/formatters'

function findTeam(data, team) {
  return data?.teams?.find((entry) => entry.team === team) ?? {}
}

function buildPlayers(data) {
  return [...(data?.players ?? [])].sort((a, b) => (
    n(a.team) - n(b.team) ||
    n(b.positioning?.avgDistanceToBallUU) - n(a.positioning?.avgDistanceToBallUU)
  ))
}

function findClosestPlayer(players) {
  return players.reduce((best, player) => {
    const distance = player.positioning?.avgDistanceToBallUU

    if (distance == null) return best
    if (!best || distance < best.positioning?.avgDistanceToBallUU) return player
    return best
  }, null)
}

function findMostDefensivePlayer(players) {
  return players.reduce(
    (best, player) => (n(player.zones?.defPct) > n(best?.zones?.defPct) ? player : best),
    players[0],
  )
}

function buildZoneRows(blue, orange) {
  return [
    { zone: 'Defensive', Blue: n(blue.defPct), Orange: n(orange.defPct) },
    { zone: 'Midfield', Blue: n(blue.midPct), Orange: n(orange.midPct) },
    { zone: 'Attacking', Blue: n(blue.attPct), Orange: n(orange.attPct) },
  ]
}

function buildDistanceRows(players) {
  return players.map((player) => ({
    name: shortName(player.playerName, 14),
    distance: n(player.positioning?.avgDistanceToBallUU),
    team: player.team,
    color: TEAM_COLORS[player.team],
  }))
}

function buildSpacingRows(blue, orange) {
  return [
    {
      label: 'Avg distance to ball',
      blue: blue.avgDistanceToBallUU,
      orange: orange.avgDistanceToBallUU,
      suffix: ' uu',
    },
    {
      label: 'Behind ball (all)',
      blue: blue.behindBallPct,
      orange: orange.behindBallPct,
      pct: true,
    },
    {
      label: 'Behind ball (own half)',
      blue: blue.behindBallOwnHalfPct,
      orange: orange.behindBallOwnHalfPct,
      pct: true,
    },
  ]
}

export function buildPositioningViewModel(data) {
  const players = buildPlayers(data)
  const blue = findTeam(data, 0)
  const orange = findTeam(data, 1)

  return {
    teams: { blue, orange },
    players,
    closestPlayer: findClosestPlayer(players),
    mostDefensive: findMostDefensivePlayer(players),
    zoneRows: buildZoneRows(blue, orange),
    distanceRows: buildDistanceRows(players),
    spacingRows: buildSpacingRows(blue, orange),
  }
}
