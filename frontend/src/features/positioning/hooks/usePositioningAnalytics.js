import { useMemo } from 'react'
import { useAnalysisJob } from '@/hooks/useAnalysisJob'
import { usePageData } from '@/hooks/usePageData'
import { buildPositioningViewModel } from '@/features/positioning/transforms/buildPositioningViewModel'

export function usePositioningAnalytics() {
  const { data, loading, error, refetch } = usePageData('/api/positioning')
  const analysis = useAnalysisJob(refetch)
  const status = loading ? 'loading' : (error || !data) ? 'empty' : 'ready'
  const model = useMemo(() => buildPositioningViewModel(data), [data])

  return {
    data,
    error,
    status,
    analysis,
    model,
  }
}
