export function KickoffCountdown({ label }) {
  if (!label) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="rounded-2xl px-8 py-5 text-center backdrop-blur-xl"
        style={{ background: 'rgba(2,4,12,0.58)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 28px 72px rgba(0,0,0,0.55)' }}>
        <div className="text-[10px] font-black uppercase tracking-[0.32em]" style={{ color: 'rgba(255,255,255,0.38)' }}>
          Kickoff
        </div>
        <div className="mt-1 text-7xl font-black tabular-nums leading-none"
          style={{ color: label === 'GO' ? '#93c5fd' : 'rgba(255,255,255,0.92)', textShadow: '0 0 28px rgba(96,165,250,0.4)' }}>
          {label}
        </div>
      </div>
    </div>
  )
}
