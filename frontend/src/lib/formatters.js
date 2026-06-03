export function n(value, fallback = 0) {
  const x = Number(value)
  return Number.isFinite(x) ? x : fallback
}

export function fmt(value, decimals = 0) {
  return n(value).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  })
}

export function fmtPct(value) {
  return `${fmt(value, Number.isInteger(n(value)) ? 0 : 1)}%`
}

/** "5m 07s" — used in headers and hero metrics */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(n(seconds)))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}m ${String(secs).padStart(2, '0')}s`
}

/** "5:07" — compact form used in timelines and tables */
export function fmtDuration(seconds) {
  const total = Math.max(0, Math.floor(n(seconds)))
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function shortName(name, max = 15) {
  const text = String(name ?? 'Unknown')
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

/** "1m 07s" or "45s" — compact seconds; omits the minutes component when < 60 s */
export function fmtSeconds(value) {
  const total = Math.max(0, Math.round(n(value)))
  const mins  = Math.floor(total / 60)
  const secs  = total % 60
  return mins > 0 ? `${mins}m ${String(secs).padStart(2, '0')}s` : `${secs}s`
}
