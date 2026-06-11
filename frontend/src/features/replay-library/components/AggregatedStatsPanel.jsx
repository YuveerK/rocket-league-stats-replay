import { BarChart2, ChevronDown, ChevronUp, User, Users } from 'lucide-react'

// Returns 'teammate' | 'opponent' | 'mixed' based on game counts relative to primary player
function deriveRole(player, primaryPlayer) {
  if (player.name === primaryPlayer) return 'teammate'
  const t = player.asTeammate.gamesPlayed
  const o = player.asOpponent.gamesPlayed
  if (t === 0 && o === 0) return 'unknown'
  if (t > 0 && o > 0) return 'mixed'
  return t >= o ? 'teammate' : 'opponent'
}

const COLUMNS = [
  { key: 'name',         label: 'Player',    sticky: true,  dim: false },
  { key: 'gamesPlayed',  label: 'GP',        sticky: false, dim: false },
  { key: 'wl',           label: 'W–L',       sticky: false, dim: false },
  { key: 'winRate',      label: 'Win%',      sticky: false, dim: false },
  { key: 'avgGoals',     label: 'Gls/G',     sticky: false, dim: false },
  { key: 'avgAssists',   label: 'Ast/G',     sticky: false, dim: false },
  { key: 'avgSaves',     label: 'Sav/G',     sticky: false, dim: false },
  { key: 'avgShots',     label: 'Sht/G',     sticky: false, dim: false },
  { key: 'avgScore',     label: 'Sc/G',      sticky: false, dim: false },
  { key: 'shootingPct',  label: 'Sh%',       sticky: false, dim: false },
  { key: 'avgBoost',     label: 'Boost',     sticky: false, dim: true  },
  { key: 'supersonicPct',label: 'SS%',       sticky: false, dim: true  },
  { key: 'airbornePct',  label: 'Air%',      sticky: false, dim: true  },
]

function cellValue(col, stats) {
  if (col.key === 'wl')          return null // rendered specially
  if (col.key === 'winRate')     return `${stats.winRate}%`
  if (col.key === 'shootingPct') return stats.shootingPct != null ? `${stats.shootingPct}%` : null
  if (col.key === 'supersonicPct') return stats.supersonicPct != null ? `${stats.supersonicPct}%` : null
  if (col.key === 'airbornePct') return stats.airbornePct != null   ? `${stats.airbornePct}%`    : null
  return stats[col.key] ?? null
}

