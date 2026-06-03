import { useEffect, useMemo, useRef } from 'react'

// ── Rocket League field dimensions (UU) ───────────────────────────────────
// Long axis (Y): -5120 → +5120  (Blue goal = -5120, Orange goal = +5120)
// Short axis (X): -4096 → +4096
const FY = [-5120, 5120]   // long axis  → horizontal in landscape
const FX = [-4096, 4096]   // short axis → vertical   in landscape
const FH = FY[1] - FY[0]   // 10240
const FW = FX[1] - FX[0]   // 8192

// ── Heatmap grid (landscape: wider than tall) ──────────────────────────────
const GW = 250   // grid columns  (field Y direction)
const GH = 200   // grid rows     (field X direction)

// ── SVG canvas dimensions (landscape, aspect = FH:FW = 10240:8192 ≈ 5:4) ──
const SVG_W = 500
const SVG_H = 400

// ── Coordinate transforms ──────────────────────────────────────────────────
// fieldY (long axis)  → SVG X  (Blue goal = left, Orange goal = right)
const toX = (fy) => ((fy - FY[0]) / FH) * SVG_W
// fieldX (short axis) → SVG Y  (positive fieldX = top, flipped for display)
const toY = (fx) => (1 - (fx - FX[0]) / FW) * SVG_H

// ── RL field polygon (8-sided, 45° corner cuts, in [fieldX, fieldY] pairs) ─
const FIELD_POLY = [
  [-3072, -5120], [ 3072, -5120],
  [ 4096, -4096], [ 4096,  4096],
  [ 3072,  5120], [-3072,  5120],
  [-4096,  4096], [-4096, -4096],
]
const POLY_POINTS = FIELD_POLY.map(([fx, fy]) => `${toX(fy)},${toY(fx)}`).join(' ')
const CSS_POLY_POINTS = FIELD_POLY
  .map(([fx, fy]) => `${(toX(fy) / SVG_W) * 100}% ${(toY(fx) / SVG_H) * 100}%`)
  .join(', ')

// ── Goal dimensions ────────────────────────────────────────────────────────
const GOAL_POST_X = 893    // half-width of goal opening in fieldX UU
const GOAL_DEPTH_SVG = 28  // how far the goal box extends into the field (SVG units)
const GOAL_TOP    = toY( GOAL_POST_X)   // SVG Y of upper goal post
const GOAL_BTM    = toY(-GOAL_POST_X)   // SVG Y of lower goal post
const GOAL_HEIGHT = GOAL_BTM - GOAL_TOP

// ── Boost pad positions [fieldX, fieldY] ──────────────────────────────────
const LARGE_PADS = [
  [-3072, -4096], [ 3072, -4096],
  [-3584,     0], [ 3584,     0],
  [-3072,  4096], [ 3072,  4096],
]
const SMALL_PADS = [
  [    0, -4096], [    0,  4096],
  [-1024, -2816], [ 1024, -2816], [-1024,  2816], [ 1024,  2816],
  [-2048, -1536], [ 2048, -1536], [-2048,  1536], [ 2048,  1536],
  [    0, -1536], [    0,  1536],
  [-3072, -1024], [ 3072, -1024], [-3072,  1024], [ 3072,  1024],
  [-1024,     0], [ 1024,     0], [    0,     0],
]

// ── Colour gradient ────────────────────────────────────────────────────────
function colorToRGB(color) {
  const hex = String(color ?? '').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return [96, 165, 250]
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ]
}

// ── 3×3 Gaussian blur ─────────────────────────────────────────────────────
const K = [1/16, 2/16, 1/16, 2/16, 4/16, 2/16, 1/16, 2/16, 1/16]
function blur(grid) {
  const out = new Float32Array(GW * GH)
  for (let y = 1; y < GH - 1; y++) {
    for (let x = 1; x < GW - 1; x++) {
      let v = 0, ki = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          v += grid[(y + dy) * GW + (x + dx)] * K[ki++]
      out[y * GW + x] = v
    }
  }
  return out
}

function maxGrid(grid) {
  let max = 1
  for (const v of grid) if (v > max) max = v
  return max
}

// ── Grid coordinate helpers ────────────────────────────────────────────────
// Sample format: [fieldX, fieldY, z, csecs]
// fieldY → grid column (horizontal, landscape)
// fieldX → grid row    (vertical, flipped so positive X = top)
function sampleToGrid(s) {
  const gx = Math.floor(((s[1] - FY[0]) / FH) * GW)
  const gy = Math.floor((1 - (s[0] - FX[0]) / FW) * GH)
  return { gx, gy }
}

