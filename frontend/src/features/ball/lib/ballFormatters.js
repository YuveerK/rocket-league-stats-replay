import { fmt, n } from '@/lib/formatters'

const UU_TO_KPH = 0.036
const UU_TO_MPH = 0.0223694

export function fmtSpeed(value) {
  return `${fmt(n(value) * UU_TO_KPH, 1)} km/h`
}

export function fmtSpeedDetail(value) {
  return `${fmt(n(value) * UU_TO_MPH, 1)} mph / ${fmt(value)} UU/s`
}

export function shortLabel(value) {
  const text = String(value ?? '')
  return text.length > 18 ? `${text.slice(0, 17)}...` : text
}
