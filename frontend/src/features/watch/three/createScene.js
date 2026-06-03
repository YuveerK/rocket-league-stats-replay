import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BALL_RADIUS, PAN_SPEED_BASE, PAN_SPEED_FAST, PAN_SPEED_MIN, PAN_SPEED_MAX } from '../constants'
import { VIEW_TARGET } from './cameras'
import { addField } from './addField'
import { createCar } from './createCar'
import { updateScene } from './updateScene'

export function createScene(mount, data, panSpeedRef) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#02040a')
  scene.fog = new THREE.Fog('#02040a', 180, 380)

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500)
  camera.position.set(0, 95, 76)
  camera.up.set(0, 1, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace  = THREE.SRGBColorSpace
  renderer.toneMapping       = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.35
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type    = THREE.PCFShadowMap
  mount.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping  = true
  controls.dampingFactor  = 0.08
  controls.enablePan      = true
  controls.panSpeed       = 1.2
  controls.maxPolarAngle  = Math.PI * 0.49
  controls.minDistance    = 5
  controls.maxDistance    = 400
  controls.target.copy(VIEW_TARGET)

  scene.add(new THREE.HemisphereLight('#1a3050', '#071a0a', 4.5))
  const keyLight = new THREE.DirectionalLight('#ffffff', 8)
  keyLight.position.set(-25, 75, 35)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.camera.near   = 0.5
  keyLight.shadow.camera.far    = 260
  keyLight.shadow.camera.left   = -65
  keyLight.shadow.camera.right  = 65
  keyLight.shadow.camera.top    = 80
  keyLight.shadow.camera.bottom = -80
  keyLight.shadow.bias = -0.0005
  scene.add(keyLight)
  const fillLight = new THREE.DirectionalLight('#3b6fff', 3.0)
  fillLight.position.set(30, 50, -35)
  scene.add(fillLight)
  const rimLight = new THREE.DirectionalLight('#ff7022', 2.0)
  rimLight.position.set(0, 18, 88)
  scene.add(rimLight)

  const boostPads = addField(scene, data)

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 32, 20),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, metalness: 0.3, emissive: '#6699ff', emissiveIntensity: 1.8 }),
  )
  ball.castShadow = ball.receiveShadow = true
  ball.add(new THREE.PointLight('#88aaff', 14, 24, 2))
  scene.add(ball)

  const cars = new Map()
  for (const player of data.players ?? []) {
    const car = createCar(player)
    scene.add(car)
    cars.set(player.playerName, car)
  }

  const resize = () => {
    const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(mount)

  const explosions = []
  function addExplosion(pos, color) {
    const count = 100
    const posArr = new Float32Array(count * 3), vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      posArr[i*3] = pos.x; posArr[i*3+1] = pos.y; posArr[i*3+2] = pos.z
      const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1)
      const speed = 7 + Math.random() * 16
      vel[i*3]   = Math.sin(phi) * Math.cos(theta) * speed
      vel[i*3+1] = Math.abs(Math.cos(phi)) * speed + 5
      vel[i*3+2] = Math.sin(phi) * Math.sin(theta) * speed
    }
    const geo    = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    const pMat   = new THREE.PointsMaterial({ color, size: 0.65, transparent: true, opacity: 1, sizeAttenuation: true, depthWrite: false })
    const points = new THREE.Points(geo, pMat)
    scene.add(points)
    const disc   = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    )
    disc.rotation.x = -Math.PI / 2
    disc.position.set(pos.x, 0.06, pos.z)
    disc.scale.setScalar(0.01)
    scene.add(disc)
    const maxLife = 2.4
    explosions.push({
      life: maxLife,
      update(dt) {
        const t = 1 - this.life / maxLife
        for (let i = 0; i < count; i++) {
          posArr[i*3] += vel[i*3]*dt; posArr[i*3+1] += vel[i*3+1]*dt; posArr[i*3+2] += vel[i*3+2]*dt
          vel[i*3+1] -= 22 * dt
        }
        geo.attributes.position.needsUpdate = true
        pMat.opacity = Math.max(0, this.life / maxLife)
        disc.scale.setScalar(Math.min(t*5, 1) * 24)
        disc.material.opacity = Math.max(0, 0.5 - t*1.5)
      },
      dispose() {
        scene.remove(points); scene.remove(disc)
        geo.dispose(); pMat.dispose()
        disc.geometry.dispose(); disc.material.dispose()
      },
    })
  }

  const keys = new Set()
  const onKeyDown = (e) => { if (e.target.tagName !== 'INPUT') keys.add(e.code) }
  const onKeyUp   = (e) => keys.delete(e.code)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup',   onKeyUp)

  const _fwd = new THREE.Vector3(), _rgt = new THREE.Vector3()
  const _mov = new THREE.Vector3(), _yAxis = new THREE.Vector3(0, 1, 0)

  const sceneRefs = { scene, ball, camera, cars, boostPads, playbackSeconds: 0, watchData: data, triggerExplosion: null, cleanup: null, controls }

  let lastFrameMs = performance.now(), frameId = null
  const animate = () => {
    const now   = performance.now()
    const delta = Math.min((now - lastFrameMs) / 1000, 0.05)
    lastFrameMs = now

    if (keys.size > 0) {
      camera.getWorldDirection(_fwd); _fwd.y = 0
      if (_fwd.lengthSq() > 0.0001) _fwd.normalize()
      _rgt.crossVectors(_fwd, _yAxis).normalize()
      _mov.set(0,0,0)
      if (keys.has('KeyW')) _mov.add(_fwd)
      if (keys.has('KeyS')) _mov.sub(_fwd)
      if (keys.has('KeyA')) _mov.sub(_rgt)
      if (keys.has('KeyD')) _mov.add(_rgt)
      if (keys.has('KeyE')) _mov.y += 1
      if (keys.has('KeyQ')) _mov.y -= 1
      if (_mov.lengthSq() > 0) {
        const multiplier = Math.max(PAN_SPEED_MIN, Math.min(PAN_SPEED_MAX, panSpeedRef?.current ?? 1))
        const base  = keys.has('ShiftLeft') || keys.has('ShiftRight') ? PAN_SPEED_FAST : PAN_SPEED_BASE
        const speed = base * multiplier
        _mov.normalize().multiplyScalar(speed * delta)
        camera.position.add(_mov)
        controls.target.add(_mov)
      }
    }
    controls.update()

    const secs = sceneRefs.playbackSeconds, wd = sceneRefs.watchData
    if (wd && secs != null) {
      sceneRefs.playerStats = updateScene(sceneRefs, wd, secs)
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      const exp = explosions[i]
      exp.life -= delta
      if (exp.life <= 0) { exp.dispose(); explosions.splice(i, 1) }
      else exp.update(delta)
    }
    renderer.render(scene, camera)
    frameId = requestAnimationFrame(animate)
  }

  sceneRefs.triggerExplosion = addExplosion
  scene.userData.triggerExplosion = addExplosion
  sceneRefs.cleanup = () => {
    if (frameId) cancelAnimationFrame(frameId)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    observer.disconnect()
    controls.dispose()
    renderer.dispose()
    if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    scene.traverse((obj) => {
      obj.geometry?.dispose?.()
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.())
      else obj.material?.dispose?.()
    })
  }

  animate()
  return sceneRefs
}
