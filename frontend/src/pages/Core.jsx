import { Activity, BarChart3, Clock, Upload } from 'lucide-react'
import CoreAnalytics from '@/components/CoreAnalytics'
import UploadReplay from '@/components/UploadReplay'
import AnalysisProgress from '@/components/AnalysisProgress'
import { HeroMetric } from '@/components/ui/HeroMetric'
import { usePageData } from '@/hooks/usePageData'
import { useAnalysisJob } from '@/hooks/useAnalysisJob'
import { formatDuration } from '@/lib/formatters'

export default function Core() {
  const { data, loading, error, refetch } = usePageData('/api/overview')
  const { analysisJob, handleAnalysisStart, handleAnalysisComplete } = useAnalysisJob(refetch)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white/30 text-sm">
        Loading core analytics...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        {analysisJob && (
          <AnalysisProgress
            replayPath={analysisJob.replayPath}
            replayName={analysisJob.replayName}
            onComplete={handleAnalysisComplete}
          />
        )}
        <UploadReplay onAnalysisStart={handleAnalysisStart} />
      </div>
    )
  }

  const blueGoals  = data.match.scoreTeam0 ?? 0
  const orangeGoals = data.match.scoreTeam1 ?? 0
  const totalShots  = (data.teams?.[0]?.shots ?? 0) + (data.teams?.[1]?.shots ?? 0)
  const totalDemos  = (data.teams?.[0]?.demosInflicted ?? 0) + (data.teams?.[1]?.demosInflicted ?? 0)

  return (
    <div className="anim-fade-in">
      {analysisJob && (
        <AnalysisProgress
          replayPath={analysisJob.replayPath}
          replayName={analysisJob.replayName}
          onComplete={handleAnalysisComplete}
        />
      )}

      <header
        className="relative overflow-hidden border-b border-white/6"
        style={{
          background: 'radial-gradient(circle at 18% 0%, rgba(96,165,250,0.20), transparent 32%), radial-gradient(circle at 82% 0%, rgba(251,146,60,0.18), transparent 30%), linear-gradient(135deg,#080b16 0%,#05070f 58%,#080b16 100%)',
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
        <div className="px-8 py-8 max-w-7xl mx-auto space-y-7">
          <div className="flex items-start justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/4 text-xs text-white/45 mb-4">
                <Activity size={13} className="text-emerald-300" />
                Core performance intelligence
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Core Stats Command Center</h1>
              <p className="text-white/35 text-sm mt-2 max-w-2xl">
                High-signal team and player graphs for scoring pressure, conversion, defensive context and demos.
              </p>
            </div>
            <UploadReplay onAnalysisStart={handleAnalysisStart} compact />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <HeroMetric label="Final Score" value={`${blueGoals} - ${orangeGoals}`} color="#e5e7eb" />
            <HeroMetric label="Total Shots"  value={totalShots}  color="#38bdf8" />
            <HeroMetric label="Total Demos"  value={totalDemos}  color="#f43f5e" />
            <HeroMetric label="Match Time"   value={formatDuration(data.match.totalSecondsPlayed)} color="#a78bfa" />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-white/35">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/4 border border-white/[0.07]">
              <BarChart3 size={12} /> {data.match.replayName ?? 'Replay'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/4 border border-white/[0.07]">
              <Clock size={12} /> {formatDuration(data.match.totalSecondsPlayed)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/4 border border-white/[0.07]">
              <Upload size={12} /> Replay-backed analytics
            </span>
          </div>
        </div>
      </header>

      <main className="px-8 py-8 max-w-7xl mx-auto">
        <CoreAnalytics players={data.players} teams={data.teams} />
      </main>
    </div>
  )
}
