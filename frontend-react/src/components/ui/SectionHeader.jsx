import { GreenButton } from './Buttons'

export default function SectionHeader({ title, subtitle, actionLabel, onAction, className = '' }) {
  return (
    <div className={`ts-section-header ${className}`.trim()}>
      <div>
        <h1 className="ts-page-title">{title}</h1>
        {subtitle ? <p className="ts-page-subtitle">{subtitle}</p> : null}
      </div>
      {actionLabel ? <GreenButton onClick={onAction}>{actionLabel}</GreenButton> : null}
    </div>
  )
}
