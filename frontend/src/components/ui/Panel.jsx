/**
 * Section card with an accent top-border, eyebrow label, title, and optional subtitle.
 * Used across Ball, Demos, BoostTeam, BoostPlayers, etc.
 */
export function Panel({ eyebrow, title, subtitle, Icon, accent = '#60a5fa', children }) {
  return (
    <section className="card relative min-w-0 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="card-header">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl border"
              style={{ background: `${accent}14`, borderColor: `${accent}30`, color: accent }}
            >
              <Icon size={17} />
            </div>
          )}
          <div>
            <div className="section-label">{eyebrow}</div>
            <h3 className="mt-0.5 text-base font-black text-white/90">{title}</h3>
          </div>
        </div>
        {subtitle && <span className="max-w-full text-right text-xs text-white/30 sm:max-w-xs">{subtitle}</span>}
      </div>
      <div className="p-5 min-w-0">{children}</div>
    </section>
  )
}
