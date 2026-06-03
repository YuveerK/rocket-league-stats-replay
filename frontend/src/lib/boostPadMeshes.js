import * as THREE from 'three'

function glowMat(color, intensity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.95,
  })
}

function additiveMat(color, opacity) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
}

/** @returns {{ root: THREE.Group, baseShell: THREE.Group, glowGroup: THREE.Group, emissiveMeshes: THREE.Mesh[], pulseMeshes: THREE.Mesh[] }} */
export function createBigBoostPad(radius) {
  const root = new THREE.Group()
  const baseShell = new THREE.Group()
  const glowGroup = new THREE.Group()
  root.add(baseShell)
  root.add(glowGroup)

  const emissiveMeshes = []
  const pulseMeshes = []
  const baseH = radius * 0.04

  // Dark octagonal platform
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.96, radius * 0.96, baseH, 8),
    new THREE.MeshStandardMaterial({ color: '#151e2e', roughness: 0.55, metalness: 0.85 }),
  )
  platform.position.y = baseH * 0.5
  platform.castShadow = true
  baseShell.add(platform)

  // Flat inner panel (slightly raised, dark gold tint)
  const innerPanel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.74, radius * 0.74, baseH * 0.6, 8),
    new THREE.MeshStandardMaterial({ color: '#2a1e00', roughness: 0.5, metalness: 0.7 }),
  )
  innerPanel.position.y = baseH * 0.85
  baseShell.add(innerPanel)

  // Glowing outer ring on the platform surface
  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.88, radius * 0.05, 6, 8),
    glowMat('#ffbb00', 2.2),
  )
  outerRing.rotation.x = Math.PI / 2
  outerRing.position.y = baseH
  glowGroup.add(outerRing)
  emissiveMeshes.push(outerRing)
  pulseMeshes.push(outerRing)

  // Inner glowing circle on platform surface
  const innerDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, radius * 0.006, 32),
    glowMat('#ffdd55', 1.4),
  )
  innerDisc.position.y = baseH + radius * 0.003
  glowGroup.add(innerDisc)
  emissiveMeshes.push(innerDisc)
  pulseMeshes.push(innerDisc)

  // Thin beam rising from centre
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.022, radius * 0.038, radius * 0.88, 8, 1, true),
    additiveMat('#ffcc33', 0.22),
  )
  beam.position.y = radius * 0.49
  glowGroup.add(beam)

  // Floating golden orb (outer glow shell)
  const orbGlow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.42, 20, 14),
    additiveMat('#ffaa00', 0.55),
  )
  orbGlow.position.y = radius * 0.95
  glowGroup.add(orbGlow)
  pulseMeshes.push(orbGlow)

  // Floating orb (solid bright core)
  const orbCore = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.22, 16, 12),
    glowMat('#ffee66', 2.0),
  )
  orbCore.position.y = radius * 0.95
  glowGroup.add(orbCore)
  emissiveMeshes.push(orbCore)
  pulseMeshes.push(orbCore)

  return { root, baseShell, glowGroup, emissiveMeshes, pulseMeshes, baseH }
}

/** @returns {{ root: THREE.Group, baseShell: THREE.Group, glowGroup: THREE.Group, emissiveMeshes: THREE.Mesh[], pulseMeshes: THREE.Mesh[] }} */
export function createSmallBoostPad(radius) {
  const root = new THREE.Group()
  const baseShell = new THREE.Group()
  const glowGroup = new THREE.Group()
  root.add(baseShell)
  root.add(glowGroup)

  const emissiveMeshes = []
  const pulseMeshes = []
  const baseH = radius * 0.04

  // Flat dark circular base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.82, radius * 0.82, baseH, 16),
    new THREE.MeshStandardMaterial({ color: '#151e2e', roughness: 0.55, metalness: 0.8 }),
  )
  base.position.y = baseH * 0.5
  base.castShadow = true
  baseShell.add(base)

  // 3 orange chevron arrows arranged at 120° pointing outward
  function makeChevron() {
    const shape = new THREE.Shape()
    const w = radius * 0.22
    const h = radius * 0.38
    const notch = radius * 0.12
    // Arrow / chevron pointing in +X direction
    shape.moveTo(0, -w * 0.5)
    shape.lineTo(h * 0.55, 0)
    shape.lineTo(0, w * 0.5)
    shape.lineTo(0, w * 0.5 - notch)
    shape.lineTo(h * 0.55 - notch * 1.4, 0)
    shape.lineTo(0, -(w * 0.5 - notch))
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: baseH * 0.7, bevelEnabled: false })
  }

  for (let i = 0; i < 3; i++) {
    const chevron = new THREE.Mesh(makeChevron(), glowMat('#ff6600', 1.8))
    chevron.rotation.x = -Math.PI / 2
    chevron.rotation.z = (i * Math.PI * 2) / 3
    chevron.position.y = baseH
    // Offset outward along the arm direction
    const angle = (i * Math.PI * 2) / 3
    chevron.position.x = Math.cos(angle) * radius * 0.3
    chevron.position.z = Math.sin(angle) * radius * 0.3
    glowGroup.add(chevron)
    emissiveMeshes.push(chevron)
    pulseMeshes.push(chevron)
  }

  // Small central disc (bright yellow-orange)
  const centre = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, radius * 0.008, 16),
    glowMat('#ffcc00', 1.6),
  )
  centre.position.y = baseH + radius * 0.004
  glowGroup.add(centre)
  emissiveMeshes.push(centre)
  pulseMeshes.push(centre)

  // Soft additive glow halo over the whole pad
  const halo = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, radius * 0.005, 16),
    additiveMat('#ff8800', 0.3),
  )
  halo.position.y = baseH + radius * 0.002
  glowGroup.add(halo)
  pulseMeshes.push(halo)

  return { root, baseShell, glowGroup, emissiveMeshes, pulseMeshes, baseH }
}
