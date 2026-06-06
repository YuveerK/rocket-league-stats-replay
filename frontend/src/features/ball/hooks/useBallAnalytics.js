import { useMemo, useState } from 'react'
import { usePageData } from '@/hooks/usePageData'
import { buildBallViewModel } from '@/features/ball/transforms/buildBallViewModel'

export function useBallAnalytics() {
  const { data, loading, error } = usePageData('/api/ball-data')
  const [mode, setMode] = useState('full')

  const status = loading ? 'loading' : (error || !data) ? 'empty' : 'ready'
  const model = useMemo(() => buildBallViewModel(data, mode), [data, mode])

  return {
    data,
    error,
    status,
    mode,
    setMode,
    model,
  }
}
