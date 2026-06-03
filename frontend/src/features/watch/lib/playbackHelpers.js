import { n } from './sampleHelpers'

export function teamName(team) { return team === 1 ? 'Orange' : 'Blue' }

export function eventLabel(event) {
  if (!event) return 'No event yet'
  if (event.type === 'goal')  return `Goal - ${event.playerName ?? teamName(event.team)}`
  if (event.type === 'kill')  return `Demo - ${event.playerName ?? 'Unknown'}`
  if (event.type === 'death') return `Demoed - ${event.playerName ?? 'Unknown'}`
  return `${event.type[0].toUpperCase()}${event.type.slice(1)} - ${event.playerName ?? 'Unknown'}`
}

export function eventPlaybackSeconds(event) {
  return n(event?.playbackSeconds ?? event?.elapsedSeconds)
}

export function activeResetSegment(segments, seconds) {
  return (segments ?? []).find((seg) =>
    seconds >= n(seg.goalElapsedSeconds) && seconds < n(seg.countdownEndSeconds),
  ) ?? null
}

export function hasPlaybackTimeMapping(data) {
  return (data?.timeMapping?.length ?? 0) > 1
}

export function rawTimeFromPlayback(timeMapping, seconds) {
  if (!timeMapping?.length) return seconds
  const csecs = seconds * 100
  const first = timeMapping[0]
  const last  = timeMapping[timeMapping.length - 1]
  if (csecs <= first[0]) return first[1] / 100
  if (csecs >= last[0])  return last[1]  / 100

  let lo = 0, hi = timeMapping.length - 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (timeMapping[mid][0] <= csecs) lo = mid + 1
    else hi = mid - 1
  }
  const a    = timeMapping[Math.max(0, lo - 1)]
  const b    = timeMapping[lo]
  const span = Math.max(1, b[0] - a[0])
  const t    = Math.min(1, Math.max(0, (csecs - a[0]) / span))
  return (a[1] + (b[1] - a[1]) * t) / 100
}

export function sceneTimeForPlayback(data, seconds) {
  if (hasPlaybackTimeMapping(data)) return rawTimeFromPlayback(data.timeMapping, seconds)
  const segment = activeResetSegment(data?.resetSegments, seconds)
  if (!segment) return seconds
  const countdownStart = n(segment.countdownStartSeconds)
  if (seconds < countdownStart) return countdownStart
  return seconds
}

export function skipResetDeadTime(segments, previous, next) {
  for (const segment of segments ?? []) {
    const goalTime       = n(segment.goalElapsedSeconds)
    const countdownStart = n(segment.countdownStartSeconds)
    if (next > goalTime && previous < countdownStart && next < countdownStart) {
      return countdownStart
    }
  }
  return next
}

export function countdownLabel(segment, sceneSeconds) {
  if (!segment) return null
  const countdownStart = n(segment.countdownStartSeconds)
  const countdownEnd   = n(segment.countdownEndSeconds)
  if (sceneSeconds < countdownStart || sceneSeconds >= countdownEnd) return null
  const remaining = countdownEnd - sceneSeconds
  if (remaining <= 0.85) return 'GO'
  return String(Math.min(3, Math.max(1, Math.ceil(remaining - 1))))
}
