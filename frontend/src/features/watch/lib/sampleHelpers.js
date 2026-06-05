import * as THREE from 'three'
import {
  BOOST_AMOUNT_MAX, BOOST_DRAIN_MIN,
  MIN_BOOST_SPEED, MIN_FORWARD_DOT,
  THROTTLE_FORWARD_MIN, THROTTLE_REVERSE_MAX,
  SCALE,
} from '../constants'

export function n(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function fmtTime(seconds) {
  const total = Math.max(0, Math.floor(n(seconds)))
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function boostToPercent(amount) {
  if (amount == null || !Number.isFinite(amount)) return null
  return Math.max(0, Math.min(100, Math.round((amount / BOOST_AMOUNT_MAX) * 100)))
}

export function findSampleIndex(samples, csecs) {
  let lo = 0
  let hi = samples.length - 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (samples[mid][0] <= csecs) lo = mid + 1
    else hi = mid - 1
  }
  return lo
}

function hermite(p0, p1, v0, v1, t, dt) {
  const t2 = t * t
  const t3 = t2 * t
  return (
    (2 * t3 - 3 * t2 + 1) * p0 +
    (t3 - 2 * t2 + t) * v0 * dt +
    (-2 * t3 + 3 * t2) * p1 +
    (t3 - t2) * v1 * dt
  )
}

export function sampleStateAt(samples, seconds) {
  if (!samples?.length) return null
  const csecs = seconds * 100

  const fromRow = (row) => ({
    x: row[1], y: row[2], z: row[3],
    qx: n(row[4]), qy: n(row[5]), qz: n(row[6]), qw: n(row[7], 1),
    hasRot: row.length >= 8,
    vx:     row.length >= 11 ? n(row[8])  : null,
    vy:     row.length >= 11 ? n(row[9])  : null,
    vz:     row.length >= 11 ? n(row[10]) : null,
    boost:  row.length >= 12 ? n(row[11]) : null,
    throttle: row.length >= 13 ? n(row[12]) : null,
  })

  if (csecs <= samples[0][0]) return fromRow(samples[0])
  const last = samples[samples.length - 1]
  if (csecs >= last[0]) return fromRow(last)

  const index = findSampleIndex(samples, csecs)
  const a = samples[Math.max(0, index - 1)]
  const b = samples[index]
  const span = Math.max(1, b[0] - a[0])
  const t = Math.min(1, Math.max(0, (csecs - a[0]) / span))

  let qx = 0, qy = 0, qz = 0, qw = 1
  const hasRot = a.length >= 8 && b.length >= 8
  if (hasRot) {
    const qa = new THREE.Quaternion(n(a[4]), n(a[5]), n(a[6]), n(a[7], 1))
    qa.slerp(new THREE.Quaternion(n(b[4]), n(b[5]), n(b[6]), n(b[7], 1)), t)
    ;({ x: qx, y: qy, z: qz, w: qw } = qa)
  } else {
    const dx = b[1] - a[1], dy = b[2] - a[2]
    if (Math.hypot(dx, dy) > 1) {
      const yaw = Math.atan2(dy, dx)
      qz = Math.sin(yaw / 2)
      qw = Math.cos(yaw / 2)
    }
  }

  const hasVel = a.length >= 11 && b.length >= 11
  const useVelocityPosition = hasVel && span <= 20
  const dt = span / 100
  return {
    x: useVelocityPosition ? hermite(a[1], b[1], a[8], b[8], t, dt)   : a[1] + (b[1] - a[1]) * t,
    y: useVelocityPosition ? hermite(a[2], b[2], a[9], b[9], t, dt)   : a[2] + (b[2] - a[2]) * t,
    z: useVelocityPosition ? hermite(a[3], b[3], a[10], b[10], t, dt) : a[3] + (b[3] - a[3]) * t,
    qx, qy, qz, qw, hasRot,
    vx: hasVel ? a[8]  + (b[8]  - a[8])  * t : null,
    vy: hasVel ? a[9]  + (b[9]  - a[9])  * t : null,
    vz: hasVel ? a[10] + (b[10] - a[10]) * t : null,
    boost: sampleBoostAmountAt(samples, seconds),
  }
}

export function sampleFieldAt(samples, seconds, index) {
  if (!samples?.length) return null
  const csecs = seconds * 100
  if (csecs <= samples[0][0]) return samples[0].length > index ? n(samples[0][index]) : null
  const last = samples[samples.length - 1]
  if (csecs >= last[0]) return last.length > index ? n(last[index]) : null
  // Walk backward from the current time to find the nearest sample that carries this field.
  // Many rows are position-only (length 4 or 8) due to sparse network updates; skipping them
  // ensures boost/throttle values are correctly propagated rather than returning null.
  const idx = findSampleIndex(samples, csecs)
  for (let i = idx - 1; i >= 0; i--) {
    if (samples[i].length > index) return n(samples[i][index])
  }
  return null
}

export function sampleBoostAmountAt(samples, seconds) { return sampleFieldAt(samples, seconds, 11) }
export function sampleThrottleAt(samples, seconds)    { return sampleFieldAt(samples, seconds, 12) }

export function isThrottleForward(samples, seconds) {
  const throttle = sampleThrottleAt(samples, seconds)
  if (throttle == null) return true
  if (throttle <= THROTTLE_REVERSE_MAX) return false
  return throttle >= THROTTLE_FORWARD_MIN
}

const _carForward = new THREE.Vector3()
const _carVelocity = new THREE.Vector3()

export function isVelocityForward(car, state) {
  if (state.vx == null || state.vy == null) return false
  const speed = Math.hypot(state.vx, state.vy)
  if (speed < MIN_BOOST_SPEED) return false
  _carForward.set(1, 0, 0).applyQuaternion(car.quaternion)
  _carForward.y = 0
  if (_carForward.lengthSq() < 0.0001) return false
  _carForward.normalize()
  _carVelocity.set(state.vx * SCALE, 0, state.vy * SCALE).normalize()
  return _carForward.dot(_carVelocity) >= MIN_FORWARD_DOT
}

export function isInBoostDrainSegment(samples, seconds) {
  if (!samples?.length) return false
  const csecs = seconds * 100
  const idx = findSampleIndex(samples, csecs)

  // Skip over sparse position-only rows — find the nearest boost-bearing samples
  // on each side so that drain detection works even when adjacent rows lack boost data.
  let prev = null
  for (let i = idx - 1; i >= 0; i--) {
    if (samples[i].length >= 12) { prev = samples[i]; break }
  }
  let next = null
  for (let i = idx; i < samples.length; i++) {
    if (samples[i].length >= 12) { next = samples[i]; break }
  }

  if (!prev || !next) return false
  if (csecs < prev[0] || csecs > next[0]) return false
  return n(next[11]) < n(prev[11]) - BOOST_DRAIN_MIN
}

export function getBoostDrainWindow(samples, seconds) {
  if (!samples?.length) return null
  // Work only with samples that carry boost data, so sparse position-only rows
  // don't interrupt drain-window detection or cause early loop termination.
  const boostRows = samples.filter(s => s.length >= 12)
  if (boostRows.length < 2) return null

  for (let i = boostRows.length - 1; i >= 1; i--) {
    const prev = boostRows[i - 1]
    const next = boostRows[i]
    const boostPrev = n(prev[11])
    const boostNext = n(next[11])
    if (boostNext >= boostPrev - BOOST_DRAIN_MIN) continue

    let start = prev[0] / 100
    let end   = next[0] / 100
    const peakBoost = boostPrev

    for (let j = i + 1; j < boostRows.length; j++) {
      const prevRow = boostRows[j - 1]
      const row = boostRows[j]
      if (n(row[11]) > n(prevRow[11]) + 2) break
      end = row[0] / 100
    }
    if (seconds >= start && seconds <= end + 0.03) return { start, end, peakBoost }
  }
  return null
}

export function isBoostingFromSamples(player, seconds, state, car) {
  const amount = sampleBoostAmountAt(player.samples, seconds)
  if (amount == null || amount <= 0) return false
  if (!isThrottleForward(player.samples, seconds)) return false
  if (!isVelocityForward(car, state)) return false
  if (isInBoostDrainSegment(player.samples, seconds)) return true
  const window = getBoostDrainWindow(player.samples, seconds)
  if (!window) return false
  return amount <= window.peakBoost + 1
}
