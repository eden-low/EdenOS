import { createContext } from 'react'
import type { ResolvedTheme, ThemePreference } from './theme'

export interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const defaultThemeContext: ThemeContextValue = {
  preference: 'system',
  resolvedTheme: 'dark',
  setPreference: () => undefined,
}

export const ThemeContext = createContext<ThemeContextValue>(defaultThemeContext)
