import { Eye, Gauge, Pause, Play, RotateCcw } from 'lucide-react'
import { BLUE, ORANGE } from '../constants'
import { eventPlaybackSeconds } from '../lib/playbackHelpers'
import { fmtTime } from '../lib/sampleHelpers'
import { setBroadcastCamera, setTopCamera } from '../three/cameras'

export function WatchControls({
  data, duration, currentTime, setCurrentTime,
  playing, setPlaying, speed, setSpeed, SPEEDS,
  panSpeed, setPanSpeed, PAN_SPEED_MIN, PAN_SPEED_MAX,
  reset, sceneRef,
}) {
  const scrubPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const panPct   = ((panSpeed - PAN_SPEED_MIN) / (PAN_SPEED_MAX - PAN_SPEED_MIN)) * 100

  return (
    <section className="absolute inset-x-0 bottom-0 backdrop-blur-2xl"
      style={{ background: 'rgba(2,4,12,0.94)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Timeline */}
      <div className="relative px-5 pt-5 pb-1">
        <div className="pointer-events-none absolute inset-x-5 top-1.5 flex h-3">
          {(data.events ?? []).map((ev, i) => {
            const pct     = duration > 0 ? Math.max(0, Math.min(100, (eventPlaybackSeconds(ev) / duration) * 100)) : 0
            const isGoal  = ev.type === 'goal'
            const mColor  = isGoal ? (ev.team === 0 ? BLUE : ORANGE) : 'rgba(255,255,255,0.2)'
            return (
              <div key={i} className="absolute top-0.5 h-2 w-0.5 -translate-x-1/2 rounded-full"
                style={{ left: `${pct}%`, background: mColor, boxShadow: isGoal ? `0 0 6px ${mColor}` : 'none' }} />
            )
          })}
        </div>
        <input type="range" min="0" max={duration} step="0.05" value={currentTime}
          onChange={e => setCurrentTime(Number(e.target.value))}
          className="scrubber w-full"
          style={{ background: `linear-gradient(90deg,#3b82f6 0%,#3b82f6 ${scrubPct}%,rgba(255,255,255,0.07) ${scrubPct}%,rgba(255,255,255,0.07) 100%)` }} />
        <div className="mt-1 flex justify-between text-[10px] font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 px-5 pb-4">
        <button type="button" onClick={() => setPlaying(v => !v)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform hover:scale-105"
          style={{ background: playing ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.11)', border: '1px solid rgba(59,130,246,0.28)', color: '#93c5fd', boxShadow: playing ? '0 0 20px rgba(59,130,246,0.28)' : 'none' }}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button type="button" onClick={reset}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
          <RotateCcw size={15} />
        </button>

        <div className="flex rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {SPEEDS.map(s => (
            <button key={s} type="button" onClick={() => setSpeed(s)}
              className="rounded-lg px-3 py-1.5 text-xs font-black tabular-nums transition-all"
              style={speed === s
                ? { background: 'rgba(59,130,246,0.2)', color: '#93c5fd', boxShadow: '0 0 10px rgba(59,130,246,0.18)' }
                : { color: 'rgba(255,255,255,0.22)' }}>
              {s}x
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <label className="flex items-center gap-2.5 rounded-xl px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Pan speed
          </span>
          <input type="range" min={PAN_SPEED_MIN} max={PAN_SPEED_MAX} step="0.05" value={panSpeed}
            onChange={e => setPanSpeed(Number(e.target.value))}
            className="scrubber w-28"
            style={{ background: `linear-gradient(90deg,#3b82f6 0%,#3b82f6 ${panPct}%,rgba(255,255,255,0.07) ${panPct}%,rgba(255,255,255,0.07) 100%)` }}
            aria-label="WASD camera pan speed" />
          <span className="min-w-[2.5rem] text-right text-[10px] font-black tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {panSpeed.toFixed(2)}×
          </span>
        </label>

        <button type="button" onClick={() => setBroadcastCamera(sceneRef.current)}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[11px] font-bold transition-transform hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
          <Eye size={13} /> Broadcast
        </button>

        <button type="button" onClick={() => setTopCamera(sceneRef.current)}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[11px] font-bold transition-transform hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
          <Gauge size={13} /> Top
        </button>
      </div>
    </section>
  )
}
