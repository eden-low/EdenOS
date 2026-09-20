export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const themeStorageKey = 'edenos.theme.v1'

export function readThemePreference(storage: Pick<Storage, 'getItem'>): ThemePreference {
  const value = storage.getItem(themeStorageKey)
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
}

export function applyTheme(theme: ResolvedTheme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme
  root.style.colorScheme = theme
}
