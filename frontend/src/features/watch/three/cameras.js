import * as THREE from 'three'

export const VIEW_TARGET = new THREE.Vector3(0, 0, 0)

export function setBroadcastCamera(sceneRefs) {
  if (!sceneRefs) return
  sceneRefs.camera.position.set(0, 95, 76)
  sceneRefs.camera.up.set(0, 1, 0)
  sceneRefs.camera.updateProjectionMatrix()
  sceneRefs.controls.target.copy(VIEW_TARGET)
  sceneRefs.controls.update()
}

export function setTopCamera(sceneRefs) {
  if (!sceneRefs) return
  sceneRefs.camera.position.set(0, 150, 0.1)
  sceneRefs.camera.up.set(0, 0, -1)
  sceneRefs.camera.updateProjectionMatrix()
  sceneRefs.controls.target.copy(VIEW_TARGET)
  sceneRefs.controls.update()
}
