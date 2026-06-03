import { useEffect, useRef } from 'react'
import { createScene } from './createScene'

export function SceneViewer({ data, panSpeedRef, sceneRef }) {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!data || !mountRef.current) return undefined
    sceneRef.current?.cleanup?.()
    sceneRef.current = createScene(mountRef.current, data, panSpeedRef)
    return () => {
      sceneRef.current?.cleanup?.()
      sceneRef.current = null
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mountRef} className="absolute inset-0" />
}
