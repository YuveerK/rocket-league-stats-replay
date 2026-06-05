export function replayDate(replay) {
  if (typeof replay.matchStartEpoch === 'number') {
    return new Date(replay.matchStartEpoch * 1000)
  }
  if (replay.date) {
    const normalized = replay.date.replace(
      /^(\d{4})-(\d{2})-(\d{2}) (\d{2})-(\d{2})-(\d{2})$/,
      '$1-$2-$3T$4:$5:$6',
    )
    const parsed = new Date(normalized)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  const modified = new Date(replay.modifiedAt)
  return Number.isNaN(modified.getTime()) ? null : modified
}

export function dateInputBoundary(value, endOfDay = false) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day)
  const time = date.getTime()
  return Number.isNaN(time) ? null : time
}

export function formatDate(replay) {
  const date = replayDate(replay)
  if (!date) return 'Unknown date'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatTime(replay) {
  const date = replayDate(replay)
  if (!date) return ''
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function fileSize(bytes) {
  if (!bytes) return ''
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function replayTitle(replay) {
  return replay.replayName || replay.fileName?.replace(/\.replay$/i, '') || 'Replay'
}

export function teamPlayers(replay, team) {
  return (replay.players ?? []).filter((p) => p.team === team)
}

export function resultForPrimaryPlayer(replay) {
  if (replay.primaryPlayerTeam == null || replay.winningTeam == null) return null
  return replay.primaryPlayerTeam === replay.winningTeam ? 'WIN' : 'LOSS'
}

export function scorerSummary(replay) {
  const counts = new Map()
  for (const goal of replay.goals ?? []) {
    counts.set(goal.playerName, (counts.get(goal.playerName) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
}

export function searchableText(replay) {
  return [
    replay.fileName,
    replay.replayName,
    replay.replayId,
    replay.mapName,
    replay.mapDisplayName,
    replay.matchType,
    replay.primaryPlayerName,
    `${replay.team0Score}-${replay.team1Score}`,
    ...(replay.players ?? []).map((p) => p.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
