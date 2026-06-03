/**
 * Standard Soccar field layout (Unreal units).
 * Boost pads and octagon boundary match RLBot / RLBotGUI documented values.
 */

export const FIELD_HALF_WIDTH = 4096
export const FIELD_HALF_LENGTH = 5120
export const FIELD_LENGTH = 10240
export const FIELD_WIDTH = 8192

/** Distance from center to defensive third line (RL heatmap zones). */
export const FIELD_THIRD_FROM_CENTER = FIELD_LENGTH / 3

export const FIELD_DEF_THIRD_Y = -FIELD_HALF_LENGTH + FIELD_THIRD_FROM_CENTER
export const FIELD_ATT_THIRD_Y = FIELD_HALF_LENGTH - FIELD_THIRD_FROM_CENTER

/** Octagon boundary as [rlX, rlY] — same order as FieldHeatmap / in-game. */
export const FIELD_OCTAGON_RL = [
  [-3072, -FIELD_HALF_LENGTH],
  [3072, -FIELD_HALF_LENGTH],
  [FIELD_HALF_WIDTH, -4096],
  [FIELD_HALF_WIDTH, 4096],
  [3072, FIELD_HALF_LENGTH],
  [-3072, FIELD_HALF_LENGTH],
  [-FIELD_HALF_WIDTH, 4096],
  [-FIELD_HALF_WIDTH, -4096],
]

export const CENTER_CIRCLE_RADIUS = 900
export const GOAL_WIDTH = 1786
export const GOAL_DEPTH = 880
export const GOAL_HEIGHT_UU = 650

/** Boost pad cylinder radii in UU (RLBot wiki). */
export const BOOST_PAD_RADIUS_UU = { big: 208, small: 144 }

/** Respawn delay after pickup (seconds). */
export const BOOST_PAD_RESPAWN_SEC = { big: 10, small: 4 }

export const BOOST_PAD_SNAP_DISTANCE = 550

export function snapPadIndex(x, y, pads = STANDARD_BOOST_PADS) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  let bestIndex = null
  let bestDist = BOOST_PAD_SNAP_DISTANCE
  for (const pad of pads) {
    const dist = Math.hypot(x - pad.x, y - pad.y)
    if (dist < bestDist) {
      bestDist = dist
      bestIndex = pad.index
    }
  }
  return bestIndex
}

/** @type {{ id: string, index: number, x: number, y: number, z: number, padType: 'big' | 'small' }[]} */
export const STANDARD_BOOST_PADS = [
  [0, -4240, 70, 'small'],
  [-1792, -4184, 70, 'small'],
  [1792, -4184, 70, 'small'],
  [-3072, -4096, 73, 'big'],
  [3072, -4096, 73, 'big'],
  [-940, -3308, 70, 'small'],
  [940, -3308, 70, 'small'],
  [0, -2816, 70, 'small'],
  [-3584, -2484, 70, 'small'],
  [3584, -2484, 70, 'small'],
  [-1788, -2302, 70, 'small'],
  [1788, -2302, 70, 'small'],
  [-2048, -1036, 70, 'small'],
  [0, -1024, 70, 'small'],
  [2048, -1036, 70, 'small'],
  [-3584, 0, 73, 'big'],
  [-1024, 0, 70, 'small'],
  [1024, 0, 70, 'small'],
  [3584, 0, 73, 'big'],
  [-2048, 1036, 70, 'small'],
  [0, 1024, 70, 'small'],
  [2048, 1036, 70, 'small'],
  [-1788, 2302, 70, 'small'],
  [1788, 2302, 70, 'small'],
  [-3584, 2484, 70, 'small'],
  [3584, 2484, 70, 'small'],
  [0, 2816, 70, 'small'],
  [-940, 3308, 70, 'small'],
  [940, 3308, 70, 'small'],
  [-3072, 4096, 73, 'big'],
  [3072, 4096, 73, 'big'],
  [-1792, 4184, 70, 'small'],
  [1792, 4184, 70, 'small'],
  [0, 4240, 70, 'small'],
].map(([x, y, z, padType], index) => ({
  id: `pad-${index}`,
  index,
  x,
  y,
  z,
  padType,
  boostValue: padType === 'big' ? 100 : 12,
}))
