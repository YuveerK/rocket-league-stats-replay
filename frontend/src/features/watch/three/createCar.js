import * as THREE from 'three'
import {
  BLUE, ORANGE,
  CAR_LENGTH, CAR_WIDTH, CAR_HEIGHT,
  CAR_ORIGIN_GROUND_OFFSET, CAR_BODY_VISUAL_LIFT,
} from '../constants'

function teamColor(team) { return team === 1 ? ORANGE : BLUE }

function makeLabelSprite(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const grad = ctx.createLinearGradient(14, 22, 498, 98)
  grad.addColorStop(0, 'rgba(5,8,22,0.94)')
  grad.addColorStop(1, 'rgba(5,8,22,0.80)')
  ctx.fillStyle = grad
  ctx.strokeStyle = color
  ctx.lineWidth = 3.5
  ctx.roundRect(14, 22, 484, 76, 20)
  ctx.fill(); ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(14, 22, 7, 76, [20, 0, 0, 20])
  ctx.fill()
  ctx.font = '700 40px Arial'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f0f4ff'
  ctx.fillText(text, 264, 61, 430)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }))
  sprite.scale.set(6.4, 1.6, 1)
  sprite.position.set(0, 2.25, 0)
  return sprite
}

function createBoostBar(color) {
  const group = new THREE.Group()
  group.position.set(0, 3.35, 0)

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.16),
    new THREE.MeshBasicMaterial({ color: '#050814', transparent: true, opacity: 0.9, depthWrite: false }),
  )
  group.add(bg)

  const fillGeo = new THREE.PlaneGeometry(1.42, 0.1)
  fillGeo.translate(0.71, 0, 0)
  const fill = new THREE.Mesh(
    fillGeo,
    new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.95, depthWrite: false }),
  )
  fill.position.set(-0.71, 0, 0.01)
  group.add(fill)

  const rim = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 0.16),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }),
  )
  rim.position.z = 0.005
  group.add(rim)

  group.userData.fillMesh = fill
  return group
}

