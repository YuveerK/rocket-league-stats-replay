export function usableLocation(location) {
  return (
    location &&
    Number.isFinite(Number(location.x)) &&
    Number.isFinite(Number(location.y)) &&
    !(Number(location.x) === 0 && Number(location.y) === 0)
  )
}

export function median(values) {
  const sorted = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function medianLocation(locations) {
  const usable = locations.filter(usableLocation)
  if (!usable.length) return null
  return {
    x: median(usable.map(l => l.x)),
    y: median(usable.map(l => l.y)),
    z: median(usable.map(l => l.z ?? 0)),
  }
}