function buildSmoothedGrid(samples, minTime = 0, maxTime = Infinity) {
  const raw = new Float32Array(GW * GH)
  let count = 0

  for (const s of samples) {
    const t = s[3] / 100
    if (t < minTime || t > maxTime) continue
    const { gx, gy } = sampleToGrid(s)
    if (gx >= 0 && gx < GW && gy >= 0 && gy < GH) {
      raw[gy * GW + gx]++
      count++
    }
  }

  let smoothed = blur(raw); smoothed = blur(smoothed)
  return { count, smoothed }
}

// ── Trail constants ────────────────────────────────────────────────────────
const DEFAULT_TRAIL_WINDOW_S = 6
const TRAIL_MAX_PTS  = 60

// ── Component ─────────────────────────────────────────────────────────────
export default function FieldHeatmap({
  samples     = [],
  layers      = null,
  maxTime     = Infinity,
  minTime     = 0,
  currentTime = null,
  teamColor   = '#60a5fa',
  showTrail   = false,
  trailWindowSeconds = DEFAULT_TRAIL_WINDOW_S,
}) {
  const canvasRef  = useRef()
  const offscRef   = useRef(null)
  const fullMaxRef = useRef([])

  const heatmapLayers = useMemo(() => {
    const source = Array.isArray(layers) && layers.length > 0
      ? layers
      : [{ id: 'selected', samples, color: teamColor }]

    return source.map((layer, index) => ({
      id: layer.id ?? layer.playerName ?? `layer-${index}`,
      label: layer.label ?? layer.playerName ?? `Player ${index + 1}`,
      samples: layer.samples ?? [],
      color: layer.color ?? teamColor,
    }))
  }, [layers, samples, teamColor])

  // Pre-compute full-match peak density for consistent normalisation
  useEffect(() => {
    fullMaxRef.current = heatmapLayers.map((layer) => {
      if (!layer.samples.length) return 1
      const { smoothed } = buildSmoothedGrid(layer.samples)
      return maxGrid(smoothed)
    })
  }, [heatmapLayers])

  // Render density canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width: cw, height: ch } = canvas

    ctx.clearRect(0, 0, cw, ch)

    const gamma = 0.42

    if (!offscRef.current) {
      offscRef.current = document.createElement('canvas')
      offscRef.current.width  = GW
      offscRef.current.height = GH
    }
    const oCtx   = offscRef.current.getContext('2d')
    const imgData = oCtx.createImageData(GW, GH)
    let hasDensity = false

    heatmapLayers.forEach((layer, layerIndex) => {
      const { count, smoothed } = buildSmoothedGrid(layer.samples, minTime, maxTime)
      if (count === 0) return

      hasDensity = true
      const normMax = fullMaxRef.current[layerIndex] ?? 1
      const [r, g, b] = colorToRGB(layer.color)

      for (let i = 0; i < GW * GH; i++) {
        const d = Math.pow(Math.min(1, smoothed[i] / normMax), gamma)
        if (d <= 0) continue

        const intensity = Math.min(1, d * 1.35)
        const j = i * 4
        imgData.data[j]     = Math.min(255, imgData.data[j]     + r * intensity)
        imgData.data[j + 1] = Math.min(255, imgData.data[j + 1] + g * intensity)
        imgData.data[j + 2] = Math.min(255, imgData.data[j + 2] + b * intensity)
        imgData.data[j + 3] = Math.min(255, imgData.data[j + 3] + 255 * intensity)
      }
    })

    if (!hasDensity) {
      oCtx.clearRect(0, 0, GW, GH)
      return
    }

    oCtx.putImageData(imgData, 0, 0)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(offscRef.current, 0, 0, cw, ch)
  }, [heatmapLayers, maxTime, minTime])

  // ── Trail data ─────────────────────────────────────────────────────────
  const trailLayers = showTrail && currentTime !== null
    ? heatmapLayers.map((layer) => {
        const minT = Math.max(0, currentTime - trailWindowSeconds)
        const window = []
        for (const s of layer.samples) {
          const t = s[3] / 100
          if (t > currentTime) break
          if (t >= minT) window.push(s)
        }

        const trailPts = []
        if (window.length <= TRAIL_MAX_PTS) {
          trailPts.push(...window)
        } else {
          const step = window.length / TRAIL_MAX_PTS
          for (let i = 0; i < TRAIL_MAX_PTS; i++) trailPts.push(window[Math.floor(i * step)])
          trailPts.push(window[window.length - 1])
        }

        return {
          ...layer,
          points: trailPts,
          currentPos: window.length > 0 ? window[window.length - 1] : null,
        }
      }).filter((layer) => layer.points.length > 0)
    : []

  // Centre circle radius in SVG units (1024 UU radius mapped along long axis)
  const centreR = (1024 / FH) * SVG_W   // ≈ 50

  return (
    <div className="relative w-full" style={{ aspectRatio: `${SVG_W}/${SVG_H}` }}>
      {/* Density canvas */}
      <canvas ref={canvasRef} width={SVG_W} height={SVG_H}
        className="absolute inset-0 w-full h-full"
        style={{
          opacity: 1,
          clipPath: `polygon(${CSS_POLY_POINTS})`,
          WebkitClipPath: `polygon(${CSS_POLY_POINTS})`,
        }} />

      {/* Field markings + trail */}
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}>

        <defs>
          <filter id="pos-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="trail-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Field outline (octagon) ─────────────────────────────── */}
        <polygon points={POLY_POINTS}
          fill="none"
          stroke="rgba(255,255,255,0.20)"
          strokeWidth="1.5" />

        {/* Midfield line (vertical) */}
        <line x1={SVG_W / 2} y1={toY(4096)} x2={SVG_W / 2} y2={toY(-4096)}
          stroke="rgba(255,255,255,0.14)" strokeWidth="1" />

        {/* Centre circle */}
        <circle cx={SVG_W / 2} cy={SVG_H / 2} r={centreR}
          fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx={SVG_W / 2} cy={SVG_H / 2} r="3"
          fill="rgba(255,255,255,0.25)" />

        {/* ── Goals (left = Blue, right = Orange) ────────────────── */}
        {/* Blue goal — left side */}
        <rect x={0} y={GOAL_TOP} width={GOAL_DEPTH_SVG} height={GOAL_HEIGHT}
          fill="rgba(59,130,246,0.15)" stroke="rgba(96,165,250,0.50)" strokeWidth="1.5" />
        <text x={GOAL_DEPTH_SVG / 2} y={SVG_H / 2 + 4}
          textAnchor="middle" fontSize="8" fontWeight="700"
          fill="rgba(147,197,253,0.75)" letterSpacing="0.08em"
          style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}>
        </text>
        <text x={GOAL_DEPTH_SVG / 2} y={SVG_H / 2 + 3}
          textAnchor="middle" fontSize="7" fontWeight="800"
          fill="rgba(147,197,253,0.65)" letterSpacing="0.12em">B</text>

        {/* Orange goal — right side */}
        <rect x={SVG_W - GOAL_DEPTH_SVG} y={GOAL_TOP} width={GOAL_DEPTH_SVG} height={GOAL_HEIGHT}
          fill="rgba(249,115,22,0.15)" stroke="rgba(251,146,60,0.50)" strokeWidth="1.5" />
        <text x={SVG_W - GOAL_DEPTH_SVG / 2} y={SVG_H / 2 + 3}
          textAnchor="middle" fontSize="7" fontWeight="800"
          fill="rgba(253,186,116,0.65)" letterSpacing="0.12em">O</text>

        {/* ── Boost pads ──────────────────────────────────────────── */}
        {LARGE_PADS.map(([fx, fy], i) => (
          <circle key={`lg-${i}`} cx={toX(fy)} cy={toY(fx)} r="6"
            fill="rgba(234,179,8,0.20)" stroke="rgba(234,179,8,0.55)" strokeWidth="1.5" />
        ))}
        {SMALL_PADS.map(([fx, fy], i) => (
          <circle key={`sm-${i}`} cx={toX(fy)} cy={toY(fx)} r="3"
            fill="rgba(148,163,184,0.10)" stroke="rgba(148,163,184,0.28)" strokeWidth="1" />
        ))}

        {/* ── Position trail ──────────────────────────────────────── */}
        {trailLayers.map((layer) => layer.points.length > 1 && layer.points.map((s, i) => {
          if (i === 0) return null
          const alpha = i / (layer.points.length - 1)
          const prev  = layer.points[i - 1]
          return (
            <line key={`${layer.id}-${i}`}
              x1={toX(prev[1])} y1={toY(prev[0])}
              x2={toX(s[1])}    y2={toY(s[0])}
              stroke={layer.color}
              strokeWidth={0.5 + alpha * 2.5}
              strokeLinecap="round"
              opacity={0.10 + alpha * 0.62}
            />
          )
        }))}

        {/* ── Current position marker ──────────────────────────────── */}
        {trailLayers.map((layer) => layer.currentPos && (() => {
          const cx = toX(layer.currentPos[1])
          const cy = toY(layer.currentPos[0])
          return (
            <g key={`${layer.id}-current`}>
              <circle cx={cx} cy={cy} r="16"
                fill="none" stroke={layer.color} strokeWidth="1" opacity="0.15" />
              <circle cx={cx} cy={cy} r="10"
                fill={layer.color} opacity="0.18" filter="url(#pos-glow)" />
              <circle cx={cx} cy={cy} r="6"
                fill={layer.color} opacity="0.85" filter="url(#trail-glow)" />
              <circle cx={cx} cy={cy} r="3"
                fill="white" opacity="0.97" />
            </g>
          )
        })())}
      </svg>
    </div>
  )
}
