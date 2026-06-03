import { Crown, Crosshair, Shield, Sparkles, Target } from 'lucide-react'

const PLATFORM_ABBR = {
  Epic: 'PC',
  Steam: 'PC',
  PlayStation: 'PS',
  PS4: 'PS4',
  PS5: 'PS5',
  XboxOne: 'XB',
  Xbox: 'XB',
  Switch: 'SW',
  Dingo: 'XB',
}

const TEAMS = {
  0: {
    name: 'Blue',
    text: 'text-blue-300',
    strong: '#7ba7ff',
    soft: 'rgba(96,165,250,0.13)',
    glow: 'rgba(96,165,250,0.35)',
    border: 'border-blue-400/20',
    dot: 'bg-blue-400',
    badge: 'bg-blue-500/15 text-blue-200 border-blue-300/20',
  },
  1: {
    name: 'Orange',
    text: 'text-orange-300',
    strong: '#ff9d3d',
    soft: 'rgba(251,146,60,0.13)',
    glow: 'rgba(251,146,60,0.35)',
    border: 'border-orange-400/20',
    dot: 'bg-orange-400',
    badge: 'bg-orange-500/15 text-orange-200 border-orange-300/20',
  },
}

function n(value) {
  return Number(value ?? 0)
}

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n(value))
}

function PlatformChip({ platform }) {
  if (!platform) return null
  const label = PLATFORM_ABBR[platform] ?? String(platform).slice(0, 3)
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white/40">
      {label}
    </span>
  )
}

function teamTotals(players) {
  return players.reduce(
    (acc, player) => ({
      score: acc.score + n(player.score),
      goals: acc.goals + n(player.goals),
      assists: acc.assists + n(player.assists),
      saves: acc.saves + n(player.saves),
      shots: acc.shots + n(player.shots),
    }),
    { score: 0, goals: 0, assists: 0, saves: 0, shots: 0 },
  )
}

function MetricTile({ icon: Icon, label, value, tone = 'text-white' }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
        {Icon && <Icon size={12} className={tone} />}
        {label}
      </div>
      <div className={`mt-1 text-lg font-black tabular-nums ${tone}`}>{value}</div>
    </div>
  )
}

function PlayerRow({ player, rank, maxScore, isMvp, team }) {
  const cfg = TEAMS[team]
  const scorePct = maxScore > 0 ? Math.max(7, Math.min(100, (n(player.score) / maxScore) * 100)) : 0

  return (
    <div
      className={`grid min-w-[560px] grid-cols-[34px_minmax(0,1fr)_72px_36px_36px_36px_36px] items-center gap-3 border-t border-white/[0.055] px-4 py-3 transition hover:bg-white/[0.035] ${isMvp ? 'bg-white/[0.035]' : ''}`}
    >
      <span className={`text-sm font-black tabular-nums ${isMvp ? cfg.text : 'text-white/25'}`}>
        {rank}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold text-white/90">{player.playerName}</span>
          {isMvp && (
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${cfg.badge}`}>
              <Crown size={10} />
              MVP
            </span>
          )}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <PlatformChip platform={player.platform} />
          {player.car && player.car !== 'Unknown' && (
            <span className="truncate text-[11px] font-medium text-white/30">{player.car}</span>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="text-sm font-black tabular-nums text-white/80">{formatNumber(player.score)}</div>
        <div className="ml-auto mt-1 h-1 w-14 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${scorePct}%`,
              background: `linear-gradient(90deg, ${cfg.strong}, rgba(255,255,255,0.75))`,
              boxShadow: `0 0 12px ${cfg.glow}`,
            }}
          />
        </div>
      </div>

      <StatCell value={player.goals} strong={n(player.goals) > 0} />
      <StatCell value={player.assists} strong={n(player.assists) > 0} />
      <StatCell value={player.saves} strong={n(player.saves) > 0} />
      <StatCell value={player.shots} strong={n(player.shots) > 0} muted />
    </div>
  )
}

