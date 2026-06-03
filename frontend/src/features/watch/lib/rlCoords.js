import * as THREE from 'three'
import { SCALE } from '../constants'
import { n } from './sampleHelpers'

export function rlToThree(x, y, z = 0) {
  return new THREE.Vector3(n(x) * SCALE, n(z) * SCALE, n(y) * SCALE)
}

export function setRlQuaternion(target, state) {
  target.set(-n(state.qx), -n(state.qz), -n(state.qy), n(state.qw, 1))
  if (target.lengthSq() > 0) target.normalize()
  else target.identity()
}

export function rlXZ(x, y) {
  return [x * SCALE, y * SCALE]
}
