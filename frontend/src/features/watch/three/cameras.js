import * as THREE from 'three'
import { CAR_LENGTH, CAR_HEIGHT } from '../constants'

export const VIEW_TARGET = new THREE.Vector3(0, 0, 0)

// Reusable vectors so the first-person path doesn't allocate every frame
const _fwd   = new THREE.Vector3()
const _up    = new THREE.Vector3()
const _right = new THREE.Vector3()
const _pos   = new THREE.Vector3()
const _look  = new THREE.Vector3()

function setFirstPersonObstructionsVisible(sceneRefs, visible) {
  const objects = sceneRefs?.scene?.userData?.firstPersonHiddenObjects ?? []
  for (const object of objects) object.visible = visible
}

function restoreFirstPersonCarVisuals(sceneRefs) {
  const objects = sceneRefs?.firstPersonHiddenCar?.userData?.firstPersonHiddenObjects ?? []
  for (const object of objects) object.visible = true
  sceneRefs.firstPersonHiddenCar = null
}

function hideFirstPersonCarVisuals(sceneRefs, playerName) {
  restoreFirstPersonCarVisuals(sceneRefs)
  const car = sceneRefs?.cars?.get(playerName)
  const objects = car?.userData?.firstPersonHiddenObjects ?? []
  for (const object of objects) object.visible = false
  sceneRefs.firstPersonHiddenCar = car ?? null
}

export function setBroadcastCamera(sceneRefs) {
  if (!sceneRefs) return
  clearFirstPersonCamera(sceneRefs)
  sceneRefs.camera.position.set(0, 95, 76)
  sceneRefs.camera.up.set(0, 1, 0)
  sceneRefs.camera.updateProjectionMatrix()
  sceneRefs.controls.target.copy(VIEW_TARGET)
  sceneRefs.controls.update()
}

export function setTopCamera(sceneRefs) {
  if (!sceneRefs) return
  clearFirstPersonCamera(sceneRefs)
  sceneRefs.camera.position.set(0, 150, 0.1)
  sceneRefs.camera.up.set(0, 0, -1)
  sceneRefs.camera.updateProjectionMatrix()
  sceneRefs.controls.target.copy(VIEW_TARGET)
  sceneRefs.controls.update()
}

export function setFirstPersonCamera(sceneRefs, playerName) {
  if (!sceneRefs) return
  sceneRefs.firstPersonTarget = playerName
  sceneRefs.controls.enabled = false
  setFirstPersonObstructionsVisible(sceneRefs, false)
  hideFirstPersonCarVisuals(sceneRefs, playerName)
}

export function clearFirstPersonCamera(sceneRefs) {
  if (!sceneRefs) return
  restoreFirstPersonCarVisuals(sceneRefs)
  sceneRefs.firstPersonTarget = null
  sceneRefs.controls.enabled = true
  sceneRefs.camera.up.set(0, 1, 0)
  setFirstPersonObstructionsVisible(sceneRefs, true)
}

/**
 * Called every frame from the animate loop when firstPersonTarget is set.
 * Positions the camera just ahead of the car body and aims it along the car's
 * forward axis, with a slight downward pitch so the field is visible.
 */
export function tickFirstPersonCamera(sceneRefs) {
  const { firstPersonTarget, cars, camera } = sceneRefs
  if (!firstPersonTarget || !cars) return

  const car = cars.get(firstPersonTarget)
  if (!car) return

  // Car axes in world space
  _fwd.set(1, 0, 0).applyQuaternion(car.quaternion)   // car forward  (+X local)
  _up.set(0, 1, 0).applyQuaternion(car.quaternion)    // car roof up  (+Y local)
  _right.set(0, 0, 1).applyQuaternion(car.quaternion) // car right    (+Z local)

  // Eye point: hood camera, far enough back to keep the hood in frame while
  // staying above the glass and body meshes.
  _pos.copy(car.position)
    .addScaledVector(_up, CAR_HEIGHT + 0.08)
    .addScaledVector(_fwd, CAR_LENGTH * 0.08)

  // Look target: far ahead along forward axis, very slight downward tilt
  _look.copy(_pos)
    .addScaledVector(_fwd, 30)
    .addScaledVector(_up, -10.5)   // hood-visible nose-down pitch

  camera.position.copy(_pos)
  camera.up.copy(_up)
  camera.lookAt(_look)
}
