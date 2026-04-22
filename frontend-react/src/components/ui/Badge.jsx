const STATUS_CLASS = {
  pending: 'ts-badge ts-badge--pending',
  confirmed: 'ts-badge ts-badge--confirmed',
  active: 'ts-badge ts-badge--active',
  completed: 'ts-badge ts-badge--completed',
  cancelled: 'ts-badge ts-badge--cancelled',
}

export default function Badge({ status = 'pending', children }) {
  const normalized = String(status || 'pending').toLowerCase()
  const className = STATUS_CLASS[normalized] || STATUS_CLASS.pending

  if (normalized === 'active') {
    return (
      <span className={className}>
        <span className="ts-live-dot" aria-hidden="true" />
        {children || 'Live'}
      </span>
    )
  }

  return <span className={className}>{children || normalized}</span>
}
