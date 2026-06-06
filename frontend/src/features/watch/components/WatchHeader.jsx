import { fmtTime } from '../lib/sampleHelpers'

export function WatchHeader({ data, duration }) {
  return (
    <header
      className="relative z-20 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2.5 sm:px-5"
      style={{ background: 'rgba(2,4,12,0.97)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Left: badge + map name */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest"
          style={{ color: '#60a5fa', borderColor: 'rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.07)' }}
        >
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: '#60a5fa' }} />
          <span className="hidden sm:inline">3D Replay</span>
          <span className="sm:hidden">3D</span>
        </span>
        <h1 className="hidden truncate text-sm font-bold text-white/40 sm:block">
          {data.match?.mapName ?? 'Rocket League'}
        </h1>
      </div>

      {/* Center: score — always centered via grid column */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <span className="hidden text-xs font-black uppercase tracking-widest sm:block" style={{ color: '#60a5fa' }}>Blue</span>
        <div
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 sm:gap-2.5 sm:px-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-xl font-black tabular-nums leading-none text-white sm:text-2xl">{data.match?.scoreTeam0 ?? 0}</span>
          <span className="text-lg font-thin sm:text-xl" style={{ color: 'rgba(255,255,255,0.14)' }}>–</span>
          <span className="text-xl font-black tabular-nums leading-none text-white sm:text-2xl">{data.match?.scoreTeam1 ?? 0}</span>
        </div>
        <span className="hidden text-xs font-black uppercase tracking-widest sm:block" style={{ color: '#fb923c' }}>Orange</span>
      </div>

      {/* Right: match stats — hidden on mobile */}
      <div className="hidden items-center justify-end gap-3 text-[11px] sm:flex" style={{ color: 'rgba(255,255,255,0.25)' }}>
        <span><strong className="font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{fmtTime(data.match?.totalSecondsPlayed)}</strong> match</span>
        <span><strong className="font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{fmtTime(duration)}</strong> replay</span>
        <span><strong className="font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{data.players?.length ?? 0}</strong> players</span>
      </div>
    </header>
  )
}
