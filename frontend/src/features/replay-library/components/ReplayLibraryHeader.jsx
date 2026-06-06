import { CheckCircle, Clock, FolderOpen, Map as MapIcon, RefreshCcw } from 'lucide-react'
import { StatTile } from './StatTile'

const HEADER_GRADIENT =
  'radial-gradient(circle at 18% -12%, rgba(96,165,250,0.28), transparent 34%), radial-gradient(circle at 88% 0%, rgba(251,146,60,0.18), transparent 30%), linear-gradient(135deg,#080b16 0%,#05070f 58%,#080b16 100%)'

export function ReplayLibraryHeader({ library, refreshing, onRefresh }) {
  return (
    <header
      className="page-header-shell relative overflow-hidden border-b border-[var(--app-border)] transition-colors duration-200"
      style={{ background: HEADER_GRADIENT }}
    >
      <div className="header-divider absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="eyebrow-pill mb-4">
              <FolderOpen size={13} className="text-blue-400" />
              Replay library
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--app-text)] sm:text-3xl">Choose Your Replay</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--app-text-secondary)]">
              Search by player, map, scoreline or match state, then analyze the exact replay you want.
            </p>
            {library?.sourceDir && (
              <p className="mt-2 max-w-3xl truncate text-xs text-[var(--app-text-faint)]">
                Source folder: {library.sourceDir}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="glass-btn-ghost"
            >
              <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh index
            </button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-4">
          <StatTile label="Replays"  value={library?.summary?.total    ?? '-'} icon={FolderOpen}  color="#60a5fa" />
          <StatTile label="Analyzed" value={library?.summary?.analyzed  ?? '-'} icon={CheckCircle} color="#34d399" />
          <StatTile label="Overtime" value={library?.summary?.overtime  ?? '-'} icon={Clock}       color="#facc15" />
          <StatTile label="Maps"     value={library?.summary?.maps      ?? '-'} icon={MapIcon}     color="#a78bfa" />
        </div>
      </div>
    </header>
  )
}
