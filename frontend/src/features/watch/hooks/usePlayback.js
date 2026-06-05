import { useCallback, useEffect, useRef, useState } from 'react'
import { SPEEDS, PAN_SPEED_MIN, PAN_SPEED_MAX } from '../constants'
import { hasPlaybackTimeMapping, skipResetDeadTime } from '../lib/playbackHelpers'

export function usePlayback(data) {
  const duration           = data?.match?.playbackDuration ?? 0
  const usesMappedPlayback = hasPlaybackTimeMapping(data)

  const [currentTime, setCurrentTime] = useState(0)
  const [playing,     setPlaying]     = useState(false)
  const [speed,       setSpeed]       = useState(1)
  const [panSpeed,    setPanSpeed]    = useState(1)
  const lastTickRef            = useRef(null)
  const prevTimeRef            = useRef(0)
  const panSpeedRef            = useRef(1)
  const speedRef               = useRef(speed)
  const dataRef                = useRef(data)
  const usesMappedPlaybackRef  = useRef(usesMappedPlayback)
  const durationRef            = useRef(duration)

  useEffect(() => {
    speedRef.current              = speed
    dataRef.current               = data
    usesMappedPlaybackRef.current = usesMappedPlayback
    durationRef.current           = duration
  }, [data, duration, speed, usesMappedPlayback])

  // Playback ticker — only starts when we have real data (duration > 0).
  // speed/data/usesMappedPlayback are read via refs so the loop never restarts
  // on every render, which would cause React's nested-update limit to be exceeded.
  useEffect(() => {
    if (!playing || durationRef.current <= 0) { lastTickRef.current = null; return undefined }
    let frameId = null
    const tick = (timestamp) => {
      if (lastTickRef.current !== null) {
        const delta = ((timestamp - lastTickRef.current) / 1000) * speedRef.current
        setCurrentTime(prev => {
          const next = usesMappedPlaybackRef.current
            ? prev + delta
            : skipResetDeadTime(dataRef.current?.resetSegments, prev, prev + delta)
          return Math.min(next, durationRef.current)
        })
      }
      lastTickRef.current = timestamp
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => { if (frameId) cancelAnimationFrame(frameId) }
  }, [playing])

  // Stop playback once we reach the end
  useEffect(() => {
    if (playing && duration > 0 && currentTime >= duration) {
      const id = setTimeout(() => setPlaying(false), 0)
      return () => clearTimeout(id)
    }
    return undefined
  }, [currentTime, duration, playing])

  const reset = useCallback(() => { setPlaying(false); setCurrentTime(0) }, [])

  const setPanSpeedBoth = useCallback(value => {
    setPanSpeed(value)
    panSpeedRef.current = value
  }, [])

  return {
    currentTime, setCurrentTime,
    playing, setPlaying,
    speed, setSpeed, SPEEDS,
    panSpeed, setPanSpeed: setPanSpeedBoth,
    panSpeedRef, prevTimeRef,
    duration,
    reset,
    PAN_SPEED_MIN, PAN_SPEED_MAX,
  }
}
