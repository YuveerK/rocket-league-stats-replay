import { BLUE, ORANGE, PAD_PICKUP_GLOW_SEC } from '../constants'
import {
  sampleBoostAmountAt, sampleStateAt, isBoostingFromSamples, boostToPercent,
} from '../lib/sampleHelpers'

function teamColor(team) { return team === 1 ? ORANGE : BLUE }

export function applyCarBoostVisuals(sceneRefs, player, seconds, speed, camera) {
  const car = sceneRefs.cars.get(player.playerName)
  if (!car) return null

  const boostAmount   = sampleBoostAmountAt(player.samples, seconds)
  const exhaustMeshes = car.userData.exhaustMeshes
  const boostLight    = car.userData.boostLight
  const boostBar      = car.userData.boostBar

  if (boostAmount == null) {
    if (boostBar) boostBar.visible = false
    if (exhaustMeshes) exhaustMeshes.forEach(m => { m.material.opacity = 0 })
    if (boostLight)    boostLight.intensity = 0
    return null
  }

  const boostPct = boostToPercent(boostAmount)
  const state    = sampleStateAt(player.samples, seconds)
  const isBoosting = state ? isBoostingFromSamples(player, seconds, state, car) : false
  car.userData.boost = boostPct

  const bodyMat     = car.userData.bodyMat
  const glowUntil   = car.userData.padPickupGlowUntil
  if (bodyMat) {
    const baseEmissive  = car.userData.baseBodyEmissive ?? 0.24
    const pickupColor   = car.userData.padPickupGlowColor ?? '#fbbf24'
    let pickupBoost = 0
    if (glowUntil != null && seconds < glowUntil) {
      const start = car.userData.padPickupGlowStart ?? glowUntil - PAD_PICKUP_GLOW_SEC.small
      const span  = Math.max(0.05, glowUntil - start)
      const t     = Math.min(1, Math.max(0, (seconds - start) / span))
      pickupBoost = (car.userData.padPickupGlowPeak ?? 0.35) * (1 - t)
    } else if (glowUntil != null) {
      car.userData.padPickupGlowUntil = null
      car.userData.padPickupGlowStart = null
    }
    bodyMat.emissive.set(pickupBoost > 0.02 ? pickupColor : teamColor(player.team))
    bodyMat.emissiveIntensity = baseEmissive + pickupBoost
  }

  if (boostBar?.userData.fillMesh && boostPct != null) {
    boostBar.visible = true
    boostBar.userData.fillMesh.scale.x = boostPct / 100
    boostBar.userData.fillMesh.material.color.set(isBoosting ? '#ff6a00' : '#f59e0b')
    boostBar.userData.fillMesh.material.opacity = isBoosting ? 1 : 0.92
    if (camera) boostBar.quaternion.copy(camera.quaternion)
  }

  if (exhaustMeshes) {
    const intensity = isBoosting ? Math.min(1, 0.65 + (speed > 1400 ? 0.35 : 0.15)) : 0
    for (let i = 0; i < exhaustMeshes.length; i++) {
      const mesh = exhaustMeshes[i], isCore = i % 2 === 1
      mesh.material.opacity = isCore ? intensity * 0.95 : intensity * 0.8
      mesh.scale.set(
        (isCore ? 0.75 : 1) + intensity * (isCore ? 0.5 : 1.1),
        1 + intensity * 0.35,
        (isCore ? 0.75 : 1) + intensity * (isCore ? 0.5 : 1.1),
      )
    }
  }

  if (boostLight) boostLight.intensity = isBoosting ? 12 + Math.min(8, speed / 400) : 0

  return { boostPct, isBoosting }
}
