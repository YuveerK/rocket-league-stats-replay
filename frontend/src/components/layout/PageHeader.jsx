export function PageHeader({
  gradient,
  eyebrow,
  EyebrowIcon,
  eyebrowColor,
  title,
  description,
  children,
}) {
  return (
    <header
      className="relative overflow-hidden border-b border-white/6"
      style={{ background: gradient }}
    >
      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-8 sm:py-8">
        <div>
          {eyebrow && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1 text-xs text-white/45">
              {EyebrowIcon && (
                <EyebrowIcon
                  size={13}
                  style={{ color: eyebrowColor }}
                />
              )}
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-white/35">{description}</p>
          )}
        </div>
        {children}
      </div>
    </header>
  )
}
