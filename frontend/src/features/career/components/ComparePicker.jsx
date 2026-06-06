import { Activity, ChevronDown, GitCompareArrows, Users } from 'lucide-react'
import { BLUE, PURPLE } from '@/lib/colors'
import { fmt } from '@/lib/formatters'

function PlayerSelector({ label, players, value, otherValue, onChange, color }) {
  return (
    <label className="min-w-0">
      <span className="mb-2 block text-xs font-bold text-white/35">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!players.length}
          className="w-full appearance-none rounded-xl border border-white/[0.1] bg-[#0a0e19] px-3 py-3 pr-9 text-sm font-bold text-white outline-none transition disabled:cursor-not-allowed disabled:text-white/25"
          style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 42px ${color}12` }}
        >
          {players.length === 0 && <option value="">No players found</option>}
          {players.map((p) => (
            <option key={p.playerName} value={p.playerName} disabled={p.playerName === otherValue} className="bg-[#0a0e19] text-white">
              {p.playerName}
            </option>
          ))}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
      </span>
    </label>
  )
}

export function ComparePicker({ players, playerA, playerB, onPlayerA, onPlayerB, totalShared }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full blur-3xl" style={{ background: 'rgba(96,165,250,0.16)' }} />
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl" style={{ background: 'rgba(168,85,247,0.16)' }} />
      <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
        <PlayerSelector label="Player A" players={players} value={playerA} otherValue={playerB} onChange={onPlayerA} color={BLUE} />
        <div className="flex items-center justify-center pb-1">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.045] text-white/42">
            <GitCompareArrows size={18} />
          </div>
        </div>
        <PlayerSelector label="Player B" players={players} value={playerB} otherValue={playerA} onChange={onPlayerB} color={PURPLE} />
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2 text-xs text-white/38">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1">
          <Users size={12} /> {fmt(players.length)} selectable players
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1">
          <Activity size={12} /> {fmt(totalShared)} shared replay samples
        </span>
      </div>
    </div>
  )
}
