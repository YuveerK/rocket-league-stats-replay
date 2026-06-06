export function FieldLegend() {
  return (
    <section className="pointer-events-none absolute right-4 top-4 hidden w-44 sm:block">
      <div className="rounded-2xl p-3 backdrop-blur-2xl"
        style={{ background: 'rgba(5,8,22,0.85)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
        <div className="mb-2 text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.22)' }}>
          Standard field
        </div>
        <div className="flex flex-col gap-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: 'radial-gradient(circle,#ffcc55 30%,#ff7700 70%)', boxShadow: '0 0 6px rgba(255,136,0,0.45)' }} />
            <span>Big <span className="font-black text-amber-400/90">(+100)</span> — sphere on Y-frame</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-sm"
              style={{ background: '#fbbf24', boxShadow: '0 0 4px rgba(251,191,36,0.4)' }} />
            <span>Small <span className="font-black text-amber-300/80">(+12)</span> — plate + column</span>
          </div>
          <div className="mt-1 border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-[9px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Big pads: floating sphere + Y-base. Small: flat plate + energy column. Metal base stays when taken.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
