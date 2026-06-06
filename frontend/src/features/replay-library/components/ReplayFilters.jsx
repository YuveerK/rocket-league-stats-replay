import { Activity, Calendar, Filter, Search, X } from 'lucide-react'

export function ReplayFilters({
  query,    onQueryChange,
  filter,   onFilterChange,
  sort,     onSortChange,
  dateFrom, onDateFromChange,
  dateTo,   onDateToChange,
  onClear,
  totalCount,
  filteredCount,
}) {
  return (
    <div className="glass-panel p-4">
      {/* Row 1: search (full width) */}
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-text-faint)]" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search player, map, replay ID or score..."
          className="glass-input glass-input--with-icon"
        />
      </label>

      {/* Row 2: filter + sort + clear */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="relative block">
          <Filter size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-text-faint)]" />
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="glass-input glass-input--with-icon-sm font-bold text-[var(--app-text-secondary)]"
          >
            <option value="all">All replays</option>
            <option value="current">Current</option>
            <option value="analyzed">Analyzed</option>
            <option value="overtime">Overtime</option>
            <option value="forfeit">Forfeit</option>
            <option value="standard">Standard</option>
          </select>
        </label>

        <label className="relative block">
          <Activity size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-text-faint)]" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="glass-input glass-input--with-icon-sm font-bold text-[var(--app-text-secondary)]"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="duration">Longest</option>
            <option value="goals">Most goals</option>
            <option value="score">Highest scoreline</option>
          </select>
        </label>

        <button type="button" onClick={onClear} className="glass-btn-ghost col-span-2 sm:col-span-1">
          <X size={14} />
          Clear
        </button>
      </div>

      {/* Row 3: date range + count */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_minmax(0,1fr)]">
        <label className="relative block">
          <Calendar size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-text-faint)]" />
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => onDateFromChange(e.target.value)}
            aria-label="Replay date from"
            className="glass-input glass-input--with-icon-sm font-bold text-[var(--app-text-secondary)]"
          />
        </label>

        <label className="relative block">
          <Calendar size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--app-text-faint)]" />
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => onDateToChange(e.target.value)}
            aria-label="Replay date to"
            className="glass-input glass-input--with-icon-sm font-bold text-[var(--app-text-secondary)]"
          />
        </label>

        <div className="meta-strip col-span-2 sm:col-span-1">
          Showing <span className="mx-1 font-black text-[var(--app-text)]">{filteredCount}</span> of {totalCount} replays
        </div>
      </div>
    </div>
  )
}
