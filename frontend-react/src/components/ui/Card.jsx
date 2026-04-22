export default function Card({ className = '', children, ...props }) {
  return (
    <section className={`ts-card ${className}`.trim()} {...props}>
      {children}
    </section>
  )
}
