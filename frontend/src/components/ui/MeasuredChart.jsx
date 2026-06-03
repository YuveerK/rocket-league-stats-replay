import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Measures its container width via ResizeObserver and renders children
 * as a render-prop function receiving `{ width, height }`.
 * Prevents recharts from collapsing to zero on first paint.
 */
export function MeasuredChart({ height, children }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined

    const measure = () => {
      setWidth(Math.max(0, Math.floor(node.getBoundingClientRect().width)))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="w-full min-w-0" style={{ height }}>
      {width > 0 ? children({ width, height }) : null}
    </div>
  )
}
