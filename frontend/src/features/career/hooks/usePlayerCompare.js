import { useEffect, useState } from 'react'
import { apiGet } from '@/services/apiClient'

export function usePlayerCompare() {
  const [players, setPlayers] = useState([])
  const [playersLoading, setPlayersLoading] = useState(true)
  const [playerA, setPlayerA] = useState('')
  const [playerB, setPlayerB] = useState('')
  const [compare, setCompare] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    apiGet('/api/career/players')
      .then((rows) => {
        if (!cancelled) {
          setPlayers(rows)
          setPlayerA(rows[0]?.playerName ?? '')
          setPlayerB(rows[1]?.playerName ?? '')
        }
      })
      .catch(() => { if (!cancelled) setError('Could not load player list.') })
      .finally(() => { if (!cancelled) setPlayersLoading(false) })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!playerA || !playerB || playerA === playerB) return undefined

    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) { setLoading(true); setError(null) }
    })

    apiGet(`/api/career/compare?playerA=${encodeURIComponent(playerA)}&playerB=${encodeURIComponent(playerB)}`)
      .then((payload) => { if (!cancelled) setCompare(payload) })
      .catch((err) => { if (!cancelled) { setCompare(null); setError(err.message) } })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [playerA, playerB])

  const activeCompare =
    compare?.playerA?.playerName === playerA && compare?.playerB?.playerName === playerB
      ? compare
      : null

  const needsSecondPlayer = !playersLoading && players.length < 2
  const samePlayer = Boolean(playerA && playerB && playerA === playerB)
  const isLoading =
    playersLoading ||
    loading ||
    Boolean(playerA && playerB && !activeCompare && !error && !samePlayer)

  return {
    players,
    playerA, setPlayerA,
    playerB, setPlayerB,
    activeCompare,
    commonMaps:        activeCompare?.commonMaps          ?? [],
    commonTeammates:   activeCompare?.peerOverlap?.teammates ?? [],
    commonOpponents:   activeCompare?.peerOverlap?.opponents  ?? [],
    sharedMatches:     activeCompare?.sharedMatches        ?? [],
    isLoading,
    needsSecondPlayer,
    samePlayer,
    error,
  }
}
