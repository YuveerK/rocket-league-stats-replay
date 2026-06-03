import { fmtTime } from '../lib/sampleHelpers'

export function WatchHeader({ data, duration }) {
  return (
    <header className="relative z-20 flex shrink-0 items-center justify-between gap-6 px-5 py-2.5"
      style={{ background: 'rgba(2,4,12,0.97)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest"
          style={{ color: '#60a5fa', borderColor: 'rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.07)' }}>
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: '#60a5fa' }} />
          3D Replay
        </span>
        <h1 className="truncate text-sm font-bold text-white/40">{data.match?.mapName ?? 'Rocket League'}</h1>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#60a5fa' }}>Blue</span>
        <div className="flex items-center gap-2.5 rounded-xl px-5 py-1.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="text-2xl font-black tabular-nums leading-none text-white">{data.match?.scoreTeam0 ?? 0}</span>
          <span className="text-xl font-thin" style={{ color: 'rgba(255,255,255,0.14)' }}>–</span>
          <span className="text-2xl font-black tabular-nums leading-none text-white">{data.match?.scoreTeam1 ?? 0}</span>
        </div>
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#fb923c' }}>Orange</span>
      </div>

      <div className="flex items-center gap-3 text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
        <span><strong className="font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{fmtTime(data.match?.totalSecondsPlayed)}</strong> match</span>
        <span><strong className="font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{fmtTime(duration)}</strong> replay</span>
        <span><strong className="font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{data.players?.length ?? 0}</strong> players</span>
      </div>
    </header>
  )
}
