import Card from './Card'
import { GreenButton } from './Buttons'

export default function EmptyState({ icon, title, description, actionLabel, onAction, className = '' }) {
  return (
    <Card className={`ts-empty ${className}`.trim()}>
      <div className="ts-empty__icon">{icon}</div>
      <h3 className="ts-empty__title">{title}</h3>
      <p className="ts-empty__description">{description}</p>
      {actionLabel ? (
        <GreenButton onClick={onAction} className="ts-empty__action">
          {actionLabel}
        </GreenButton>
      ) : null}
    </Card>
  )
}
