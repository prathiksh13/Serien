export function GreenButton({ className = '', children, ...props }) {
  return (
    <button type="button" className={`ts-btn ts-btn--green ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export function OutlineButton({ className = '', children, ...props }) {
  return (
    <button type="button" className={`ts-btn ts-btn--outline ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