export function createCar(player) {
  const color = teamColor(player.team)
  const group = new THREE.Group()
  const visualRoot = new THREE.Group()
  const firstPersonHiddenObjects = []
  group.add(visualRoot)
  group.userData.visualRoot = visualRoot

  const modelYOffset = CAR_HEIGHT * 0.5 - CAR_ORIGIN_GROUND_OFFSET
  const bodyYOffset  = modelYOffset + CAR_BODY_VISUAL_LIFT

  const bodyMat      = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.55, emissive: color, emissiveIntensity: 0.24 })
  const darkMat      = new THREE.MeshStandardMaterial({ color: '#0d1117', roughness: 0.65, metalness: 0.25 })
  const glassMat     = new THREE.MeshStandardMaterial({ color: '#111e33', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75 })
  const headlightMat = new THREE.MeshStandardMaterial({ color: '#fff0aa', emissive: '#fff0aa', emissiveIntensity: 3.0, roughness: 0.1, metalness: 0 })
  const taillightMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3.5, roughness: 0.1, metalness: 0 })
  const wheelMat     = new THREE.MeshStandardMaterial({ color: '#141821', roughness: 0.9, metalness: 0.05 })
  const rimMat       = new THREE.MeshStandardMaterial({ color: '#8899aa', roughness: 0.3, metalness: 0.8 })
  const spoilerMat   = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.35, metalness: 0.7 })

  const add = (geo, mat, px, py, pz, rx = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(px, py + bodyYOffset, pz)
    if (rx) m.rotation.x = rx
    visualRoot.add(m)
    return m
  }
  const addWheel = (geo, mat, px, py, pz, rx = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(px, py + modelYOffset, pz)
    if (rx) m.rotation.x = rx
    visualRoot.add(m)
    return m
  }

  const BL = CAR_LENGTH, BH = CAR_HEIGHT, BW = CAR_WIDTH
  const lbH = BH * 0.52, lbY = -BH * 0.5 + (BH * 0.52) * 0.5
  add(new THREE.BoxGeometry(BL, lbH, BW), bodyMat, 0, lbY, 0)

  const cbH = BH * 0.5, cbL = BL * 0.53, cbW = BW * 0.83
  const cbY = lbY + lbH * 0.5 + cbH * 0.5
  firstPersonHiddenObjects.push(
    add(new THREE.BoxGeometry(cbL, cbH, cbW), bodyMat, -BL * 0.04, cbY, 0),
    add(new THREE.BoxGeometry(0.07, cbH * 0.8,  cbW * 0.88), glassMat,  -BL * 0.04 + cbL * 0.5, cbY, 0),
    add(new THREE.BoxGeometry(0.07, cbH * 0.72, cbW * 0.85), glassMat,  -BL * 0.04 - cbL * 0.5, cbY, 0),
  )

  const bY = lbY - 0.02
  add(new THREE.BoxGeometry(0.12, BH * 0.36, BW * 0.9), darkMat,  BL * 0.5 + 0.06, bY, 0)
  add(new THREE.BoxGeometry(0.12, BH * 0.36, BW * 0.9), darkMat, -BL * 0.5 - 0.06, bY, 0)
  add(new THREE.BoxGeometry(0.22, 0.055, BW * 1.02),    darkMat,  BL * 0.5 + 0.12, -BH * 0.48, 0)

  const lY = lbY + BH * 0.14
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.08, BH * 0.24, BW * 0.24), headlightMat,  BL * 0.5 + 0.04, lY, s * BW * 0.28)
    add(new THREE.BoxGeometry(0.08, BH * 0.24, BW * 0.24), taillightMat, -BL * 0.5 - 0.04, lY, s * BW * 0.28)
  }

  const spPostH = BH * 0.42, spBaseY = cbY + cbH * 0.5
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.06, spPostH, 0.06), spoilerMat, -BL * 0.38, spBaseY + spPostH * 0.5, s * cbW * 0.36)
  }
  add(new THREE.BoxGeometry(0.32, 0.07, cbW * 0.9), spoilerMat, -BL * 0.38, spBaseY + spPostH, 0)

  const wR = BH * 0.32, wT = BW * 0.17
  const wX = BL * 0.36, wY = -BH * 0.5 + wR, wZ = BW * 0.5 + wT * 0.42 + 0.02
  for (const [x, z] of [[wX, wZ], [wX, -wZ], [-wX, wZ], [-wX, -wZ]]) {
    addWheel(new THREE.CylinderGeometry(wR, wR, wT, 16), wheelMat, x, wY, z, Math.PI / 2)
    addWheel(new THREE.CylinderGeometry(wR * 0.58, wR * 0.6, wT + 0.01, 8), rimMat, x, wY, z, Math.PI / 2)
  }

  const exhaustMeshes = []
  for (const s of [-1, 1]) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.75, 10),
      new THREE.MeshBasicMaterial({ color: '#ff8800', transparent: true, opacity: 0, depthWrite: false }),
    )
    flame.rotation.z = Math.PI / 2
    flame.position.set(-BL * 0.5 - 0.35, -BH * 0.05 + bodyYOffset, s * BW * 0.22)
    flame.renderOrder = 10
    visualRoot.add(flame)
    exhaustMeshes.push(flame)

    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.45, 8),
      new THREE.MeshBasicMaterial({ color: '#fff4c2', transparent: true, opacity: 0, depthWrite: false }),
    )
    core.rotation.z = Math.PI / 2
    core.position.set(-BL * 0.5 - 0.28, -BH * 0.05 + bodyYOffset, s * BW * 0.22)
    core.renderOrder = 11
    visualRoot.add(core)
    exhaustMeshes.push(core)
  }

  group.userData.exhaustMeshes    = exhaustMeshes
  group.userData.bodyMat          = bodyMat
  group.userData.baseBodyEmissive = 0.24

  const boostLight = new THREE.PointLight('#ff8800', 0, 8, 2)
  boostLight.position.set(-BL * 0.5 - 0.4, -BH * 0.05 + bodyYOffset, 0)
  group.add(boostLight)
  group.userData.boostLight = boostLight

  const boostBar = createBoostBar(color)
  group.add(boostBar)
  group.userData.boostBar = boostBar
  firstPersonHiddenObjects.push(boostBar)

  group.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true } })

  const label = makeLabelSprite(player.playerName, color)
  label.position.set(0, 2.8, 0)
  group.add(label)
  firstPersonHiddenObjects.push(label)

  group.userData.firstPersonHiddenObjects = firstPersonHiddenObjects

  return group
}
