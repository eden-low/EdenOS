import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, readThemePreference, resolveTheme, themeStorageKey, type ThemePreference } from './theme'
import { ThemeContext, type ThemeContextValue } from './themeContext'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readThemePreference(localStorage))
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const resolvedTheme = resolveTheme(preference, systemDark)

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const update = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    applyTheme(resolvedTheme)
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    meta?.setAttribute('content', resolvedTheme === 'dark' ? '#090c13' : '#f4f1eb')
  }, [resolvedTheme])

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    resolvedTheme,
    setPreference(next) {
      setPreferenceState(next)
      localStorage.setItem(themeStorageKey, next)
    },
  }), [preference, resolvedTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
