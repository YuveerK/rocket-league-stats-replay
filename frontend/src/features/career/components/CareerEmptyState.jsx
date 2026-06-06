import { BLUE } from '@/lib/colors'

export function CareerEmptyState({ title, detail, tone = BLUE, Icon }) {
  return (
    <div className="mx-auto max-w-2xl px-8 py-16">
      <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-8 text-center">
        {Icon && (
          <div
            className="mx-auto grid h-12 w-12 place-items-center rounded-xl border"
            style={{ color: tone, background: `${tone}12`, borderColor: `${tone}30` }}
          >
            <Icon size={20} />
          </div>
        )}
        <h2 className="mt-5 text-lg font-black text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/35">{detail}</p>
      </div>
    </div>
  )
}
