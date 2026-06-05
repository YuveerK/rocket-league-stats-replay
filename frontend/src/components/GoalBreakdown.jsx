import { Goal, Target } from 'lucide-react'
import { fmtDuration } from '@/lib/formatters'
import { BLUE, ORANGE, GOLD } from '@/lib/colors'

const TEAM_CLASS = {
  0: { label: 'Blue', color: BLUE, card: 'goal-event-card--blue' },
  1: { label: 'Orange', color: ORANGE, card: 'goal-event-card--orange' },
}

function formatClock(seconds) {
  if (seconds == null) return '—'
  return fmtDuration(seconds)
}

export default function GoalBreakdown({ goals = [] }) {
  if (!goals.length) return null

  return (
    <section className="space-y-4">
      <div>
        <p className="section-label mb-1">Goal Intelligence</p>
        <h2 className="section-heading">Goal Sequence & Last Touch</h2>
        <p className="mt-1 text-sm text-white/60">
          Last touch team from ball possession data before each scored goal.
        </p>
      </div>

      <div className="theme-card-gradient card relative overflow-hidden">
        <div className="theme-card-top-line absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const scoring = TEAM_CLASS[goal.scoringTeam] ?? { label: 'Unknown', color: GOLD, card: '' }
            const touch = TEAM_CLASS[goal.lastTouchTeam] ?? {
              label: goal.lastTouchLabel ?? 'Unknown',
              color: 'rgba(255,255,255,0.35)',
              card: '',
            }

            return (
              <article
                key={goal.id}
                className={`goal-event-card ${scoring.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.05] text-amber-500">
                      <Goal size={16} />
                    </span>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                        Goal {goal.index}
                      </div>
                      <div className="mt-0.5 text-sm font-black text-white/90">{goal.scorerName}</div>
                    </div>
                  </div>
                  <span className="rounded-lg border border-white/[0.09] bg-white/[0.05] px-2 py-1 font-mono text-xs font-bold text-white/60">
                    {formatClock(goal.elapsedSeconds)}
                  </span>
                </div>

                {goal.scoreAfter && (
                  <div className="mt-3 text-center font-mono text-lg font-black tabular-nums text-white/90">
                    {goal.scoreAfter.team0} — {goal.scoreAfter.team1}
                  </div>
                )}

                <div className="goal-event-card__detail mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold uppercase tracking-widest text-white/35">Scoring team</span>
                    <span className="font-black" style={{ color: scoring.color }}>{scoring.label}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1 font-bold uppercase tracking-widest text-white/35">
                      <Target size={11} /> Last touch
                    </span>
                    <span className="font-black" style={{ color: touch.color }}>{touch.label}</span>
                  </div>
                </div>

                {goal.isOwnGoal && (
                  <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-400">
                    Possible own goal — last touch was the other team.
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
