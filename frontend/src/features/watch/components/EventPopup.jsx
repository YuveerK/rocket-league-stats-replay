import { useEffect, useRef, useState } from 'react'

const EVENT_CONFIG = {
  goal:   { label: 'GOAL',    emoji: '⚽', color: '#facc15', glow: 'rgba(250,204,21,0.6)',   bg: 'rgba(250,204,21,0.08)',  border: 'rgba(250,204,21,0.4)'  },
  save:   { label: 'SAVE',    emoji: '🛡️', color: '#34d399', glow: 'rgba(52,211,153,0.6)',  bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.4)'  },
  shot:   { label: 'SHOT',    emoji: '🎯', color: '#60a5fa', glow: 'rgba(96,165,250,0.6)',  bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.4)'  },
  assist: { label: 'ASSIST',  emoji: '✨', color: '#c084fc', glow: 'rgba(192,132,252,0.6)', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.4)' },
  kill:   { label: 'DEMO',    emoji: '💥', color: '#f87171', glow: 'rgba(248,113,113,0.6)', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.4)' },
  death:  { label: 'DEMOED',  emoji: '💀', color: '#94a3b8', glow: 'rgba(148,163,184,0.5)', bg: 'rgba(148,163,184,0.07)', border: 'rgba(148,163,184,0.3)' },
}

const DURATION_MS = 2800

export function EventPopup({ event }) {
  const [visible, setVisible]   = useState(false)
  const [leaving, setLeaving]   = useState(false)
  const [current, setCurrent]   = useState(null)
  const timerRef                = useRef(null)
  const leaveRef                = useRef(null)

  useEffect(() => {
    if (!event) return
    // Clear any pending timers from the previous event
    clearTimeout(timerRef.current)
    clearTimeout(leaveRef.current)

    setCurrent(event)
    setLeaving(false)
    setVisible(true)

    timerRef.current = setTimeout(() => {
      setLeaving(true)
      leaveRef.current = setTimeout(() => setVisible(false), 500)
    }, DURATION_MS)

    return () => {
      clearTimeout(timerRef.current)
      clearTimeout(leaveRef.current)
    }
  }, [event])

  if (!visible || !current) return null

  const cfg = EVENT_CONFIG[current.type] ?? EVENT_CONFIG.shot
  const isGoal = current.type === 'goal'

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      style={{ animation: leaving ? 'ep-leave 0.5s ease forwards' : 'ep-enter 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
    >
      {/* full-screen colour flash for goals */}
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
        {/* accent top bar */}
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-3xl"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }}
        />

        {/* emoji */}
        <span style={{ fontSize: 52, lineHeight: 1, filter: `drop-shadow(0 0 18px ${cfg.glow})` }}>
          {cfg.emoji}
        </span>

        {/* event label */}
        <div
          className="font-black tracking-[0.22em] uppercase"
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

        {/* player name */}
        {current.playerName && (
          <div
            className="font-black tracking-widest uppercase"
            style={{ fontSize: 22, color: 'rgba(255,255,255,0.88)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
          >
            {current.playerName}
          </div>
        )}

        {/* score after for goals */}
        {isGoal && current.scoreAfter && (
          <div className="mt-1 flex items-center gap-4">
            <span className="text-4xl font-black tabular-nums" style={{ color: '#60a5fa', textShadow: '0 0 24px rgba(96,165,250,0.5)' }}>
              {current.scoreAfter.team0}
            </span>
            <span className="text-2xl font-thin" style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
            <span className="text-4xl font-black tabular-nums" style={{ color: '#fb923c', textShadow: '0 0 24px rgba(251,146,60,0.5)' }}>
              {current.scoreAfter.team1}
            </span>
          </div>
        )}

        {/* victim for demos */}
        {current.type === 'kill' && current.victimPlayerName && (
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
            demolished {current.victimPlayerName}
          </div>
        )}

        {/* accent bottom bar */}
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
