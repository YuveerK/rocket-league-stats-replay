import { BLUE, ORANGE } from '../constants'
import { PlayerCard } from './PlayerCard'

function teamColor(team)  { return team === 1 ? ORANGE : BLUE }
function teamLabel(team)  { return team === 1 ? 'Orange' : 'Blue' }
function teamAccent(team) { return team === 1 ? 'rgba(251,146,60,0.55)' : 'rgba(96,165,250,0.55)' }
function teamBorder(team) { return team === 1 ? 'rgba(251,146,60,0.12)' : 'rgba(96,165,250,0.12)' }

export function PlayerPanel({ team, players, speeds, boosts, boosting }) {
  const color = teamColor(team)
  return (
    <div className="rounded-2xl p-3 backdrop-blur-2xl"
      style={{ background: 'rgba(5,8,22,0.85)', border: `1px solid ${teamBorder(team)}`, boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>

      <div className="mb-2.5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: teamAccent(team) }}>
          {teamLabel(team)} Team
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {players.map(player => (
          <PlayerCard
            key={player.playerName}
            player={player}
            speed={speeds[player.playerName] ?? 0}
            boost={boosts[player.playerName]}
            isBoosting={boosting[player.playerName] ?? false}
          />
        ))}
      </div>
    </div>
  )
}