function StatCell({ value, strong, muted }) {
  const tone = strong ? 'text-white/90 font-black' : muted ? 'text-white/35' : 'text-white/30'
  return <span className={`text-right text-sm tabular-nums ${tone}`}>{n(value)}</span>
}

function TeamPanel({ players, team, opponentGoals }) {
  const cfg = TEAMS[team]
  const sorted = [...players].sort((a, b) => n(b.score) - n(a.score))
  const totals = teamTotals(sorted)
  const maxScore = Math.max(...sorted.map(p => n(p.score)), 1)
  const topPlayer = sorted[0]
  const won = totals.goals > opponentGoals

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${cfg.border}`}
      style={{
        background: `linear-gradient(145deg, ${cfg.soft}, rgba(10,13,24,0.94) 34%, rgba(8,10,18,0.96) 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 60px rgba(0,0,0,0.24)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full blur-3xl"
        style={{ background: cfg.glow, opacity: 0.28 }}
      />

      <div className="relative flex items-start justify-between gap-4 px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} style={{ boxShadow: `0 0 16px ${cfg.glow}` }} />
            <span className={`text-xs font-black uppercase tracking-[0.22em] ${cfg.text}`}>{cfg.name}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
              {won ? 'Won' : totals.goals === opponentGoals ? 'Tied' : 'Lost'}
            </span>
          </div>
          {topPlayer && (
            <div className="mt-3 flex min-w-0 items-center gap-2 text-sm">
              <span className="text-white/35">Top impact</span>
              <span className="truncate font-bold text-white/80">{topPlayer.playerName}</span>
              <span className="font-black tabular-nums text-white/50">{formatNumber(topPlayer.score)}</span>
            </div>
          )}
        </div>

        <div className="text-right">
          <div className={`text-5xl font-black leading-none tabular-nums ${cfg.text}`}>{totals.goals}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Goals</div>
        </div>
      </div>

      <div className="relative grid grid-cols-3 gap-2 px-4 pb-4">
        <MetricTile icon={Target} label="Score" value={formatNumber(totals.score)} tone="text-white/80" />
        <MetricTile icon={Crosshair} label="Shots" value={totals.shots} tone={cfg.text} />
        <MetricTile icon={Shield} label="Saves" value={totals.saves} tone="text-emerald-300" />
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[34px_minmax(0,1fr)_72px_36px_36px_36px_36px] gap-3 border-t border-white/[0.07] bg-black/[0.18] px-4 py-2">
          {['#', 'Player', 'Score', 'G', 'A', 'Sv', 'Sh'].map((label, index) => (
            <span
              key={label}
              className={`text-[10px] font-black uppercase tracking-[0.14em] text-white/30 ${index > 1 ? 'text-right' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
        {sorted.map((player, index) => (
          <PlayerRow
            key={`${team}-${player.playerName}`}
            player={player}
            rank={index + 1}
            maxScore={maxScore}
            isMvp={index === 0}
            team={team}
          />
        ))}
      </div>
    </div>
  )
}

export default function Scoreboard({ players = [] }) {
  const team0 = players.filter(player => player.team === 0)
  const team1 = players.filter(player => player.team === 1)
  const blueTotals = teamTotals(team0)
  const orangeTotals = teamTotals(team1)
  const allPlayers = [...players].sort((a, b) => n(b.score) - n(a.score))
  const matchMvp = allPlayers[0]
  const totalShots = blueTotals.shots + orangeTotals.shots

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="section-label">Scoreboard</span>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white">Player Impact Board</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {matchMvp && (
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/15 bg-yellow-400/[0.08] px-3 py-1.5 text-xs font-bold text-yellow-100/80">
              <Crown size={13} className="text-yellow-300" />
              MVP: <span className="text-white">{matchMvp.playerName}</span>
            </div>
          )}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/60">
            <Sparkles size={13} className="text-white/40" />
            {totalShots} total shots
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TeamPanel players={team0} team={0} opponentGoals={orangeTotals.goals} />
        <TeamPanel players={team1} team={1} opponentGoals={blueTotals.goals} />
      </div>
    </section>
  )
}
