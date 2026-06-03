import { BLUE, ORANGE } from '@/lib/colors'

export const BLUE_SHADES   = ['#60a5fa', '#93c5fd', '#3b82f6']
export const ORANGE_SHADES = ['#fb923c', '#fdba74', '#f97316']

export function teamLabel(team) { return team === 0 ? 'Blue' : 'Orange' }
export function teamColor(team) { return team === 0 ? BLUE : ORANGE }
