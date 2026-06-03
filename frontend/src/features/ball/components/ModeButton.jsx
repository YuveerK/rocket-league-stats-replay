export function ModeButton({ option, active, onClick }) {
  const Icon = option.Icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
        active ? 'text-white' : 'text-white/40 hover:text-white/75'
      }`}
      style={active ? {
        background: `${option.color}20`,
        borderColor: `${option.color}65`,
        boxShadow: `0 0 18px ${option.color}18`,
      } : {
        background: 'rgba(255,255,255,0.035)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <Icon size={15} style={{ color: active ? option.color : 'rgba(255,255,255,0.35)' }} />
      {option.label}
    </button>
  )
}
