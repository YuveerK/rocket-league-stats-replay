import { useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/services/apiClient'

/**
 * Generic data-fetching hook. Fetches `endpoint` on mount and exposes
 * `refetch` so callers can reload after analysis completes.
 */
export function usePageData(endpoint) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    apiGet(endpoint)
      .then(d => { setData(d); setError(null) })
      .catch(e => { setError(String(e)); setData(null) })
      .finally(() => setLoading(false))
  }, [endpoint])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiGet(endpoint)
      .then(d => { if (!cancelled) { setData(d); setError(null) } })
      .catch(e => { if (!cancelled) { setError(String(e)); setData(null) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [endpoint])

  return { data, loading, error, refetch: fetchData }
}
