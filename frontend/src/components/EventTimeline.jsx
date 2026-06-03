import { useCallback, useMemo, useRef, useState } from 'react'
import { Activity, Clock, Flame, RadioTower } from 'lucide-react'

const VW = 1120
const VH = 250
const PL = 96
const PR = 30
const PT = 26
const PB = 44
const IW = VW - PL - PR
const IH = VH - PT - PB
const BLUE_CY = PT + IH * 0.27
const MID_Y = PT + IH * 0.5
const ORANGE_CY = PT + IH * 0.73
const AXIS_Y = VH - 18

const EV = {
  goal: { fill: '#f59e0b', stroke: '#fde68a', r: 12, label: 'Goal' },
  save: { fill: '#10b981', stroke: '#6ee7b7', r: 7, label: 'Save' },
  shot: { fill: '#3b82f6', stroke: '#93c5fd', r: 6, label: 'Shot' },
  assist: { fill: '#8b5cf6', stroke: '#c4b5fd', r: 6, label: 'Assist' },
  kill: { fill: '#ef4444', stroke: '#fca5a5', r: 7, label: 'Demo' },
  death: { fill: '#111827', stroke: '#64748b', r: 5, label: 'Death' },
}

const LEGEND = ['goal', 'save', 'shot', 'assist', 'kill', 'death']

function fmt(seconds) {
  if (seconds == null) return '?'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function toX(time, duration) {
  return PL + Math.max(0, Math.min(1, (time ?? 0) / Math.max(duration, 1))) * IW
}

function eventLaneY(event) {
  return event.team === 0 ? BLUE_CY : ORANGE_CY
}

function eventTime(event) {
  return event.gameClockElapsedSeconds ?? event.timelineElapsedSeconds ?? event.elapsedSeconds
}

function spreadEvents(events, duration) {
  const positioned = events
    .filter(event => EV[event.type] && eventTime(event) != null)
    .map(event => ({ ...event, x: toX(eventTime(event), duration), dy: 0 }))

  positioned.forEach((event, index) => {
    const close = positioned.filter(
      other => other.team === event.team && Math.abs(other.x - event.x) < 22,
    )
    if (close.length <= 1) return
    const ownIndex = close.findIndex(other => other === positioned[index])
    const spread = Math.min(38, close.length * 12)
    event.dy = (ownIndex / Math.max(close.length - 1, 1) - 0.5) * spread
  })

  return positioned
}

function StatPill({ icon: Icon, label, value, tone = 'text-white/80' }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/30">
        <Icon size={12} className={tone} />
        {label}
      </div>
      <div className={`mt-1 text-lg font-black tabular-nums ${tone}`}>{value}</div>
    </div>
  )
}

