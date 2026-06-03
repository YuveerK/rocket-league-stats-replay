import { useState, useCallback } from 'react'

/**
 * Manages the analysis job modal lifecycle.
 * Pass `onComplete` to run something (e.g. refetch) when analysis finishes.
 */
export function useAnalysisJob(onComplete) {
  const [analysisJob, setAnalysisJob] = useState(null)

  const handleAnalysisStart = useCallback((replayPath, replayName) => {
    setAnalysisJob({ replayPath, replayName })
  }, [])

  const handleAnalysisComplete = useCallback(() => {
    setAnalysisJob(null)
    onComplete?.()
  }, [onComplete])

  return { analysisJob, handleAnalysisStart, handleAnalysisComplete }
}
