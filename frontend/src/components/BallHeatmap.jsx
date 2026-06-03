import { useEffect, useMemo, useRef } from 'react'

const FY = [-5120, 5120]
const FX = [-4096, 4096]
const FH = FY[1] - FY[0]
const FW = FX[1] - FX[0]

const GW = 320
const GH = 256
const SVG_W = 640
const SVG_H = 512

const BALL_GROUND_Z = 100
const BALL_FAST_SPEED = 2000

const BLUE = '#60a5fa'
const ORANGE = '#fb923c'
const NEUTRAL = '#f8fafc'

const toX = (fieldY) => ((fieldY - FY[0]) / FH) * SVG_W
const toY = (fieldX) => (1 - (fieldX - FX[0]) / FW) * SVG_H

const FIELD_POLY = [
  [-3072, -5120], [3072, -5120],
  [4096, -4096], [4096, 4096],
  [3072, 5120], [-3072, 5120],
  [-4096, 4096], [-4096, -4096],
]

const POLY_POINTS = FIELD_POLY.map(([fx, fy]) => `${toX(fy)},${toY(fx)}`).join(' ')
const CSS_POLY_POINTS = FIELD_POLY
  .map(([fx, fy]) => `${(toX(fy) / SVG_W) * 100}% ${(toY(fx) / SVG_H) * 100}%`)
  .join(', ')

const GOAL_POST_X = 893
const GOAL_DEPTH = 36
const GOAL_TOP = toY(GOAL_POST_X)
const GOAL_BTM = toY(-GOAL_POST_X)
const GOAL_HEIGHT = GOAL_BTM - GOAL_TOP

const LARGE_PADS = [
  [-3072, -4096], [3072, -4096],
  [-3584, 0], [3584, 0],
  [-3072, 4096], [3072, 4096],
]

const SMALL_PADS = [
  [0, -4096], [0, 4096],
  [-1024, -2816], [1024, -2816], [-1024, 2816], [1024, 2816],
  [-2048, -1536], [2048, -1536], [-2048, 1536], [2048, 1536],
  [0, -1536], [0, 1536],
  [-3072, -1024], [3072, -1024], [-3072, 1024], [3072, 1024],
  [-1024, 0], [1024, 0], [0, 0],
]

const K = [1 / 16, 2 / 16, 1 / 16, 2 / 16, 4 / 16, 2 / 16, 1 / 16, 2 / 16, 1 / 16]

function colorToRGB(color) {
  const hex = String(color ?? '').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return [255, 255, 255]
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ]
}

function heatColor(t) {
  if (t < 0.18) return [56, 189, 248, t * 1.9]
  if (t < 0.42) return [52, 211, 153, 0.32 + t * 0.9]
  if (t < 0.72) return [250, 204, 21, 0.48 + t * 0.58]
  return [248, 250, 252, 0.72 + t * 0.28]
}

function blur(grid) {
  const out = new Float32Array(GW * GH)
  for (let y = 1; y < GH - 1; y++) {
    for (let x = 1; x < GW - 1; x++) {
      let value = 0
      let ki = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          value += grid[(y + dy) * GW + (x + dx)] * K[ki++]
        }
      }
      out[y * GW + x] = value
    }
  }
  return out
}

function maxGrid(grid) {
  let max = 1
  for (const value of grid) if (value > max) max = value
  return max
}

function sampleToGrid(sample) {
  const gx = Math.floor(((sample.y - FY[0]) / FH) * GW)
  const gy = Math.floor((1 - (sample.x - FX[0]) / FW) * GH)
  return { gx, gy }
}

function addWeightedPoint(grid, gx, gy, weight = 1) {
  const radius = 4
  for (let oy = -radius; oy <= radius; oy++) {
    for (let ox = -radius; ox <= radius; ox++) {
      const x = gx + ox
      const y = gy + oy
      if (x < 0 || x >= GW || y < 0 || y >= GH) continue
      const distanceSq = ox * ox + oy * oy
      if (distanceSq > radius * radius) continue
      grid[y * GW + x] += weight * Math.exp(-distanceSq / 8)
    }
  }
}

