import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {isDark ? (
          <>
            <path d="M12 3a1 1 0 0 1 1 1v1.1a7 7 0 0 1 5.9 5.9H20a1 1 0 1 1 0 2h-1.1a7 7 0 0 1-5.9 5.9V20a1 1 0 1 1-2 0v-1.1a7 7 0 0 1-5.9-5.9H4a1 1 0 1 1 0-2h1.1a7 7 0 0 1 5.9-5.9V4a1 1 0 0 1 1-1Z" />
            <circle cx="12" cy="12" r="3.2" />
          </>
        ) : (
          <>
            <path d="M13.2 4.2a8 8 0 1 0 6.6 13.6A9 9 0 0 1 13.2 4.2Z" />
            <path d="M19 5v2M20 6h-2M5 12H3M6 12H4M7.5 6.5 6 5M17.5 17.5 19 19" />
          </>
        )}
      </svg>
    </button>
  )
}
