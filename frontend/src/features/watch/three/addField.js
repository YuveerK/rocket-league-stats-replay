import * as THREE from 'three'
import {
  CENTER_CIRCLE_RADIUS, FIELD_ATT_THIRD_Y, FIELD_DEF_THIRD_Y,
  FIELD_HALF_LENGTH, FIELD_HALF_WIDTH, FIELD_OCTAGON_RL,
  GOAL_DEPTH, GOAL_HEIGHT_UU, GOAL_WIDTH,
} from '@/lib/fieldLayout'
import { BLUE, ORANGE, SCALE } from '../constants'
import { n } from '../lib/sampleHelpers'
import { rlXZ } from '../lib/rlCoords'
import { addBoostPads } from './boostPads'

export function addField(scene, data) {
  const bounds = data?.fieldBounds
  const maxX = n(bounds?.maxX, FIELD_HALF_WIDTH)
  const maxY = n(bounds?.maxY, FIELD_HALF_LENGTH)
  const fx = maxX * SCALE, fz = maxY * SCALE

  const oct = FIELD_OCTAGON_RL.map(([x, y]) => rlXZ(x, y))
  const firstPersonHiddenObjects = []
  const addFirstPersonHidden = (object) => {
    object.userData.hideInFirstPerson = true
    firstPersonHiddenObjects.push(object)
    scene.add(object)
    return object
  }

  // Grass stripes
  const tc = document.createElement('canvas')
  tc.width = 1; tc.height = 128
  const g = tc.getContext('2d').createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0,    '#0d3820')
  g.addColorStop(0.45, '#091e0d')
  g.addColorStop(0.55, '#091e0d')
  g.addColorStop(1,    '#0d3820')
  tc.getContext('2d').fillStyle = g
  tc.getContext('2d').fillRect(0, 0, 1, 128)
  const stripeTex = new THREE.CanvasTexture(tc)
  stripeTex.wrapS = stripeTex.wrapT = THREE.RepeatWrapping
  stripeTex.repeat.set(1, 8)

  const fieldShape = new THREE.Shape(oct.map(([x, z]) => new THREE.Vector2(x, z)))
  const fieldMesh  = new THREE.Mesh(
    new THREE.ShapeGeometry(fieldShape, 1),
    new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.86, metalness: 0, emissive: '#082010', emissiveIntensity: 0.14 }),
  )
  fieldMesh.rotation.x = -Math.PI / 2
  fieldMesh.position.y = -0.02
  fieldMesh.receiveShadow = true
  scene.add(fieldMesh)

  for (const [side, color] of [[-1, BLUE], [1, ORANGE]]) {
    const zone = new THREE.Mesh(
      new THREE.PlaneGeometry(fx * 1.8, fz * 0.38),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.07, roughness: 1, metalness: 0, depthWrite: false }),
    )
    zone.rotation.x = -Math.PI / 2
    zone.position.set(0, -0.01, side * fz * 0.72)
    scene.add(zone)
  }

  const lineMat = new THREE.LineBasicMaterial({ color: '#dde8f0', transparent: true, opacity: 0.88 })
  const addLine = (pts, mat = lineMat) => scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat))

  addLine([...oct, oct[0]].map(([x, z]) => new THREE.Vector3(x, 0.06, z)))
  addLine([new THREE.Vector3(-fx, 0.06, 0), new THREE.Vector3(fx, 0.06, 0)])
  addLine(
    [new THREE.Vector3(0, 0.06, -fz), new THREE.Vector3(0, 0.06, fz)],
    new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22 }),
  )

  const thirdMat = new THREE.LineBasicMaterial({ color: '#dde8f0', transparent: true, opacity: 0.42 })
  const defThirdZ = FIELD_DEF_THIRD_Y * SCALE, attThirdZ = FIELD_ATT_THIRD_Y * SCALE
  addLine([new THREE.Vector3(-fx, 0.06, defThirdZ), new THREE.Vector3(fx, 0.06, defThirdZ)], thirdMat)
  addLine([new THREE.Vector3(-fx, 0.06, attThirdZ), new THREE.Vector3(fx, 0.06, attThirdZ)], thirdMat)

  const circlePts = new THREE.EllipseCurve(0, 0, CENTER_CIRCLE_RADIUS * SCALE, CENTER_CIRCLE_RADIUS * SCALE, 0, Math.PI * 2)
    .getPoints(96).map((p) => new THREE.Vector3(p.x, 0.06, p.y))
  addLine(circlePts)

  const spot = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 24),
    new THREE.MeshBasicMaterial({ color: '#dde8f0', transparent: true, opacity: 0.55 }),
  )
  spot.rotation.x = -Math.PI / 2
  spot.position.y = 0.03
  scene.add(spot)

  const goalWidth = GOAL_WIDTH * SCALE, goalDepth = GOAL_DEPTH * SCALE, goalHeight = GOAL_HEIGHT_UU * SCALE
  for (const [side, color] of [[-1, BLUE], [1, ORANGE]]) {
    const goal = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(goalWidth, goalHeight, goalDepth)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    )
    goal.position.set(0, goalHeight / 2, side * (fz + goalDepth / 2))
    scene.add(goal)
  }

  const wallH = 4.2
  const wallMat = new THREE.LineBasicMaterial({ color: '#90b4cc', transparent: true, opacity: 0.35 })
  for (let i = 0; i < oct.length; i++) {
    const [x1, z1] = oct[i], [x2, z2] = oct[(i + 1) % oct.length]
    addLine([
      new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, 0, z2),
      new THREE.Vector3(x2, wallH, z2), new THREE.Vector3(x1, wallH, z1), new THREE.Vector3(x1, 0, z1),
    ], wallMat)
  }

  const wallPanelMat = new THREE.MeshStandardMaterial({ color: '#2a4a6a', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, roughness: 0.1, metalness: 0.3 })
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#1a3a5a', transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })

  const addWallQuad = (ax,ay,az, bx,by,bz, cx,cy,cz2, dx,dy,dz) => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([ax,ay,az, bx,by,bz, cx,cy,cz2, dx,dy,dz]), 3))
    geo.setIndex([0,1,2, 0,2,3])
    geo.computeVertexNormals()
    const m = new THREE.Mesh(geo, wallPanelMat)
    m.receiveShadow = true
    addFirstPersonHidden(m)
  }

  const hw = goalWidth / 2
  for (let i = 0; i < oct.length; i++) {
    const [x1, z1] = oct[i], [x2, z2] = oct[(i + 1) % oct.length]
    if (i === 0 || i === 4) {
      addWallQuad(x1,0,z1, -hw,0,z1, -hw,wallH,z1, x1,wallH,z1)
      addWallQuad(hw,0,z2, x2,0,z2, x2,wallH,z2, hw,wallH,z2)
      addWallQuad(x1,goalHeight,z1, x2,goalHeight,z2, x2,wallH,z2, x1,wallH,z1)
    } else {
      addWallQuad(x1,0,z1, x2,0,z2, x2,wallH,z2, x1,wallH,z1)
    }
  }

  const ceilShape = new THREE.Shape(oct.map(([x, z]) => new THREE.Vector2(x, z)))
  const ceil = new THREE.Mesh(new THREE.ShapeGeometry(ceilShape, 1), ceilMat)
  ceil.rotation.x = Math.PI / 2
  ceil.position.y = wallH
  addFirstPersonHidden(ceil)

  scene.userData.firstPersonHiddenObjects = firstPersonHiddenObjects
  return addBoostPads(scene, data)
}
