import AnalysisProgress from '@/components/AnalysisProgress'
import { ReplayFilters } from '@/features/replay-library/components/ReplayFilters'
import { ReplayLibraryHeader } from '@/features/replay-library/components/ReplayLibraryHeader'
import { ReplayListSection } from '@/features/replay-library/components/ReplayListSection'
import { SelectedReplay } from '@/features/replay-library/components/SelectedReplay'
import { useReplayLibrary } from '@/features/replay-library/hooks/useReplayLibrary'

export default function ReplayLibrary() {
  const {
    library, replays, filteredReplays, selectedReplay,
    loading, refreshing, error,
    query, setQuery, filter, setFilter, sort, setSort,
    dateFrom, setDateFrom, dateTo, setDateTo,
    clearFilters, loadReplays,
    analysisJob, handleAnalyze, handleAnalysisComplete,
    setSelectedId,
  } = useReplayLibrary()

  return (
    <div className="anim-fade-in">
      {analysisJob && (
        <AnalysisProgress
          replayPath={analysisJob.replayPath}
          replayName={analysisJob.replayName}
          onComplete={handleAnalysisComplete}
        />
      )}

      <ReplayLibraryHeader library={library} refreshing={refreshing} onRefresh={() => loadReplays(true)} />

      <main className="mx-auto grid max-w-7xl gap-6 px-8 py-8 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 space-y-5">
          <ReplayFilters
            query={query}       onQueryChange={setQuery}
            filter={filter}     onFilterChange={setFilter}
            sort={sort}         onSortChange={setSort}
            dateFrom={dateFrom} onDateFromChange={setDateFrom}
            dateTo={dateTo}     onDateToChange={setDateTo}
            onClear={clearFilters}
            totalCount={replays.length}
            filteredCount={filteredReplays.length}
          />
          <ReplayListSection
            loading={loading}
            error={error}
            replays={replays}
            filteredReplays={filteredReplays}
            selectedReplay={selectedReplay}
            onSelectReplay={setSelectedId}
            onAnalyze={handleAnalyze}
            onClearFilters={clearFilters}
            sourceDir={library?.sourceDir}
          />
        </section>

        <aside>
          <SelectedReplay replay={selectedReplay} onAnalyze={handleAnalyze} />
        </aside>
      </main>
    </div>
  )
}
