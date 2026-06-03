import { useMemo, useState } from 'react'
import { usePageData } from '@/hooks/usePageData'
import { useAnalysisJob } from '@/hooks/useAnalysisJob'
import { buildBallViewModel } from '@/features/ball/transforms/buildBallViewModel'

export function useBallAnalytics() {
  const { data, loading, error, refetch } = usePageData('/api/ball-data')
  const analysis = useAnalysisJob(refetch)
  const [mode, setMode] = useState('full')

  const status = loading ? 'loading' : (error || !data) ? 'empty' : 'ready'
  const model = useMemo(() => buildBallViewModel(data, mode), [data, mode])

  return {
    data,
    error,
    status,
    analysis,
    mode,
    setMode,
    model,
  }
}
