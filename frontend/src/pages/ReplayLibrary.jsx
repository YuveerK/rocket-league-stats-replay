import AnalysisProgress from "@/components/AnalysisProgress";
import { AggregatedStatsPanel } from "@/features/replay-library/components/AggregatedStatsPanel";
import { ReplayFilters } from "@/features/replay-library/components/ReplayFilters";
import { ReplayLibraryHeader } from "@/features/replay-library/components/ReplayLibraryHeader";
import { ReplayListSection } from "@/features/replay-library/components/ReplayListSection";
import { SelectedReplay } from "@/features/replay-library/components/SelectedReplay";
import { useAggregatedStats } from "@/features/replay-library/hooks/useAggregatedStats";
import { useReplayLibrary } from "@/features/replay-library/hooks/useReplayLibrary";

export default function ReplayLibrary() {
  const {
    library,
    replays,
    filteredReplays,
    selectedReplay,
    loading,
    refreshing,
    error,
    query,
    setQuery,
    filter,
    setFilter,
    sort,
    setSort,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    clearFilters,
    loadReplays,
    analysisJob,
    handleAnalyze,
    handleAnalysisComplete,
    setSelectedId,
  } = useReplayLibrary();

  const aggregated = useAggregatedStats({ dateFrom, dateTo, filteredReplays });

  return (
    <div className="anim-fade-in">
      {analysisJob && (
        <AnalysisProgress
          replayPath={analysisJob.replayPath}
          replayName={analysisJob.replayName}
          onComplete={handleAnalysisComplete}
        />
      )}

      <ReplayLibraryHeader
        library={library}
        refreshing={refreshing}
        onRefresh={() => loadReplays(true)}
      />

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0 space-y-5">
          {/* Mobile: compact selected-replay banner above the filter row */}
          {selectedReplay && (
            <div className="lg:hidden">
              <SelectedReplay replay={selectedReplay} onAnalyze={handleAnalyze} mobile />
            </div>
          )}

          <ReplayFilters
            query={query}
            onQueryChange={setQuery}
            filter={filter}
            onFilterChange={setFilter}
            sort={sort}
            onSortChange={setSort}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            onClear={clearFilters}
            totalCount={replays.length}
            filteredCount={filteredReplays.length}
          />

          <AggregatedStatsPanel
            data={aggregated.data}
            loading={aggregated.loading}
            error={aggregated.error}
            expanded={aggregated.expanded}
            setExpanded={aggregated.setExpanded}
            selectedPlayers={aggregated.selectedPlayers}
            togglePlayer={aggregated.togglePlayer}
            selectAll={aggregated.selectAll}
            selectNone={aggregated.selectNone}
            viewMode={aggregated.viewMode}
            setViewMode={aggregated.setViewMode}
            dateActive={aggregated.dateActive}
            analyzedCount={aggregated.analyzedCount}
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

        {/* Desktop sidebar — hidden below lg */}
        <aside className="hidden lg:block">
          <SelectedReplay replay={selectedReplay} onAnalyze={handleAnalyze} />
        </aside>
      </main>
    </div>
  );
}
