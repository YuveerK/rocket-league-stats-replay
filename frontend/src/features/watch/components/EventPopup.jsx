import { useEffect, useRef, useState } from 'react'

const EVENT_CONFIG = {
  goal:   { label: 'GOAL',   symbol: 'G', color: '#facc15', glow: 'rgba(250,204,21,0.6)',   bg: 'rgba(250,204,21,0.08)',  border: 'rgba(250,204,21,0.4)' },
  save:   { label: 'SAVE',   symbol: 'S', color: '#34d399', glow: 'rgba(52,211,153,0.6)',   bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.4)' },
  shot:   { label: 'SHOT',   symbol: 'T', color: '#60a5fa', glow: 'rgba(96,165,250,0.6)',   bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.4)' },
  assist: { label: 'ASSIST', symbol: 'A', color: '#c084fc', glow: 'rgba(192,132,252,0.6)',  bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.4)' },
  kill:   { label: 'DEMO',   symbol: 'D', color: '#f87171', glow: 'rgba(248,113,113,0.6)',  bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.4)' },
  death:  { label: 'DEMOED', symbol: 'X', color: '#94a3b8', glow: 'rgba(148,163,184,0.5)',  bg: 'rgba(148,163,184,0.07)', border: 'rgba(148,163,184,0.3)' },
}

const DURATION_MS = 2800
const LEAVE_MS = 500

export function EventPopup({ event }) {
  const [leavingKey, setLeavingKey] = useState(null)
  const [hiddenKey, setHiddenKey] = useState(null)
  const timerRef = useRef(null)
  const leaveRef = useRef(null)

  useEffect(() => {
    if (!event) return undefined

    clearTimeout(timerRef.current)
    clearTimeout(leaveRef.current)

    const key = event._key ?? event
    timerRef.current = setTimeout(() => {
      setLeavingKey(key)
      leaveRef.current = setTimeout(() => setHiddenKey(key), LEAVE_MS)
    }, DURATION_MS)

    return () => {
      clearTimeout(timerRef.current)
      clearTimeout(leaveRef.current)
    }
  }, [event])

  const key = event?._key ?? event
  if (!event || hiddenKey === key) return null

  const leaving = leavingKey === key
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.shot
  const isGoal = event.type === 'goal'

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      style={{ animation: leaving ? 'ep-leave 0.5s ease forwards' : 'ep-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
    >
      {isGoal && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, ${cfg.glow} 0%, transparent 70%)`,
            opacity: leaving ? 0 : 0.22,
            transition: 'opacity 0.5s',
          }}
        />
      )}

      <div
        className="relative flex flex-col items-center gap-3 rounded-3xl px-14 py-8 text-center"
        style={{
          background: `linear-gradient(135deg, ${cfg.bg} 0%, rgba(2,4,12,0.82) 100%)`,
          border: `1.5px solid ${cfg.border}`,
          boxShadow: `0 0 0 1px ${cfg.border}, 0 32px 80px rgba(0,0,0,0.7), 0 0 80px ${cfg.glow}`,
          backdropFilter: 'blur(28px)',
          minWidth: 320,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-3xl"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }}
        />

        <span
          className="grid h-16 w-16 place-items-center rounded-2xl border font-black"
          style={{
            borderColor: cfg.border,
            color: cfg.color,
            background: cfg.bg,
            boxShadow: `0 0 32px ${cfg.glow}`,
            fontSize: 34,
            lineHeight: 1,
          }}
        >
          {cfg.symbol}
        </span>

        <div
          className="font-black uppercase"
          style={{
            fontSize: isGoal ? 72 : 56,
            lineHeight: 1,
            color: cfg.color,
            textShadow: `0 0 40px ${cfg.glow}, 0 0 80px ${cfg.glow}`,
            letterSpacing: '0.18em',
          }}
        >
          {cfg.label}
        </div>

        {event.playerName && (
          <div
            className="font-black uppercase"
            style={{
              color: 'rgba(255,255,255,0.88)',
              fontSize: 22,
              letterSpacing: '0.08em',
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            }}
          >
            {event.playerName}
          </div>
        )}

        {isGoal && event.scoreAfter && (
          <div className="mt-1 flex items-center gap-4">
            <span className="text-4xl font-black tabular-nums" style={{ color: '#60a5fa', textShadow: '0 0 24px rgba(96,165,250,0.5)' }}>
              {event.scoreAfter.team0}
            </span>
            <span className="text-2xl font-thin" style={{ color: 'rgba(255,255,255,0.3)' }}>-</span>
            <span className="text-4xl font-black tabular-nums" style={{ color: '#fb923c', textShadow: '0 0 24px rgba(251,146,60,0.5)' }}>
              {event.scoreAfter.team1}
            </span>
          </div>
        )}

        {event.type === 'kill' && event.victimPlayerName && (
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
            demolished {event.victimPlayerName}
          </div>
        )}

        <div
          className="absolute inset-x-0 bottom-0 h-px rounded-b-3xl"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.border}, transparent)` }}
        />
      </div>

      <style>{`
        @keyframes ep-enter {
          from { opacity: 0; transform: scale(0.55) translateY(18px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes ep-leave {
          from { opacity: 1; transform: scale(1)    translateY(0);   }
          to   { opacity: 0; transform: scale(0.82) translateY(-16px); }
        }
      `}</style>
    </div>
  )
}
