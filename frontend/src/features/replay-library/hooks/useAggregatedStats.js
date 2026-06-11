import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet } from '@/services/apiClient'

export function useAggregatedStats({ dateFrom, dateTo, filteredReplays }) {
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [selectedPlayers, setSelectedPlayers] = useState(new Set())
  const [viewMode, setViewMode]       = useState('individual') // 'individual' | 'team'
  const [expanded, setExpanded]       = useState(false)

  const dateActive = Boolean(dateFrom || dateTo)

  const analyzedCount = useMemo(
    () => filteredReplays.filter((r) => r.analyzed).length,
    [filteredReplays],
  )

  // Fetch when expanded and conditions are met
  useEffect(() => {
    if (!expanded || !dateActive || !analyzedCount) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo)   params.set('dateTo',   dateTo)
    apiGet(`/api/aggregate?${params}`)
      .then((d) => {
        setData(d)
        setSelectedPlayers(new Set(d.players.map((p) => p.name)))
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [expanded, dateActive, analyzedCount, dateFrom, dateTo])

  // Collapse when date filter clears
  useEffect(() => {
    if (!dateActive) setExpanded(false)
  }, [dateActive])

  const togglePlayer = useCallback((name) => {
    setSelectedPlayers((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const selectAll  = useCallback(() => {
    if (data) setSelectedPlayers(new Set(data.players.map((p) => p.name)))
  }, [data])

  const selectNone = useCallback(() => setSelectedPlayers(new Set()), [])

  return {
    data,
    loading,
    error,
    expanded,
    setExpanded,
    selectedPlayers,
    togglePlayer,
    selectAll,
    selectNone,
    viewMode,
    setViewMode,
    dateActive,
    analyzedCount,
  }
}
