import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const THEME_STORAGE_KEY = 'teleconsultation-theme'

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreference] = useState(() => {
    if (typeof window === 'undefined') return 'system'
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  })
  const [systemTheme, setSystemTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  const theme = themePreference === 'system' ? systemTheme : themePreference

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference)
  }, [theme, themePreference])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: light)')
    if (!media) return undefined

    function handleChange(event) {
      setSystemTheme(event.matches ? 'light' : 'dark')
    }

    media.addEventListener?.('change', handleChange)
    return () => media.removeEventListener?.('change', handleChange)
  }, [])

  function toggleTheme() {
    setThemePreference((prev) => {
      const resolved = prev === 'system' ? systemTheme : prev
      return resolved === 'dark' ? 'light' : 'dark'
    })
  }

  const setTheme = (nextTheme) => {
    if (nextTheme === 'light' || nextTheme === 'dark' || nextTheme === 'system') {
      setThemePreference(nextTheme)
    }
  }

  const value = useMemo(() => ({ theme, themePreference, toggleTheme, setTheme }), [theme, themePreference, systemTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
