import { Crosshair, Layers, Shield, Wind, Zap } from 'lucide-react'
import { BLUE, GOLD, GREEN, ORANGE, PURPLE, RED } from '@/lib/colors'

export const BALL_HEADER_GRADIENT =
  'radial-gradient(circle at 18% 0%, rgba(56,189,248,0.18), transparent 32%), ' +
  'radial-gradient(circle at 78% 0%, rgba(251,146,60,0.18), transparent 32%), ' +
  'linear-gradient(135deg,#080b16 0%,#05070f 58%,#080b16 100%)'

export const MODE_OPTIONS = [
  { key: 'full', label: 'Full Match', Icon: Layers, color: '#e5e7eb' },
  { key: 'ground', label: 'Ground Only', Icon: Shield, color: GREEN },
  { key: 'aerial', label: 'Aerial Only', Icon: Wind, color: PURPLE },
  { key: 'fast', label: 'Fast Ball', Icon: Zap, color: GOLD },
  { key: 'pressure', label: 'Pressure View', Icon: Crosshair, color: BLUE },
]

export const BALL_COLORS = {
  blue: BLUE,
  orange: ORANGE,
  green: GREEN,
  purple: PURPLE,
  gold: GOLD,
  red: RED,
  neutral: '#e5e7eb',
  cyan: '#38bdf8',
}
