import { BOOST_PAD_RESPAWN_SEC, STANDARD_BOOST_PADS, snapPadIndex } from '@/lib/fieldLayout'

const RESPAWN_FADE_SEC = 0.9

/** @typedef {{ padIndex: number, seconds: number, padType: 'big'|'small', playerName?: string }} BoostPickupEvent */

/**
 * @param {BoostPickupEvent[]} boostPickups
 * @returns {Map<number, { takenAt: number, respawnAt: number, playerName?: string }[]>}
 */
export function buildPadPickupSchedule(boostPickups) {
  const byPad = new Map()

  const sorted = [...(boostPickups ?? [])]
    .filter((p) => p.padIndex != null && Number.isFinite(p.seconds))
    .sort((a, b) => a.seconds - b.seconds || a.padIndex - b.padIndex)

  for (const pickup of sorted) {
    const padType = pickup.padType === 'big' ? 'big' : 'small'
    const respawnSec = BOOST_PAD_RESPAWN_SEC[padType]
    const list = byPad.get(pickup.padIndex) ?? []
    const last = list[list.length - 1]

    // Network emits several picked_up states per collection; keep one cycle per respawn window.
    if (last && pickup.seconds < last.respawnAt - 0.05) continue

    list.push({
      takenAt: pickup.seconds,
      respawnAt: pickup.seconds + respawnSec,
      playerName: pickup.playerName,
    })
    byPad.set(pickup.padIndex, list)
  }

  return byPad
}

/**
 * @param {Map<number, { takenAt: number, respawnAt: number }[]>} schedule
 * @param {number} padIndex
 * @param {number} seconds
 * @returns {{ status: 'active'|'taken'|'respawning', progress?: number }}
 */
export function getPadStateAt(schedule, padIndex, seconds) {
  const events = schedule.get(padIndex) ?? []

  let activeCycle = null
  for (const ev of events) {
    if (ev.takenAt <= seconds) activeCycle = ev
    else break
  }

  if (!activeCycle || seconds >= activeCycle.respawnAt) {
    return { status: 'active' }
  }

  const fadeStart = activeCycle.respawnAt - RESPAWN_FADE_SEC
  if (seconds >= fadeStart) {
    return {
      status: 'respawning',
      progress: Math.min(1, Math.max(0, (seconds - fadeStart) / RESPAWN_FADE_SEC)),
    }
  }

  return { status: 'taken' }
}

/**
 * Normalize raw pickup events from the API into playback seconds + pad index.
 * @param {Array<{ seconds: number, padIndex?: number, padType?: string, playerName?: string, x?: number, y?: number }>} raw
 */
export function normalizeBoostPickups(raw) {
  return (raw ?? [])
    .map((event) => {
      const padIndex = event.padIndex ?? snapPadIndex(event.x, event.y)
      if (padIndex == null) return null
      const pad = STANDARD_BOOST_PADS[padIndex]
      const padType = event.padType === 'big' || event.padType === 'small'
        ? event.padType
        : pad?.padType ?? 'small'
      return {
        padIndex,
        seconds: event.seconds,
        padType,
        playerName: event.playerName,
      }
    })
    .filter(Boolean)
}
