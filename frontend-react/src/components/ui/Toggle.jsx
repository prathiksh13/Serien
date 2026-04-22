import { useId } from 'react'

export default function Toggle({ checked, onChange, label, id }) {
  const generatedId = useId()
  const controlId = id || generatedId

  return (
    <label className="ts-toggle" htmlFor={controlId}>
      {label ? <span className="ts-toggle__label">{label}</span> : null}
      <input id={controlId} type="checkbox" checked={checked} onChange={onChange} className="ts-toggle__input" />
      <span className="ts-toggle__track" aria-hidden="true">
        <span className="ts-toggle__thumb" />
      </span>
    </label>
  )
}
