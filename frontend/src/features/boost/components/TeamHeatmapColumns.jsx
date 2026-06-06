import { BLUE, ORANGE } from '@/lib/colors'
import { PlayerHeatmapCard } from './PlayerHeatmapCard'

function TeamLabel({ color, label, count }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      <span className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: color === BLUE ? '#93c5fd' : '#fdba74' }}>{label} Team</span>
      <span className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
        style={{ background: `${color}1a`, color: `${color}99` }}>
        {count} {count === 1 ? 'player' : 'players'}
      </span>
    </div>
  )
}

export function TeamHeatmapColumns({ players, pads, filter }) {
  const blue   = players.filter(p => p.team === 0)
  const orange = players.filter(p => p.team === 1)

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-6">
        <TeamLabel color={BLUE}   label="Blue"   count={blue.length} />
        <TeamLabel color={ORANGE} label="Orange" count={orange.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {blue.map(p => <PlayerHeatmapCard key={p.key} player={p} allPads={pads} filter={filter} />)}
        </div>
        <div className="space-y-6">
          {orange.map(p => <PlayerHeatmapCard key={p.key} player={p} allPads={pads} filter={filter} />)}
        </div>
      </div>
    </>
  )
}
