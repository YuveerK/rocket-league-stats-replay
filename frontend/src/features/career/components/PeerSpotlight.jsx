import { fmt, fmtPct } from '@/lib/formatters'

export function PeerSpotlight({ title, peer, icon: Icon, color, fallback }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="section-label">{title}</div>
          <div className="mt-2 truncate text-lg font-black text-white">
            {peer ? peer.playerName : fallback}
          </div>
        </div>
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
          style={{ color, background: `${color}12`, borderColor: `${color}30` }}
        >
          <Icon size={18} />
        </div>
      </div>
      {peer && (
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="stat-num text-xl font-black text-white">{fmt(peer.matches)}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/25">Matches</div>
          </div>
          <div>
            <div className="stat-num text-xl font-black" style={{ color }}>{fmtPct(peer.winRate)}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/25">Win Rate</div>
          </div>
          <div>
            <div className="stat-num text-xl font-black text-white/75">{fmt(peer.avgScore, 1)}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/25">Avg Pts</div>
          </div>
        </div>
      )}
    </div>
  )
}