function filterSamples(samples, mode) {
  if (mode === 'ground') return samples.filter((sample) => (sample.z ?? 0) <= BALL_GROUND_Z)
  if (mode === 'aerial') return samples.filter((sample) => (sample.z ?? 0) > BALL_GROUND_Z)
  if (mode === 'fast') return samples.filter((sample) => (sample.speedUU ?? 0) >= BALL_FAST_SPEED)
  return samples
}

function buildGrid(samples, predicate = () => true) {
  const raw = new Float32Array(GW * GH)
  let count = 0

  for (const sample of samples) {
    if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y)) continue
    if (!predicate(sample)) continue
    const { gx, gy } = sampleToGrid(sample)
    if (gx < 0 || gx >= GW || gy < 0 || gy >= GH) continue
    const speedWeight = sample.speedUU ? Math.min(1.5, Math.max(0.75, sample.speedUU / 2200)) : 1
    addWeightedPoint(raw, gx, gy, speedWeight)
    count++
  }

  return { count, grid: blur(raw) }
}

function paintNeutral(ctx, imageData, grid, max) {
  const gamma = 0.46
  for (let i = 0; i < GW * GH; i++) {
    const d = Math.pow(Math.min(1, grid[i] / max), gamma)
    if (d <= 0.015) continue
    const [r, g, b, alpha] = heatColor(d)
    const j = i * 4
    imageData.data[j] = r
    imageData.data[j + 1] = g
    imageData.data[j + 2] = b
    imageData.data[j + 3] = Math.min(255, Math.round(alpha * 255))
  }
  ctx.putImageData(imageData, 0, 0)
}