function StatsRow({ name, stats, isPrimary }) {
  return (
    <tr className={`border-b border-[var(--app-glass-border)] transition-colors hover:bg-[var(--app-surface-muted)] ${isPrimary ? 'bg-blue-500/5' : ''}`}>
      <td className="sticky left-0 z-10 whitespace-nowrap bg-[var(--app-surface)] px-3 py-2.5 font-bold text-[var(--app-text)]">
        {name}
        {isPrimary && (
          <span className="ml-1.5 text-[9px] font-black uppercase tracking-wider text-blue-400/70">you</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center tabular-nums text-[var(--app-text)]">{stats.gamesPlayed}</td>
      <td className="px-3 py-2.5 text-center tabular-nums">
        <span className="text-emerald-400">{stats.wins}</span>
        <span className="mx-0.5 text-[var(--app-text-faint)]">–</span>
        <span className="text-rose-400">{stats.losses}</span>
      </td>
      {COLUMNS.slice(3).map((col) => {
        const val = cellValue(col, stats)
        return (
          <td
            key={col.key}
            className={`px-3 py-2.5 text-center tabular-nums ${col.dim ? 'text-[var(--app-text-secondary)]' : 'text-[var(--app-text)]'}`}
          >
            {val ?? <span className="text-[var(--app-text-faint)]">—</span>}
          </td>
        )
      })}
    </tr>
  )
}

function SectionHeader({ label, color }) {
  return (
    <tr>
      <td
        colSpan={COLUMNS.length}
        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
          color === 'blue'   ? 'bg-blue-500/8 text-blue-400/80'   :
          color === 'orange' ? 'bg-orange-500/8 text-orange-400/80' :
                               'bg-[var(--app-surface-muted)] text-[var(--app-text-faint)]'
        }`}
      >
        {label}
      </td>
    </tr>
  )
}

export function AggregatedStatsPanel({
  data, loading, error, expanded, setExpanded,
  selectedPlayers, togglePlayer, selectAll, selectNone,
  viewMode, setViewMode,
  dateActive, analyzedCount,
}) {
  if (!dateActive) return null

  const players        = data?.players ?? []
  const primaryPlayer  = data?.primaryPlayer ?? null
  const selectedList   = players.filter((p) => selectedPlayers.has(p.name))

  // For team mode: split by role
  const teammates  = selectedList.filter((p) => {
    const r = deriveRole(p, primaryPlayer)
    return r === 'teammate' || r === 'mixed'
  })
  const opponents  = selectedList.filter((p) => deriveRole(p, primaryPlayer) === 'opponent')

  return (
    <div className="glass-panel overflow-hidden">
      {/* Collapsed trigger row */}
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          disabled={!analyzedCount}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--app-surface-muted)] disabled:opacity-40"
        >
          <div className="flex items-center gap-2.5">
            <BarChart2 size={15} className="shrink-0 text-[var(--app-accent)]" />
            <span className="text-sm font-black text-[var(--app-text)]">Date Range Insights</span>
            {analyzedCount > 0 && (
              <span className="rounded-full bg-[var(--app-accent)]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--app-accent)]">
                {analyzedCount} analyzed
              </span>
            )}
            {!analyzedCount && (
              <span className="text-xs text-[var(--app-text-faint)]">No analyzed replays in range</span>
            )}
          </div>
          <ChevronDown size={15} className="shrink-0 text-[var(--app-text-faint)]" />
        </button>
      )}

      {/* Expanded state */}
      {expanded && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--app-glass-border)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <BarChart2 size={15} className="shrink-0 text-[var(--app-accent)]" />
              <span className="text-sm font-black text-[var(--app-text)]">Date Range Insights</span>
              {data && (
                <span className="rounded-full bg-[var(--app-accent)]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--app-accent)]">
                  {data.replayCount} replays
                </span>
              )}
              {data?.primaryPlayer && (
                <span className="hidden text-xs text-[var(--app-text-faint)] sm:inline">
                  · primary: <span className="font-bold text-[var(--app-text-secondary)]">{data.primaryPlayer}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center rounded-lg border border-[var(--app-glass-border)] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('individual')}
                  title="Individual view"
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                    viewMode === 'individual'
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                  }`}
                >
                  <User size={11} />
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('team')}
                  title="Team view"
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                    viewMode === 'team'
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                  }`}
                >
                  <Users size={11} />
                  Team
                </button>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-lg p-1.5 text-[var(--app-text-faint)] transition-colors hover:text-[var(--app-text)]"
              >
                <ChevronUp size={15} />
              </button>
            </div>
          </div>

          {/* Player selector */}
          {players.length > 0 && (
            <div className="border-b border-[var(--app-glass-border)] px-4 py-3">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--app-text-faint)]">Players</span>
                <button type="button" onClick={selectAll}  className="text-[10px] font-bold text-[var(--app-accent)] hover:opacity-75">All</button>
                <button type="button" onClick={selectNone} className="text-[10px] font-bold text-[var(--app-text-faint)] hover:text-[var(--app-text-secondary)]">None</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {players.map((p) => {
                  const selected = selectedPlayers.has(p.name)
                  const role     = viewMode === 'team' ? deriveRole(p, primaryPlayer) : null
                  const isPrimary = p.name === primaryPlayer
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => togglePlayer(p.name)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-bold transition-all ${
                        selected
                          ? isPrimary || role === 'teammate' || role === 'mixed'
                            ? 'border-blue-400/40 bg-blue-500/15 text-blue-300'
                            : role === 'opponent'
                            ? 'border-orange-400/40 bg-orange-500/15 text-orange-300'
                            : 'border-[var(--app-accent)]/40 bg-[var(--app-accent)]/15 text-[var(--app-accent)]'
                          : 'border-[var(--app-glass-border)] bg-transparent text-[var(--app-text-faint)] hover:border-[var(--app-text-faint)] hover:text-[var(--app-text-secondary)]'
                      }`}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Loading / error / empty states */}
          {loading && (
            <div className="p-8 text-center text-sm text-[var(--app-text-secondary)]">Loading stats…</div>
          )}
          {!loading && error && (
            <div className="p-4 text-sm text-rose-400">{error}</div>
          )}
          {!loading && !error && data && selectedList.length === 0 && (
            <div className="p-8 text-center text-sm text-[var(--app-text-secondary)]">
              Select players above to view their aggregated stats.
            </div>
          )}

          {/* Stats table */}
          {!loading && !error && selectedList.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-[var(--app-glass-border)]">
                    {COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-wider ${
                          col.sticky
                            ? 'sticky left-0 z-10 bg-[var(--app-surface)] text-left text-[var(--app-text-faint)]'
                            : `text-center ${col.dim ? 'text-[var(--app-text-faint)]/50' : 'text-[var(--app-text-faint)]'}`
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewMode === 'individual' ? (
                    selectedList.map((p) => (
                      <StatsRow
                        key={p.name}
                        name={p.name}
                        stats={p.overall}
                        isPrimary={p.name === primaryPlayer}
                      />
                    ))
                  ) : (
                    <>
                      {teammates.length > 0 && (
                        <>
                          <SectionHeader label="My Team" color="blue" />
                          {teammates.map((p) => (
                            <StatsRow
                              key={p.name}
                              name={p.name}
                              stats={p.asTeammate.gamesPlayed > 0 ? p.asTeammate : p.overall}
                              isPrimary={p.name === primaryPlayer}
                            />
                          ))}
                        </>
                      )}
                      {opponents.length > 0 && (
                        <>
                          <SectionHeader label="Opponents" color="orange" />
                          {opponents.map((p) => (
                            <StatsRow
                              key={p.name}
                              name={p.name}
                              stats={p.asOpponent.gamesPlayed > 0 ? p.asOpponent : p.overall}
                              isPrimary={false}
                            />
                          ))}
                        </>
                      )}
                      {teammates.length === 0 && opponents.length === 0 && (
                        <tr>
                          <td colSpan={COLUMNS.length} className="p-8 text-center text-sm text-[var(--app-text-secondary)]">
                            No team data available — replays may lack recorder info.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
