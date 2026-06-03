import UploadReplay from '@/components/UploadReplay'

/**
 * Shared page header used by every data page.
 *
 * gradient     – CSS background value for the header; each page provides its
 *                own accent colours.
 * eyebrow      – small label text shown in the pill above the title
 * EyebrowIcon  – lucide icon component for the pill
 * eyebrowColor – Tailwind-compatible colour class or CSS colour for the icon
 * title        – h1 text
 * description  – subtitle text below the title (optional)
 * onUpload     – forwarded to the compact UploadReplay button
 * children     – rendered below the title row, typically:
 *                  <HeroMetric /> grid  +  meta-chips row
 */
export function PageHeader({
  gradient,
  eyebrow,
  EyebrowIcon,
  eyebrowColor,
  title,
  description,
  onUpload,
  children,
}) {
  return (
    <header
      className="relative overflow-hidden border-b border-white/6"
      style={{ background: gradient }}
    >
      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
      <div className="mx-auto max-w-7xl space-y-7 px-8 py-8">
        <div className="flex items-start justify-between gap-5">
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
            <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-white/35">{description}</p>
            )}
          </div>
          {onUpload && <UploadReplay onAnalysisStart={onUpload} compact />}
        </div>
        {children}
      </div>
    </header>
  )
}
