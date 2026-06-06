import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '@/services/apiClient'
import { n } from '@/lib/formatters'

export function usePeerBreakdown() {
  const [players, setPlayers] = useState([])
  const [playersLoading, setPlayersLoading] = useState(true)
  const [selected, setSelected] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    apiGet('/api/career/players')
      .then((rows) => {
        if (!cancelled) {
          setPlayers(rows)
          if (rows.length > 0) setSelected(rows[0].playerName)
        }
      })
      .catch(() => { if (!cancelled) setError('Could not load player list.') })
      .finally(() => { if (!cancelled) setPlayersLoading(false) })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selected) return undefined

    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) { setLoading(true); setError(null) }
    })

    apiGet(`/api/career/peers?player=${encodeURIComponent(selected)}`)
      .then((payload) => { if (!cancelled) setData(payload) })
      .catch((err) => { if (!cancelled) { setData(null); setError(err.message) } })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selected])

  const selectedPlayer = useMemo(
    () => players.find((p) => p.playerName === selected),
    [players, selected],
  )

  const activeData = data?.playerName === selected ? data : null
  const summary = activeData?.summary
  const teammates = activeData?.teammates ?? []
  const opponents = activeData?.opponents ?? []
  const isLoading = playersLoading || loading || Boolean(selected && !summary && !error)

  const teammateGames = useMemo(() => teammates.reduce((sum, row) => sum + n(row.matches), 0), [teammates])
  const opponentGames = useMemo(() => opponents.reduce((sum, row) => sum + n(row.matches), 0), [opponents])

  return {
    players, selected, setSelected,
    selectedPlayer, summary, teammates, opponents,
    teammateGames, opponentGames,
    isLoading, error,
  }
}
