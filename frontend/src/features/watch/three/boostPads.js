import * as THREE from 'three'
import { buildPadPickupSchedule, getPadStateAt, normalizeBoostPickups } from '@/lib/boostPadSimulation'
import { createBigBoostPad, createSmallBoostPad } from '@/lib/boostPadMeshes'
import { BOOST_PAD_RADIUS_UU, BOOST_PAD_RESPAWN_SEC, STANDARD_BOOST_PADS } from '@/lib/fieldLayout'
import { PAD_PICKUP_GLOW_SEC, PAD_PICKUP_GLOW_PEAK } from '../constants'
import { sampleStateAt } from '../lib/sampleHelpers'
import { rlXZ } from '../lib/rlCoords'

function carOverlapsPad(sceneRefs, pad, seconds) {
  const watchData = sceneRefs?.watchData
  if (!watchData?.players?.length) return false
  const hitRadius = pad.radius * 1.05
  for (const player of watchData.players) {
    const car = sceneRefs.cars?.get(player.playerName)
    if (!car?.visible) continue
    const state = sampleStateAt(player.samples, seconds)
    if (!state) continue
    const [cx, cz] = rlXZ(state.x, state.y)
    if (Math.hypot(cx - pad.cx, cz - pad.cz) <= hitRadius) return true
  }
  return false
}

function carsOnPad(sceneRefs, pad, seconds) {
  const names = [], watchData = sceneRefs?.watchData
  if (!watchData?.players?.length) return names
  const hitRadius = pad.radius * 1.2
  for (const player of watchData.players) {
    const car = sceneRefs.cars?.get(player.playerName)
    if (!car?.visible) continue
    const state = sampleStateAt(player.samples, seconds)
    if (!state) continue
    const [cx, cz] = rlXZ(state.x, state.y)
    if (Math.hypot(cx - pad.cx, cz - pad.cz) <= hitRadius) names.push(player.playerName)
  }
  return names
}

function triggerPadPickupCarGlow(sceneRefs, pad, seconds) {
  const isBig    = pad.padType === 'big'
  const duration = PAD_PICKUP_GLOW_SEC[isBig ? 'big' : 'small']
  const peak     = PAD_PICKUP_GLOW_PEAK[isBig ? 'big' : 'small']
  const color    = isBig ? '#ff8800' : '#fbbf24'
  for (const name of carsOnPad(sceneRefs, pad, seconds)) {
    const car = sceneRefs.cars?.get(name)
    if (!car) continue
    car.userData.padPickupGlowStart = seconds
    car.userData.padPickupGlowUntil = seconds + duration
    car.userData.padPickupGlowPeak  = peak
    car.userData.padPickupGlowColor = color
  }
}

function resolvePadStatus(boostPads, pad, seconds, sceneRefs) {
  let { status, progress = 0 } = getPadStateAt(boostPads.schedule, pad.index, seconds)
  const respawnSec = BOOST_PAD_RESPAWN_SEC[pad.padType]

  if (pad.dynamicTakenAt != null && seconds >= pad.dynamicTakenAt && seconds < pad.dynamicRespawnAt) {
    const fadeStart = pad.dynamicRespawnAt - 0.9
    if (seconds >= fadeStart) {
      status = 'respawning'
      progress = Math.min(1, Math.max(0, (seconds - fadeStart) / 0.9))
    } else {
      status = 'taken'; progress = 0
    }
  }

  if (status === 'active' && carOverlapsPad(sceneRefs, pad, seconds)) {
    pad.dynamicTakenAt   = seconds
    pad.dynamicRespawnAt = seconds + respawnSec
    status = 'taken'; progress = 0
  } else if (status !== 'taken' && seconds >= (pad.dynamicRespawnAt ?? -1)) {
    pad.dynamicTakenAt   = null
    pad.dynamicRespawnAt = null
  }

  return { status, progress }
}

export function addBoostPads(scene, watchData) {
  const padGroup = new THREE.Group()
  padGroup.name = 'boostPads'
  const pickups  = normalizeBoostPickups(watchData?.boostPickups)
  const schedule = buildPadPickupSchedule(pickups)
  const padVisuals = []

  for (const pad of STANDARD_BOOST_PADS) {
    const isBig  = pad.padType === 'big'
    const radius = BOOST_PAD_RADIUS_UU[pad.padType] * 0.01 // SCALE
    const [cx, cz] = rlXZ(pad.x, pad.y)
    const mesh = isBig ? createBigBoostPad(radius) : createSmallBoostPad(radius)
    mesh.root.position.set(cx, 0, cz)
    padGroup.add(mesh.root)
    padVisuals.push({
      index: pad.index, padType: pad.padType, cx, cz, radius,
      root: mesh.root, baseShell: mesh.baseShell, glowGroup: mesh.glowGroup,
      emissiveMeshes: mesh.emissiveMeshes, pulseMeshes: mesh.pulseMeshes,
      baseH: mesh.baseH, dynamicTakenAt: null, dynamicRespawnAt: null, lastStatus: 'active',
    })
  }

  scene.add(padGroup)
  return { group: padGroup, schedule, pads: padVisuals, lastUpdateSeconds: -1 }
}

export function updateBoostPadVisuals(boostPads, seconds, _scene, nowMs, sceneRefs) {
  if (!boostPads?.pads?.length) return
  const pulse = 0.9 + Math.sin(nowMs * 0.0035) * 0.1

  for (const pad of boostPads.pads) {
    const { status, progress = 0 } = resolvePadStatus(boostPads, pad, seconds, sceneRefs)
    const isBig = pad.padType === 'big'

    if (status === 'taken' && pad.lastStatus !== 'taken') triggerPadPickupCarGlow(sceneRefs, pad, seconds)
    pad.lastStatus = status

    pad.root.visible = true
    pad.baseShell.visible = true

    if (status === 'taken') { pad.glowGroup.visible = false; continue }

    pad.glowGroup.visible = true
    const lift = status === 'respawning' ? 0.15 + progress * 0.85 : 1
    pad.glowGroup.scale.setScalar(lift)

    const emissiveBase = isBig ? 1.15 : 0.95
    for (const mesh of pad.emissiveMeshes ?? []) {
      if (mesh.material?.emissiveIntensity != null) mesh.material.emissiveIntensity = emissiveBase * pulse * lift
    }
    for (const mesh of pad.pulseMeshes ?? []) {
      if (mesh.material?.opacity != null && mesh.material?.emissive == null) {
        const base = isBig ? 0.55 : 0.45
        mesh.material.opacity = base * pulse * lift
      }
    }
  }
  boostPads.lastUpdateSeconds = seconds
}