function paintTinted(ctx, imageData, layers) {
  for (const { grid, color, max } of layers) {
    const [r, g, b] = colorToRGB(color)
    for (let i = 0; i < GW * GH; i++) {
      const d = Math.pow(Math.min(1, grid[i] / max), 0.5)
      if (d <= 0.012) continue
      const intensity = Math.min(1, d * 1.42)
      const j = i * 4
      imageData.data[j] = Math.min(255, imageData.data[j] + r * intensity)
      imageData.data[j + 1] = Math.min(255, imageData.data[j + 1] + g * intensity)
      imageData.data[j + 2] = Math.min(255, imageData.data[j + 2] + b * intensity)
      imageData.data[j + 3] = Math.min(255, imageData.data[j + 3] + 235 * intensity)
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

export default function BallHeatmap({ samples = [], mode = 'full' }) {
  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)

  const filteredSamples = useMemo(() => filterSamples(samples, mode), [samples, mode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas')
      offscreenRef.current.width = GW
      offscreenRef.current.height = GH
    }

    const offscreen = offscreenRef.current
    const offCtx = offscreen.getContext('2d')
    offCtx.clearRect(0, 0, GW, GH)
    const imageData = offCtx.createImageData(GW, GH)

    if (mode === 'pressure') {
      const blueLayer = buildGrid(filteredSamples, (sample) => sample.y > 0)
      const orangeLayer = buildGrid(filteredSamples, (sample) => sample.y < 0)
      const neutralLayer = buildGrid(filteredSamples, (sample) => sample.y === 0)
      if (blueLayer.count + orangeLayer.count + neutralLayer.count > 0) {
        paintTinted(offCtx, imageData, [
          { grid: blueLayer.grid, color: BLUE, max: maxGrid(blueLayer.grid) },
          { grid: orangeLayer.grid, color: ORANGE, max: maxGrid(orangeLayer.grid) },
          { grid: neutralLayer.grid, color: NEUTRAL, max: maxGrid(neutralLayer.grid) },
        ])
      }
    } else {
      const { count, grid } = buildGrid(filteredSamples)
      if (count > 0) paintNeutral(offCtx, imageData, grid, maxGrid(grid))
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height)
  }, [filteredSamples, mode])

  const centerR = (1024 / FH) * SVG_W

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050813]"
      style={{ aspectRatio: `${SVG_W}/${SVG_H}` }}>
      <div className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05), transparent 36%), linear-gradient(90deg, rgba(96,165,250,0.08), transparent 33%, transparent 67%, rgba(251,146,60,0.08))',
        }} />

      {mode === 'pressure' && (
        <div className="absolute inset-0 pointer-events-none opacity-70">
          <div className="absolute left-0 top-0 h-full w-1/2 bg-orange-500/[0.05]" />
          <div className="absolute right-0 top-0 h-full w-1/2 bg-blue-500/[0.05]" />
        </div>
      )}

      <canvas ref={canvasRef} width={SVG_W} height={SVG_H}
        className="absolute inset-0 w-full h-full"
        style={{
          clipPath: `polygon(${CSS_POLY_POINTS})`,
          WebkitClipPath: `polygon(${CSS_POLY_POINTS})`,
        }} />

      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <filter id="ball-field-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="ball-midline" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.24)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <polygon points={POLY_POINTS} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" />
        <line x1={SVG_W / 2} y1={toY(4096)} x2={SVG_W / 2} y2={toY(-4096)}
          stroke="url(#ball-midline)" strokeWidth="1.4" />
        <line x1={toX(-1707)} y1={toY(3890)} x2={toX(-1707)} y2={toY(-3890)}
          stroke="rgba(96,165,250,0.20)" strokeWidth="1" strokeDasharray="8 8" />
        <line x1={toX(1707)} y1={toY(3890)} x2={toX(1707)} y2={toY(-3890)}
          stroke="rgba(251,146,60,0.20)" strokeWidth="1" strokeDasharray="8 8" />

        <circle cx={SVG_W / 2} cy={SVG_H / 2} r={centerR}
          fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1.2" />
        <circle cx={SVG_W / 2} cy={SVG_H / 2} r="4"
          fill="rgba(255,255,255,0.42)" filter="url(#ball-field-glow)" />

        <rect x={0} y={GOAL_TOP} width={GOAL_DEPTH} height={GOAL_HEIGHT}
          fill="rgba(59,130,246,0.14)" stroke="rgba(96,165,250,0.55)" strokeWidth="1.5" />
        <rect x={SVG_W - GOAL_DEPTH} y={GOAL_TOP} width={GOAL_DEPTH} height={GOAL_HEIGHT}
          fill="rgba(249,115,22,0.14)" stroke="rgba(251,146,60,0.55)" strokeWidth="1.5" />

        <text x={GOAL_DEPTH / 2} y={SVG_H / 2 + 4} textAnchor="middle"
          fontSize="9" fontWeight="900" fill="rgba(147,197,253,0.70)">B</text>
        <text x={SVG_W - GOAL_DEPTH / 2} y={SVG_H / 2 + 4} textAnchor="middle"
          fontSize="9" fontWeight="900" fill="rgba(253,186,116,0.70)">O</text>

        {LARGE_PADS.map(([fx, fy], index) => (
          <circle key={`large-${index}`} cx={toX(fy)} cy={toY(fx)} r="7"
            fill="rgba(250,204,21,0.18)" stroke="rgba(250,204,21,0.58)" strokeWidth="1.3" />
        ))}
        {SMALL_PADS.map(([fx, fy], index) => (
          <circle key={`small-${index}`} cx={toX(fy)} cy={toY(fx)} r="3.4"
            fill="rgba(148,163,184,0.10)" stroke="rgba(148,163,184,0.26)" strokeWidth="1" />
        ))}

        <text x={toX(-3413)} y={toY(3720)} fontSize="10" fontWeight="800" letterSpacing="0.12em"
          fill="rgba(96,165,250,0.42)">BLUE THIRD</text>
        <text x={SVG_W / 2} y={toY(3720)} fontSize="10" fontWeight="800" letterSpacing="0.12em"
          textAnchor="middle" fill="rgba(255,255,255,0.30)">MIDFIELD</text>
        <text x={toX(3413)} y={toY(3720)} fontSize="10" fontWeight="800" letterSpacing="0.12em"
          textAnchor="end" fill="rgba(251,146,60,0.42)">ORANGE THIRD</text>
      </svg>

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5 backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">
          {filteredSamples.length.toLocaleString()} samples
        </span>
      </div>
    </div>
  )
}
