import { APPLY_VISUAL_OVERLAP_CORRECTION } from '../constants'
import { sampleStateAt } from '../lib/sampleHelpers'
import { rlToThree, setRlQuaternion } from '../lib/rlCoords'
import { applyCarBoostVisuals } from './carBoostVisuals'
import { resolveVisualOverlaps } from './carPhysics'
import { updateBoostPadVisuals } from './boostPads'

export function updateScene(sceneRefs, data, seconds) {
  if (!sceneRefs || !data) return { speeds: {}, boosts: {}, boosting: {} }

  const speeds = {}, boosts = {}, boosting = {}
  const camera = sceneRefs.camera

  for (const player of data.players ?? []) {
    const car   = sceneRefs.cars.get(player.playerName)
    const state = sampleStateAt(player.samples, seconds)
    if (!car || !state) continue

    car.visible = true
    car.position.copy(rlToThree(state.x, state.y, state.z))
    setRlQuaternion(car.quaternion, state)

    let spd = 0
    if (state.vx !== null) {
      spd = Math.round(Math.sqrt(state.vx ** 2 + state.vy ** 2 + state.vz ** 2))
      speeds[player.playerName] = spd
    }

    const boostVisual = applyCarBoostVisuals(sceneRefs, player, seconds, spd, camera)
    if (boostVisual) {
      boosts[player.playerName]   = boostVisual.boostPct
      boosting[player.playerName] = boostVisual.isBoosting
    }
  }

  const ballState = sampleStateAt(data.ball?.samples, seconds)
  if (ballState) {
    sceneRefs.ball.position.copy(rlToThree(ballState.x, ballState.y, ballState.z))
    setRlQuaternion(sceneRefs.ball.quaternion, ballState)
  }

  if (APPLY_VISUAL_OVERLAP_CORRECTION) resolveVisualOverlaps(sceneRefs)

  if (sceneRefs.boostPads && sceneRefs.scene) {
    updateBoostPadVisuals(sceneRefs.boostPads, seconds, sceneRefs.scene, performance.now(), sceneRefs)
  }

  return { speeds, boosts, boosting }
}
