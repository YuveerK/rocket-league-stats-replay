import { useEffect, useState } from 'react'
import { eventPlaybackSeconds } from '../lib/playbackHelpers'

export function useWatchData() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetch('/api/watch-data')
      .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e.error)))
      .then(payload => {
        payload.events = [...(payload.events ?? [])].sort(
          (a, b) => eventPlaybackSeconds(a) - eventPlaybackSeconds(b),
        )
        setData(payload)
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
