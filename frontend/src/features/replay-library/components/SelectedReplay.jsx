import { CheckCircle, Play } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { fmtDuration } from '@/lib/formatters'
import { formatDate, formatTime, replayTitle, resultForPrimaryPlayer, teamPlayers } from '@/lib/replayUtils'
import { PlayerPill } from './PlayerPill'

export function SelectedReplay({ replay, onAnalyze }) {
  if (!replay) {
    return (
      <div className="glass-panel p-8 text-center text-[var(--app-text-secondary)]">
        Select a replay to inspect its match card.
      </div>
    )
  }

  const bluePlayers = teamPlayers(replay, 0)
  const orangePlayers = teamPlayers(replay, 1)
  const result = resultForPrimaryPlayer(replay)

  return (
    <div className="feature-panel sticky top-6 overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-label">Selected Replay</p>
          <h2 className="mt-2 truncate text-2xl font-black tracking-tight text-[var(--app-text)]">
            {replayTitle(replay)}
          </h2>
          <p className="mt-2 text-sm text-[var(--app-text-secondary)]">
            {formatDate(replay)} {formatTime(replay)} — {replay.mapDisplayName ?? replay.mapName ?? 'Unknown map'}
          </p>
        </div>
        {replay.current && (
          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/12 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-400">
            Live
          </span>
        )}
      </div>

      <div className="my-6 flex items-center justify-center gap-5">
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-400/80">Blue</p>
          <p
            className="text-7xl font-black leading-none text-blue-400 stat-num"
            style={{ textShadow: '0 0 40px rgba(96,165,250,0.35)' }}
          >
            {replay.team0Score ?? '-'}
          </p>
        </div>
        <div className="text-3xl font-thin text-[var(--app-text-faint)]">-</div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-400/80">Orange</p>
          <p
            className="text-7xl font-black leading-none text-orange-400 stat-num"
            style={{ textShadow: '0 0 40px rgba(251,146,60,0.35)' }}
          >
            {replay.team1Score ?? '-'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-[var(--app-glass-border)] bg-[var(--app-surface-muted)] p-3">
          <p className="section-label">Duration</p>
          <p className="mt-2 text-xl font-black text-[var(--app-text)] stat-num">{fmtDuration(replay.totalSecondsPlayed)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--app-glass-border)] bg-[var(--app-surface-muted)] p-3">
          <p className="section-label">Result</p>
          <p className="mt-2 text-xl font-black text-[var(--app-text)]">{result ?? 'Unknown'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {replay.overtime && <Badge tone="yellow">Overtime</Badge>}
        {replay.forfeit  && <Badge tone="red">Forfeit</Badge>}
        {replay.analyzed && <Badge tone="blue"><CheckCircle size={12} /> Indexed</Badge>}
        <Badge>{replay.matchType ?? 'Replay'}</Badge>
        <Badge>{replay.teamSize ? `${replay.teamSize}v${replay.teamSize}` : `${replay.players?.length ?? 0} players`}</Badge>
      </div>

      <div className="mt-5 grid gap-3">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-400/70">Blue roster</p>
          <div className="flex flex-wrap gap-1.5">
            {bluePlayers.map((p) => <PlayerPill key={p.name} player={p} />)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-orange-400/70">Orange roster</p>
          <div className="flex flex-wrap gap-1.5">
            {orangePlayers.map((p) => <PlayerPill key={p.name} player={p} />)}
          </div>
        </div>
      </div>

      <button type="button" onClick={() => onAnalyze(replay)} className="btn-primary btn-primary-lg mt-6">
        <Play size={16} />
        {replay.analyzed ? 'Open this replay' : 'Analyze this replay'}
      </button>
    </div>
  )
}
