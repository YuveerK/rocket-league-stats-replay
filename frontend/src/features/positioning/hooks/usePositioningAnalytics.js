import { useMemo } from 'react'
import { usePageData } from '@/hooks/usePageData'
import { buildPositioningViewModel } from '@/features/positioning/transforms/buildPositioningViewModel'

export function usePositioningAnalytics() {
  const { data, loading, error } = usePageData('/api/positioning')
  const status = loading ? 'loading' : (error || !data) ? 'empty' : 'ready'
  const model = useMemo(() => buildPositioningViewModel(data), [data])

  return {
    data,
    error,
    status,
    model,
  }
}
