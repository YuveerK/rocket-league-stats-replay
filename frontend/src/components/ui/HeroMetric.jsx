/**
 * Full-bleed hero stat card with gradient background and optional icon.
 * Used across Ball, Demos, Core, BoostTeam, etc.
 */
export function HeroMetric({ label, value, detail, color, Icon }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border px-5 py-4"
      style={{
        background: `linear-gradient(135deg, ${color}18, rgba(255,255,255,0.025))`,
        borderColor: `${color}30`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 42px ${color}10`,
      }}
    >
      <div className="absolute -right-7 -top-7 h-20 w-20 rounded-full blur-2xl" style={{ background: `${color}22` }} />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="section-label mb-2">{label}</p>
          <p className="stat-num text-3xl font-black" style={{ color }}>{value}</p>
          {detail && <p className="mt-1 text-xs text-white/30">{detail}</p>}
        </div>
        {Icon && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{ borderColor: `${color}25`, background: `${color}12`, color }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  )
}
