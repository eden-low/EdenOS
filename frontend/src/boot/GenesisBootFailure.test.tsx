import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { GenesisBootProvider } from './GenesisBootProvider'
import { GenesisLaunchProvider } from './GenesisLaunchProvider'
import { GenesisLaunchSession } from './genesisLaunchSession'

// A visual-only render failure must never take the running application with it.
vi.mock('react-dom', async (original) => ({ ...await original<typeof import('react-dom')>(), createPortal() { throw new Error('synthetic visual failure') } }))
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

it('removes a failed animation and preserves the usable application', () => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); window.history.replaceState(null, '', '/')
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  render(<GenesisBootProvider ready><button>Usable application</button></GenesisBootProvider>)
  act(() => { vi.advanceTimersByTime(20) })
  expect(errors).toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Usable application' })).toBeTruthy()
  expect(screen.queryByRole('dialog', { name: 'EdenOS welcome' })).toBeNull()
})

it('removes a failed startup visual without taking the login/application surface with it', () => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); window.history.replaceState(null, '', '/')
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const session = new GenesisLaunchSession({ home: true, navigation: 'navigate', marker: 'new', historyLength: 1, sameOriginReferrer: false, opener: false, standalone: false, discarded: false })
  render(<GenesisLaunchProvider session={session}><button>Usable sign-in choice</button></GenesisLaunchProvider>)
  act(() => { vi.advanceTimersByTime(20) })
  expect(errors).toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Usable sign-in choice' })).toBeTruthy()
  expect(screen.queryByRole('dialog', { name: 'EdenOS welcome' })).toBeNull()
})
