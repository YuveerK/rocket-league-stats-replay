export const BLUE   = '#60a5fa'
export const ORANGE = '#fb923c'

export const SCALE = 0.01

export const CAR_LENGTH = 2.1
export const CAR_WIDTH  = 1.28
export const CAR_HEIGHT = 0.76
export const CAR_ORIGIN_GROUND_OFFSET    = 18.8 * SCALE
export const CAR_BODY_VISUAL_LIFT        = 0.18
export const CAR_VISUAL_COLLISION_RADIUS = Math.hypot(CAR_LENGTH, CAR_WIDTH) * 0.34

export const BALL_RADIUS = 0.93

export const SPEEDS         = [0.5, 1, 2, 4]
export const PAN_SPEED_BASE = 22
export const PAN_SPEED_FAST = 60
export const PAN_SPEED_MIN  = 0.25
export const PAN_SPEED_MAX  = 4

export const BOOST_AMOUNT_MAX      = 255
export const THROTTLE_FORWARD_MIN  = 133
export const THROTTLE_REVERSE_MAX  = 123
export const BOOST_DRAIN_MIN       = 0.5
export const MIN_BOOST_SPEED       = 500
export const MIN_FORWARD_DOT       = 0.2

export const APPLY_VISUAL_OVERLAP_CORRECTION = false

export const PAD_PICKUP_GLOW_SEC  = { big: 0.55, small: 0.38 }
export const PAD_PICKUP_GLOW_PEAK = { big: 0.50, small: 0.36 }
