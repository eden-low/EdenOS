import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { themeStorageKey } from './theme'
import { useTheme } from './useTheme'

function Controls() {
  const theme = useTheme()
  return <><span>{theme.preference}:{theme.resolvedTheme}</span><button onClick={() => theme.setPreference('light')}>Light</button><button onClick={() => theme.setPreference('dark')}>Dark</button><button onClick={() => theme.setPreference('system')}>System</button></>
}

function installMatchMedia(initial: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | undefined
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: initial, addEventListener: (_: string, next: typeof listener) => { listener = next }, removeEventListener: vi.fn() })))
  return (matches: boolean) => listener?.({ matches } as MediaQueryListEvent)
}

describe('theme preference', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-theme') })

  it('defaults to system, reacts to system changes, and persists explicit choices', () => {
    const changeSystem = installMatchMedia(false)
    render(<ThemeProvider><Controls /></ThemeProvider>)
    expect(screen.getByText('system:light')).toBeTruthy()
    expect(document.documentElement.dataset.theme).toBe('light')
    act(() => changeSystem(true))
    expect(screen.getByText('system:dark')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(localStorage.getItem(themeStorageKey)).toBe('light')
    act(() => changeSystem(false))
    expect(screen.getByText('light:light')).toBeTruthy()
  })

  it('restores a persisted dark choice', () => {
    localStorage.setItem(themeStorageKey, 'dark'); installMatchMedia(false)
    render(<ThemeProvider><Controls /></ThemeProvider>)
    expect(screen.getByText('dark:dark')).toBeTruthy()
  })
})
