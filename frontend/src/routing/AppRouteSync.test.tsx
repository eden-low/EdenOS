import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useLayoutEffect, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { pushAppPage } from './appRoutes'
import { FirebaseAuthProvider } from '../state/FirebaseAuthProvider'
import type { AuthObserver } from '../services/firebaseAuthService'

let observer: AuthObserver | undefined
const { guest, google } = vi.hoisted(() => ({ guest: vi.fn(), google: vi.fn() }))
vi.mock('../lib/firebase', () => ({ firebaseInitialization: { status: 'ready', services: { auth: {}, firestore: {} } } }))
vi.mock('../services/firebaseAuthService', () => ({ createFirebaseAuthService: () => ({
  observe: async (next: AuthObserver) => { observer = next; return () => undefined },
  continueAnonymously: guest, signInWithGoogle: google,
}) }))

// Keep real App, routing, lazy boundaries and navigation. These page bodies avoid
// backend subscriptions; actual page behavior is covered by the browser fixture.
vi.mock('../pages/TodayPage', () => ({ TodayPage: () => <h1>Today fixture</h1> }))
vi.mock('../pages/ExpensesPage', () => ({ ExpensesPage: () => <h1>Finance fixture</h1> }))
vi.mock('../pages/ExercisePage', () => ({ ExercisePage: () => <h1>Exercise fixture</h1> }))
vi.mock('../pages/RecordsPage', () => ({ RecordsPage: () => <h1>Records fixture</h1> }))
vi.mock('../pages/WeeklyReviewPage', () => ({ WeeklyReviewPage: () => <h1>Review fixture</h1> }))
vi.mock('../pages/AnimePage', () => ({ AnimePage: () => <h1>Anime fixture</h1> }))
vi.mock('../pages/CosmosPage', () => ({ CosmosPage: () => <h1>Cosmos fixture</h1> }))
vi.mock('../pages/AboutPage', () => ({ AboutPage: () => <h1>About fixture</h1> }))
vi.mock('../components/avatar/EdenAvatar', () => ({ EdenAvatarProvider: ({ children }: { children: ReactNode }) => children }))
vi.mock('../components/capture/CaptureSheet', () => ({ CaptureSheet: ({ children }: { children: ReactNode }) => children }))
vi.mock('../components/account/AccountDialog', () => ({ AccountDialog: ({ children }: { children: ReactNode }) => children }))
vi.mock('../pwa/PwaUpdatePrompt', () => ({ PwaUpdatePrompt: () => null }))

beforeEach(() => { observer = undefined; guest.mockClear(); google.mockClear(); window.history.replaceState(null, '', '/') })
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/') })

describe('App route source and restoration', () => {
  it.each([
    ['/expenses', 'Finance'], ['/exercise', 'Exercise'], ['/records', 'Records'],
    ['/weekly-review', 'Review'], ['/anime', 'Anime'], ['/cosmos', 'Cosmos'], ['/about', 'About'],
  ])('preserves %s across initial load and authenticated-app remount', async (path, title) => {
    window.history.replaceState(null, '', path)
    const view = render(<FirebaseAuthProvider><App /></FirebaseAuthProvider>)
    expect(screen.queryByRole('heading', { name: title + ' fixture' })).toBeNull()
    await act(async () => { observer!.next({ uid: 'synthetic-route', isAnonymous: false, email: null }) })
    expect(await screen.findByRole('heading', { name: title + ' fixture' })).toBeTruthy()
    view.unmount()
    render(<FirebaseAuthProvider><App /></FirebaseAuthProvider>)
    await act(async () => { observer!.next({ uid: 'synthetic-route', isAnonymous: false, email: null }) })
    expect(await screen.findByRole('heading', { name: title + ' fixture' })).toBeTruthy()
    expect(window.location.pathname).toBe(path)
    expect(guest).not.toHaveBeenCalled(); expect(google).not.toHaveBeenCalled()
  })

  it('does not lose a URL change between first render and passive subscription', async () => {
    function Restore({ children }: { children: ReactNode }) {
      useLayoutEffect(() => {
        window.history.replaceState(null, '', '/expenses')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }, [])
      return children
    }
    render(<Restore><App /></Restore>)
    expect(await screen.findByRole('heading', { name: 'Finance fixture' })).toBeTruthy()
    expect(window.location.pathname).toBe('/expenses')
  })

  it('resynchronizes a restored document on pageshow without redirecting or reloading', async () => {
    render(<App />)
    act(() => { window.history.replaceState(null, '', '/expenses'); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })) })
    expect(await screen.findByRole('heading', { name: 'Finance fixture' })).toBeTruthy()
    expect(window.location.pathname).toBe('/expenses')
    fireEvent.click(screen.getByRole('button', { name: 'Open apps' }))
    const drawer = await screen.findByRole('dialog', { name: 'Apps' })
    expect(drawer.querySelector('[aria-current="page"]')?.textContent).toBe('Expenses')
  })

  it('keeps programmatic routing and native history changes in sync with content', async () => {
    render(<App />)
    act(() => pushAppPage('expenses'))
    expect(await screen.findByRole('heading', { name: 'Finance fixture' })).toBeTruthy()
    act(() => { window.history.replaceState(null, '', '/records'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(await screen.findByRole('heading', { name: 'Records fixture' })).toBeTruthy()
  })
})
