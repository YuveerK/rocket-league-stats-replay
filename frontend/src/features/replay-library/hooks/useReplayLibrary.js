import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '@/services/apiClient'
import { dateInputBoundary, replayDate, replayTitle, searchableText } from '@/lib/replayUtils'

const EMPTY_REPLAYS = []

export function useReplayLibrary() {
  const navigate = useNavigate()
  const [library, setLibrary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [analysisJob, setAnalysisJob] = useState(null)

  const loadReplays = useCallback((force = false) => {
    if (force) setRefreshing(true)
    else setLoading(true)

    apiGet(`/api/replays${force ? '?refresh=1' : ''}`)
      .then((data) => {
        setLibrary(data)
        setError(null)
        setSelectedId((current) =>
          current ?? data.replays.find((r) => r.current)?.fileName ?? data.replays[0]?.fileName ?? null,
        )
      })
      .catch((err) => {
        setError(String(err))
        setLibrary(null)
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    const id = setTimeout(() => loadReplays(false), 0)
    return () => clearTimeout(id)
  }, [loadReplays])

  const replays = library?.replays ?? EMPTY_REPLAYS

  const filteredReplays = useMemo(() => {
    const text = query.trim().toLowerCase()
    const fromTime = dateInputBoundary(dateFrom)
    const toTime = dateInputBoundary(dateTo, true)

    return replays
      .filter((replay) => {
        if (text && !searchableText(replay).includes(text)) return false
        if (fromTime !== null || toTime !== null) {
          const t = replayDate(replay)?.getTime()
          if (!Number.isFinite(t)) return false
          if (fromTime !== null && t < fromTime) return false
          if (toTime !== null && t > toTime) return false
        }
        if (filter === 'current')  return replay.current
        if (filter === 'analyzed') return replay.analyzed
        if (filter === 'overtime') return replay.overtime
        if (filter === 'forfeit')  return replay.forfeit
        if (filter === 'standard') return !replay.overtime && !replay.forfeit
        return true
      })
      .sort((a, b) => {
        if (sort === 'oldest')   return (replayDate(a)?.getTime() ?? 0) - (replayDate(b)?.getTime() ?? 0)
        if (sort === 'duration') return (b.totalSecondsPlayed ?? 0) - (a.totalSecondsPlayed ?? 0)
        if (sort === 'goals')    return (b.goalCount ?? 0) - (a.goalCount ?? 0)
        if (sort === 'score')    return ((b.team0Score ?? 0) + (b.team1Score ?? 0)) - ((a.team0Score ?? 0) + (a.team1Score ?? 0))
        return (replayDate(b)?.getTime() ?? 0) - (replayDate(a)?.getTime() ?? 0)
      })
  }, [dateFrom, dateTo, filter, query, replays, sort])

  const selectedReplay = useMemo(
    () => filteredReplays.find((r) => r.fileName === selectedId) ?? filteredReplays[0] ?? null,
    [filteredReplays, selectedId],
  )

  const handleAnalyze = useCallback((replay) => {
    if (replay?.analyzed && replay?.replayId) {
      setRefreshing(true)
      apiPost(`/api/replays/${encodeURIComponent(replay.replayId)}/activate`)
        .then(() => {
          setError(null)
          loadReplays(true)
          navigate('/')
        })
        .catch((err) => setError(String(err)))
        .finally(() => setRefreshing(false))
      return
    }

    setAnalysisJob({ replayPath: replay.replayPath, replayName: replayTitle(replay) })
  }, [loadReplays, navigate])

  const handleAnalysisComplete = useCallback(() => {
    setAnalysisJob(null)
    loadReplays(true)
    navigate('/')
  }, [loadReplays, navigate])

  const clearFilters = useCallback(() => {
    setQuery('')
    setFilter('all')
    setSort('newest')
    setDateFrom('')
    setDateTo('')
  }, [])

  return {
    library,
    replays,
    filteredReplays,
    selectedReplay,
    loading,
    refreshing,
    error,
    query,      setQuery,
    filter,     setFilter,
    sort,       setSort,
    dateFrom,   setDateFrom,
    dateTo,     setDateTo,
    clearFilters,
    loadReplays,
    analysisJob,
    handleAnalyze,
    handleAnalysisComplete,
    setSelectedId,
  }
}
