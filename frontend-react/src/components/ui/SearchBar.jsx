export default function SearchBar({ placeholder = 'Search...', value, onChange, icon, className = '' }) {
  return (
    <label className={`ts-search ${className}`.trim()}>
      <span className="ts-search__icon" aria-hidden="true">
        {icon || (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        )}
      </span>
      <input
        type="text"
        className="ts-search__input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </label>
  )
}
