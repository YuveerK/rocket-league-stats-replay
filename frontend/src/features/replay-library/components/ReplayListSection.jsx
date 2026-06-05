import { AlertCircle, FolderOpen, RefreshCcw, Search } from 'lucide-react'
import { ReplayCard } from './ReplayCard'

function EmptyPanel({ icon: Icon, title, children, action }) {
  return (
    <div className="glass-panel p-10 text-center">
      <Icon size={22} className="mx-auto mb-3 text-[var(--app-text-faint)]" />
      <p className="font-bold text-[var(--app-text)]">{title}</p>
      {children}
      {action}
    </div>
  )
}

export function ReplayListSection({
  loading,
  error,
  replays,
  filteredReplays,
  selectedReplay,
  onSelectReplay,
  onAnalyze,
  onClearFilters,
  sourceDir,
}) {
  if (loading) {
    return (
      <div className="glass-panel p-10 text-center">
        <RefreshCcw size={22} className="mx-auto mb-3 animate-spin text-blue-400" />
        <p className="font-bold text-[var(--app-text)]">Indexing replay headers...</p>
        <p className="mt-1 text-sm text-[var(--app-text-secondary)]">This is fast after the first cache pass.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-400/25 bg-rose-500/10 p-6 text-rose-200">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle size={17} />
          Replay library failed
        </div>
        <p className="mt-2 text-sm opacity-80">{error}</p>
      </div>
    )
  }

  if (replays.length === 0) {
    return (
      <EmptyPanel icon={FolderOpen} title="No replay files found.">
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--app-text-secondary)]">
          Save or move Rocket League replays into {sourceDir ?? 'your DemosEpic folder'}, then refresh the index.
        </p>
      </EmptyPanel>
    )
  }

  if (filteredReplays.length === 0) {
    return (
      <EmptyPanel icon={Search} title="No replays match those filters.">
        <button type="button" onClick={onClearFilters} className="glass-btn-ghost mt-4">
          Reset filters
        </button>
      </EmptyPanel>
    )
  }

  return (
    <div className="space-y-3">
      {filteredReplays.map((replay) => (
        <ReplayCard
          key={replay.fileName}
          replay={replay}
          selected={selectedReplay?.fileName === replay.fileName}
          onSelect={(r) => onSelectReplay(r.fileName)}
          onAnalyze={onAnalyze}
        />
      ))}
    </div>
  )
}
