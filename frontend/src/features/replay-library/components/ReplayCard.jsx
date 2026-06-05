import { AlertCircle, Calendar, Clock, Map as MapIcon, Play, Target, Trophy, Upload, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { fmtDuration } from '@/lib/formatters'
import { fileSize, formatDate, formatTime, replayTitle, resultForPrimaryPlayer, scorerSummary, teamPlayers } from '@/lib/replayUtils'
import { PlayerPill } from './PlayerPill'

export function ReplayCard({ replay, selected, onSelect, onAnalyze }) {
  const result = resultForPrimaryPlayer(replay)
  const bluePlayers = teamPlayers(replay, 0)
  const orangePlayers = teamPlayers(replay, 1)
  const scorers = scorerSummary(replay)

  return (
    <button
      type="button"
      onClick={() => onSelect(replay)}
      className={`glass-card group w-full p-4 text-left ${selected ? 'glass-card--selected' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {replay.current  && <Badge tone="green">Current</Badge>}
            {replay.analyzed && <Badge tone="blue">Indexed</Badge>}
            {replay.overtime && <Badge tone="yellow">OT</Badge>}
            {replay.forfeit  && <Badge tone="red">Forfeit</Badge>}
            {result && <Badge tone={result === 'WIN' ? 'green' : 'red'}>{result}</Badge>}
          </div>
          <h3 className="mt-3 truncate text-lg font-black tracking-tight text-[var(--app-text)]">
            {replayTitle(replay)}
          </h3>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--app-text-faint)]">
            <span className="inline-flex items-center gap-1.5"><Calendar size={12} /> {formatDate(replay)}</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={12} /> {formatTime(replay)}</span>
            <span className="inline-flex items-center gap-1.5"><MapIcon size={12} /> {replay.mapDisplayName ?? replay.mapName ?? 'Unknown map'}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="flex items-center gap-2 text-3xl font-black stat-num leading-none">
            <span className="text-blue-400">{replay.team0Score ?? '-'}</span>
            <span className="text-[var(--app-text-faint)]">-</span>
            <span className="text-orange-400">{replay.team1Score ?? '-'}</span>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--app-text-faint)]">
            {fmtDuration(replay.totalSecondsPlayed)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="team-zone team-zone--blue">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-400/90">Blue</span>
            <span className="text-xs text-[var(--app-text-faint)]">{bluePlayers.length} players</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bluePlayers.map((p) => <PlayerPill key={p.name} player={p} />)}
            {bluePlayers.length === 0 && <span className="text-xs text-[var(--app-text-faint)]">No team data</span>}
          </div>
        </div>

        <div className="team-zone team-zone--orange">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-400/90">Orange</span>
            <span className="text-xs text-[var(--app-text-faint)]">{orangePlayers.length} players</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {orangePlayers.map((p) => <PlayerPill key={p.name} player={p} />)}
            {orangePlayers.length === 0 && <span className="text-xs text-[var(--app-text-faint)]">No team data</span>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-[var(--app-text-secondary)]">
          <span className="glass-chip"><Target size={12} /> {replay.goalCount ?? 0} goals</span>
          <span className="glass-chip"><Users size={12} /> {replay.players?.length ?? 0} players</span>
          <span className="glass-chip"><Upload size={12} /> {fileSize(replay.size)}</span>
          {scorers.map(([name, goals]) => (
            <span key={name} className="glass-chip">
              <Trophy size={12} className="text-yellow-500" /> {name} {goals}
            </span>
          ))}
        </div>

        <span
          onClick={(e) => { e.stopPropagation(); onAnalyze(replay) }}
          className="btn-primary"
        >
          <Play size={14} />
          {replay.analyzed ? 'Open' : 'Analyze'}
        </span>
      </div>

      {replay.parseError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <AlertCircle size={13} />
          {replay.parseError}
        </div>
      )}
    </button>
  )
}
