const TONE_CLASS = {
  neutral: 'badge--neutral',
  blue: 'badge--blue',
  orange: 'badge--orange',
  green: 'badge--green',
  yellow: 'badge--yellow',
  red: 'badge--red',
}

export function Badge({ children, tone = 'neutral' }) {
  return (
    <span className={`badge ${TONE_CLASS[tone] ?? TONE_CLASS.neutral}`}>
      {children}
    </span>
  )
}
