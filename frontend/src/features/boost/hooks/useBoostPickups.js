import { useMemo } from 'react'
import { usePageData } from '@/hooks/usePageData'
import { buildPads }    from '../transforms/buildPads'
import { buildPlayers } from '../transforms/buildPlayers'
import { buildMetrics } from '../transforms/buildMetrics'

export function useBoostPickups() {
  const { data, loading, error } = usePageData('/api/boost-pickups')

  const players = useMemo(() => buildPlayers(data?.players),  [data?.players])
  const pads    = useMemo(() => buildPads(data),              [data])
  const metrics = useMemo(() => buildMetrics(players, data),  [players, data])

  const status = loading ? 'loading' : (error || !data) ? 'empty' : 'ready'
  return { status, meta: data, players, pads, metrics }
}
