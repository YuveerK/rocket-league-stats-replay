import * as THREE from 'three'
import { BALL_RADIUS, CAR_VISUAL_COLLISION_RADIUS, CAR_HEIGHT } from '../constants'

function addWorldVisualOffset(car, offset) {
  const visualRoot = car.userData.visualRoot
  if (!visualRoot || offset.lengthSq() <= 0) return
  const inverse = car.quaternion.clone().invert()
  visualRoot.position.add(offset.clone().applyQuaternion(inverse))
}

function flatDirection(from, to, fallbackQuaternion) {
  const direction = from.clone().sub(to)
  direction.y = 0
  if (direction.lengthSq() > 0.0001) return direction.normalize()
  direction.set(1, 0, 0).applyQuaternion(fallbackQuaternion)
  direction.y = 0
  return direction.lengthSq() > 0.0001 ? direction.normalize() : new THREE.Vector3(1, 0, 0)
}

export function resolveVisualOverlaps(sceneRefs) {
  const cars = [...sceneRefs.cars.values()].filter((car) => car.visible)
  for (const car of cars) car.userData.visualRoot?.position.set(0, 0, 0)

  const ballPos      = sceneRefs.ball.getWorldPosition(new THREE.Vector3())
  const ballClearance = BALL_RADIUS + CAR_VISUAL_COLLISION_RADIUS * 0.55

  for (const car of cars) {
    const carPos = car.getWorldPosition(new THREE.Vector3())
    if (Math.abs(carPos.y - ballPos.y) > BALL_RADIUS + CAR_HEIGHT) continue
    const flatDistance = Math.hypot(carPos.x - ballPos.x, carPos.z - ballPos.z)
    if (flatDistance >= ballClearance) continue
    addWorldVisualOffset(car, flatDirection(carPos, ballPos, car.quaternion).multiplyScalar(ballClearance - flatDistance))
  }

  const carClearance = CAR_VISUAL_COLLISION_RADIUS * 1.55
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j]
      const aPos = a.getWorldPosition(new THREE.Vector3())
      const bPos = b.getWorldPosition(new THREE.Vector3())
      if (Math.abs(aPos.y - bPos.y) > CAR_HEIGHT) continue
      const flatDistance = Math.hypot(aPos.x - bPos.x, aPos.z - bPos.z)
      if (flatDistance >= carClearance) continue
      const correction = flatDirection(aPos, bPos, a.quaternion).multiplyScalar((carClearance - flatDistance) * 0.5)
      addWorldVisualOffset(a, correction)
      addWorldVisualOffset(b, correction.clone().multiplyScalar(-1))
    }
  }
}
