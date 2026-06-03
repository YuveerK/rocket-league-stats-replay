// Rocket League field geometry — Unreal Units, no React/JSX.

export const FL_X = 4096   // half-width  (x axis)
export const FL_Y = 5120   // half-height (y axis)

// SVG viewport dimensions
export const SV_PAD = 14   // padding around the field drawing
export const SV_FW  = 340  // field area width  in SVG px
export const SV_FH  = 425  // field area height in SVG px  (aspect ≈ 8192:10240)
export const SV_W   = SV_FW + SV_PAD * 2
export const SV_H   = SV_FH + SV_PAD * 2

// Field outline polygons (Blue goal at SVG bottom, Orange goal at SVG top)
export const BLUE_HALF   = [[-FL_X, 0], [-FL_X, -4224], [-3072, -FL_Y], [3072, -FL_Y], [FL_X, -4224], [FL_X, 0]]
export const ORANGE_HALF = [[-FL_X, 0], [-FL_X,  4224], [-3072,  FL_Y], [3072,  FL_Y], [FL_X,  4224], [FL_X, 0]]
export const BLUE_OUTLINE   = [[-FL_X, 0], [-FL_X, -4224], [-3072, -FL_Y], [3072, -FL_Y], [FL_X, -4224], [FL_X, 0]]
export const ORANGE_OUTLINE = [[-FL_X, 0], [-FL_X,  4224], [-3072,  FL_Y], [3072,  FL_Y], [FL_X,  4224], [FL_X, 0]]

// Convert Unreal-Unit coordinates to SVG pixel coordinates.
// UU origin (0,0) maps to the centre of the SVG field area.
export function toSvg(ux, uy) {
  return [
    SV_PAD + ((ux + FL_X) / (FL_X * 2)) * SV_FW,
    SV_PAD + SV_FH - ((uy + FL_Y) / (FL_Y * 2)) * SV_FH,
  ]
}

// Convert an array of [ux, uy] pairs to an SVG points attribute string.
export function svgPts(coords) {
  return coords.map(([x, y]) => toSvg(x, y).join(',')).join(' ')
}

// Pre-computed reference points used when drawing the field
export const [CENTER_X, CENTER_Y]   = toSvg(0, 0)
export const [FIELD_LEFT_X]         = toSvg(-FL_X, 0)
export const [FIELD_RIGHT_X]        = toSvg( FL_X, 0)
export const [BG_X1]                = toSvg(-893, -FL_Y)
export const [BG_X2]                = toSvg( 893, -FL_Y)
export const [, BG_Y]               = toSvg(0, -FL_Y)
export const [OG_X1]                = toSvg(-893,  FL_Y)
export const [OG_X2]                = toSvg( 893,  FL_Y)
export const [, OG_Y]               = toSvg(0,  FL_Y)
export const CENTER_CIRCLE_R        = (520 / (FL_X * 2)) * SV_FW

// Returns a heat-colour object { fill, op } for a pad pickup count, or null when count = 0.
export function heatColor(count, maxCount) {
  if (!count) return null
  const t = Math.min(1, count / Math.max(1, maxCount))
  if (t < 0.25) return { fill: '#7c1f18', op: 0.65 }
  if (t < 0.5)  return { fill: '#b02820', op: 0.78 }
  if (t < 0.75) return { fill: '#d93520', op: 0.90 }
  return              { fill: '#ff4520', op: 1.00 }
}
