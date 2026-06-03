import AnalysisProgress from '@/components/AnalysisProgress'
import UploadReplay from '@/components/UploadReplay'

/**
 * Shared shell for every replay-data page.
 *
 * status  – 'loading' | 'empty' | 'ready'
 * analysis – { analysisJob, handleAnalysisStart, handleAnalysisComplete }
 *   as returned by useAnalysisJob(refetch)
 * error   – optional error string shown below the upload widget
 */
export default function ReplayPage({ status, analysis, error, children }) {
  const { analysisJob, handleAnalysisStart, handleAnalysisComplete } = analysis

  return (
    <>
      {analysisJob && (
        <AnalysisProgress
          replayPath={analysisJob.replayPath}
          replayName={analysisJob.replayName}
          onComplete={handleAnalysisComplete}
        />
      )}

      {status === 'loading' && (
        <div className="flex items-center justify-center min-h-screen text-white/30 text-sm">
          Loading…
        </div>
      )}

      {status === 'empty' && (
        <div className="mx-auto max-w-2xl p-8">
          <UploadReplay onAnalysisStart={handleAnalysisStart} />
          {error && (
            <p className="mt-4 text-center text-sm text-red-400">{error}</p>
          )}
        </div>
      )}

      {status === 'ready' && children}
    </>
  )
}
