import { n } from '@/lib/formatters'
import { usableLocation, medianLocation } from '@/lib/stats'

function fallbackPadType(events) {
  if (events.some(e => e.padType === 'big'))   return 'big'
  if (events.some(e => e.padType === 'small')) return 'small'
  return 'unknown'
}

export function buildPads(data) {
  if (Array.isArray(data?.pads) && data.pads.length) {
    return data.pads
      .filter(pad => Number.isFinite(Number(pad.x)) && Number.isFinite(Number(pad.y)))
      .map(pad => ({
        ...pad,
        x: n(pad.x),
        y: n(pad.y),
        padType: pad.padType ?? 'unknown',
        pickupsByPlayer: pad.pickupsByPlayer ?? {},
        stolenByPlayer:  pad.stolenByPlayer  ?? {},
      }))
  }

  const map = new Map()
  for (const ev of (data?.events ?? [])) {
    const fallbackLocation = ev.padLocation ?? ev.location ?? ev.carLocationAtPickup
    const key =
      ev.pickupObjectName ??
      ev.padId ??
      (usableLocation(fallbackLocation)
        ? `${Math.round(n(fallbackLocation.x) / 256)}:${Math.round(n(fallbackLocation.y) / 256)}`
        : ev.pickupActorId)

    if (key == null) continue

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        events: [],
        locations: [],
        padType: ev.padType ?? 'unknown',
        pickupsByPlayer: {},
        stolenByPlayer: {},
      })
    }

    const pad = map.get(key)
    pad.events.push(ev)
    if (usableLocation(fallbackLocation)) pad.locations.push(fallbackLocation)

    if (ev.playerName) {
      pad.pickupsByPlayer[ev.playerName] = (pad.pickupsByPlayer[ev.playerName] || 0) + 1
      if (ev.isStolen) {
        pad.stolenByPlayer[ev.playerName] = (pad.stolenByPlayer[ev.playerName] || 0) + 1
      }
    }
  }

  return Array.from(map.values())
    .map(pad => {
      const location = medianLocation(pad.locations)
      if (!location) return null
      return {
        id: pad.id,
        x: location.x,
        y: location.y,
        z: location.z,
        padType: fallbackPadType(pad.events),
        pickupsByPlayer: pad.pickupsByPlayer,
        stolenByPlayer:  pad.stolenByPlayer,
      }
    })
    .filter(Boolean)
}
