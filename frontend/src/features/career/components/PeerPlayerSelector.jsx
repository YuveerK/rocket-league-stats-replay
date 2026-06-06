import { Activity, ChevronDown, Shield } from 'lucide-react'
import { fmt } from '@/lib/formatters'

export function PeerPlayerSelector({ players, selected, selectedPlayer, onSelect, totalMatches }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] p-5">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl" style={{ background: 'rgba(52,211,153,0.18)' }} />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="section-label">Selected player</div>
          <h2 className="mt-2 truncate text-3xl font-black text-white">{selected || 'No player'}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/38">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1">
              <Shield size={12} /> {selectedPlayer?.platform ?? 'Platform unknown'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-1">
              <Activity size={12} /> {fmt(totalMatches)} shared match samples
            </span>
          </div>
        </div>

        <label className="w-full shrink-0 md:w-64">
          <span className="mb-2 block text-xs font-bold text-white/35">Player</span>
          <span className="relative block">
            <select
              value={selected}
              onChange={(e) => onSelect(e.target.value)}
              disabled={!players.length}
              className="w-full appearance-none rounded-xl border border-white/[0.1] bg-[#0a0e19] px-3 py-2.5 pr-9 text-sm font-bold text-white outline-none transition focus:border-emerald-300/50 disabled:cursor-not-allowed disabled:text-white/25"
            >
              {players.length === 0 && <option value="">No players found</option>}
              {players.map((p) => (
                <option key={p.playerName} value={p.playerName} className="bg-[#0a0e19] text-white">
                  {p.playerName}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
          </span>
        </label>
      </div>
    </div>
  )
}