function Tooltip({ tooltip }) {
  if (!tooltip) return null
  const cfg = EV[tooltip.evt.type]
  return (
    <div
      className="pointer-events-none absolute z-20 anim-scale-in"
      style={{
        left: Math.min(tooltip.cx + 14, 980),
        top: Math.max(tooltip.cy - 68, 10),
        transformOrigin: 'top left',
      }}
    >
      <div
        className="overflow-hidden rounded-xl border border-white/10 text-sm shadow-2xl"
        style={{ background: 'rgba(8,10,18,0.97)', backdropFilter: 'blur(14px)', minWidth: 190 }}
      >
        <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: cfg?.fill, boxShadow: `0 0 14px ${cfg?.fill}` }}
          />
          <span className="font-black text-white/90">{cfg?.label}</span>
          <span className={`ml-auto text-xs font-black ${tooltip.evt.team === 0 ? 'text-blue-300' : 'text-orange-300'}`}>
            {tooltip.evt.team === 0 ? 'Blue' : 'Orange'}
          </span>
        </div>
        <div className="space-y-1 px-3 py-2">
          <p className="truncate font-bold text-white/85">{tooltip.evt.playerName}</p>
          {tooltip.evt.victimPlayerName && (
            <p className="truncate text-xs text-white/40">Victim: {tooltip.evt.victimPlayerName}</p>
          )}
          <p className="font-mono text-xs text-white/40">
            {fmt(eventTime(tooltip.evt))} elapsed
            {tooltip.evt.gameClockRemaining ? ` | ${tooltip.evt.gameClockRemaining} left` : ''}
          </p>
          {tooltip.evt.scoreAfter && (
            <p className="text-xs font-black text-yellow-300">
              Score {tooltip.evt.scoreAfter.team0} - {tooltip.evt.scoreAfter.team1}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EventTimeline({ events = [], matchDuration = 300 }) {
  const [tooltip, setTooltip] = useState(null)
  const svgRef = useRef()
  const duration = matchDuration || 300

  const visible = useMemo(
    () => events.filter(event => EV[event.type] && eventTime(event) != null),
    [events],
  )
  const goals = visible.filter(event => event.type === 'goal')
  const demos = visible.filter(event => event.type === 'kill')
  const saves = visible.filter(event => event.type === 'save')
  const positioned = useMemo(() => spreadEvents(visible, duration), [visible, duration])

  const ticks = []
  const tickStep = duration <= 600 ? 60 : 120
  for (let time = 0; time <= duration; time += tickStep) ticks.push(time)
  if (ticks[ticks.length - 1] !== duration) {
    const gap = duration - ticks[ticks.length - 1]
    if (gap < tickStep * 0.4) ticks[ticks.length - 1] = duration
    else ticks.push(duration)
  }

  const handleMove = useCallback((event, timelineEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({ cx: event.clientX - rect.left, cy: event.clientY - rect.top, evt: timelineEvent })
  }, [])

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="section-label">Match Timeline</span>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white">Momentum Rail</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {LEGEND.map(type => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: EV[type].fill, boxShadow: `0 0 10px ${EV[type].fill}` }}
              />
              <span className="text-[11px] font-semibold text-white/40">{EV[type].label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="card relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(17,24,39,0.96), rgba(8,10,18,0.96) 48%, rgba(15,23,42,0.9))',
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-24 top-0 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-orange-500/13 blur-3xl" />
        </div>

        <div className="relative grid gap-3 border-b border-white/[0.07] px-4 py-4 md:grid-cols-4">
          <StatPill icon={Clock} label="Duration" value={fmt(duration)} tone="text-white/80" />
          <StatPill icon={Flame} label="Goals" value={goals.length} tone="text-yellow-300" />
          <StatPill icon={RadioTower} label="Saves" value={saves.length} tone="text-emerald-300" />
          <StatPill icon={Activity} label="Demos" value={demos.length} tone="text-red-300" />
        </div>

        <div className="relative px-3 pb-4 pt-3">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VW} ${VH}`}
            className="block w-full"
            style={{ minHeight: 190 }}
            onMouseLeave={() => setTooltip(null)}
          >
            <defs>
              <linearGradient id="timeline-field" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#172554" stopOpacity="0.44" />
                <stop offset="45%" stopColor="#111827" stopOpacity="0.92" />
                <stop offset="55%" stopColor="#111827" stopOpacity="0.92" />
                <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.36" />
              </linearGradient>
              <linearGradient id="blue-lane" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.04" />
              </linearGradient>
              <linearGradient id="orange-lane" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ea580c" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#ea580c" stopOpacity="0.24" />
              </linearGradient>
              {Object.entries(EV).map(([type, cfg]) => (
                <radialGradient key={type} id={`event-${type}`} cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor={cfg.stroke} stopOpacity="1" />
                  <stop offset="100%" stopColor={cfg.fill} stopOpacity="1" />
                </radialGradient>
              ))}
              <filter id="event-glow" x="-90%" y="-90%" width="280%" height="280%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="goal-burst" x="-110%" y="-110%" width="320%" height="320%">
                <feGaussianBlur stdDeviation="7" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="1 0.7 0 0 0  0.65 0.45 0 0 0  0 0 0 0 0  0 0 0 1.6 0"
                  result="gold"
                />
                <feMerge>
                  <feMergeNode in="gold" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x={PL} y={PT} width={IW} height={IH} rx="16" fill="url(#timeline-field)" stroke="rgba(255,255,255,0.07)" />
            <rect x={PL + 8} y={PT + 8} width={IW - 16} height={IH / 2 - 8} rx="10" fill="url(#blue-lane)" />
            <rect x={PL + 8} y={MID_Y} width={IW - 16} height={IH / 2 - 8} rx="10" fill="url(#orange-lane)" />

            <line x1={PL + 10} y1={MID_Y} x2={PL + IW - 10} y2={MID_Y} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
            <text x={24} y={BLUE_CY + 4} fill="rgba(147,197,253,0.72)" fontSize="12" fontWeight="900" letterSpacing="3">
              BLUE
            </text>
            <text x={18} y={ORANGE_CY + 4} fill="rgba(253,186,116,0.72)" fontSize="12" fontWeight="900" letterSpacing="3">
              ORANGE
            </text>

            {ticks.map(time => (
              <g key={time}>
                <line
                  x1={toX(time, duration)}
                  y1={PT + 10}
                  x2={toX(time, duration)}
                  y2={PT + IH - 10}
                  stroke="rgba(255,255,255,0.055)"
                  strokeWidth="1"
                />
                <text
                  x={toX(time, duration)}
                  y={AXIS_Y}
                  textAnchor="middle"
                  fontSize="11"
                  fontFamily="ui-monospace, monospace"
                  fill="rgba(156,163,175,0.58)"
                >
                  {fmt(time)}
                </text>
              </g>
            ))}

            {goals.map((goal, index) => {
              const x = toX(eventTime(goal), duration)
              const y = eventLaneY(goal)
              const score = goal.scoreAfter ? `${goal.scoreAfter.team0}-${goal.scoreAfter.team1}` : 'Goal'
              return (
                <g key={`goal-line-${index}`}>
                  <line
                    x1={x}
                    y1={PT + 8}
                    x2={x}
                    y2={PT + IH - 8}
                    stroke={goal.team === 0 ? 'rgba(96,165,250,0.42)' : 'rgba(251,146,60,0.42)'}
                    strokeWidth="1.5"
                    strokeDasharray="6 7"
                  />
                  <rect
                    x={x - 18}
                    y={Math.max(6, y - 38)}
                    width="36"
                    height="18"
                    rx="9"
                    fill="rgba(0,0,0,0.56)"
                    stroke="rgba(245,158,11,0.36)"
                  />
                  <text x={x} y={Math.max(19, y - 25)} textAnchor="middle" fontSize="10" fontWeight="900" fill="#fbbf24">
                    {score}
                  </text>
                </g>
              )
            })}

            {positioned.map((event, index) => {
              const cfg = EV[event.type]
              const x = event.x
              const y = eventLaneY(event) + (event.dy ?? 0)
              const isGoal = event.type === 'goal'

              return (
                <g
                  key={event.id ?? `${event.type}-${index}`}
                  className="anim-scale-in"
                  style={{ animationDelay: `${index * 0.015}s`, cursor: 'crosshair' }}
                  onMouseMove={mouseEvent => handleMove(mouseEvent, event)}
                >
                  {isGoal && (
                    <>
                      <circle cx={x} cy={y} r="25" fill="#f59e0b" opacity="0.10" filter="url(#event-glow)" />
                      <circle cx={x} cy={y} r="19" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.38" />
                    </>
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={cfg.r}
                    fill={`url(#event-${event.type})`}
                    stroke={cfg.stroke}
                    strokeWidth={isGoal ? 2 : 1.2}
                    filter={isGoal ? 'url(#goal-burst)' : 'url(#event-glow)'}
                    opacity="0.96"
                  />
                  <circle cx={x - cfg.r * 0.25} cy={y - cfg.r * 0.28} r={cfg.r * 0.28} fill="white" opacity="0.26" />
                </g>
              )
            })}
          </svg>

          <Tooltip tooltip={tooltip} />
        </div>
      </div>
    </section>
  )
}
