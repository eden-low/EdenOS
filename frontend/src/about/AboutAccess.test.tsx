import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { GenesisBoot } from '../boot/GenesisBoot'
import { PrivacyLockContext, unlockedPrivacyLock } from '../privacy/privacyLockContext'
import { PwaContext } from '../pwa/pwaContextDefinition'
import { FirebaseAuthProvider } from '../state/FirebaseAuthProvider'
import { RecordsContext, type RecordsContextValue } from '../state/recordsContextDefinition'
import { UserSettingsContext, type UserSettingsContextValue } from '../state/userSettingsContextDefinition'
import type { AuthObserver } from '../services/firebaseAuthService'

let observer: AuthObserver | undefined
const { guest, google } = vi.hoisted(() => ({ guest: vi.fn(), google: vi.fn() }))
vi.mock('../lib/firebase', () => ({ firebaseInitialization: { status: 'ready', services: { auth: {}, firestore: {} } } }))
vi.mock('../services/firebaseAuthService', () => ({ createFirebaseAuthService: () => ({
  observe: async (next: AuthObserver) => { observer = next; return () => undefined },
  continueAnonymously: guest, signInWithGoogle: google,
}) }))
const records = { drafts: [], expenseStatus: 'loaded', incomeStatus: 'loaded', exerciseStatus: 'loaded' } as unknown as RecordsContextValue
const settings = { settings: {}, status: 'loaded' } as UserSettingsContextValue
function tree(locked = false) {
  return <FirebaseAuthProvider><RecordsContext.Provider value={records}><UserSettingsContext.Provider value={settings}>
    <PwaContext.Provider value={{ updateAvailable: false, applyUpdate: async () => undefined, dismissUpdate() {} }}>
      <PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, locked }}><GenesisBoot><App /></GenesisBoot></PrivacyLockContext.Provider>
    </PwaContext.Provider>
  </UserSettingsContext.Provider></RecordsContext.Provider></FirebaseAuthProvider>
}
async function restore() {
  await waitFor(() => expect(observer).toBeDefined())
  await act(async () => { observer!.next({ uid: 'about-synthetic', isAnonymous: false, email: 'test@example.invalid' }) })
}
beforeEach(() => {
  observer = undefined; guest.mockClear(); google.mockClear()
  sessionStorage.clear(); localStorage.clear(); window.history.replaceState(null, '', '/about')
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/') })

describe('About uses the existing app security boundary', () => {
  it('does not expose /about before authentication and never starts Guest/Google itself', async () => {
    render(tree())
    await waitFor(() => expect(observer).toBeDefined())
    await act(async () => { observer!.next(null) })
    expect(await screen.findByRole('heading', { name: 'Open your workspace' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'About Eden' })).toBeNull()
    expect(guest).not.toHaveBeenCalled(); expect(google).not.toHaveBeenCalled()
  })
  it('loads an authenticated About deep link without Today’s avatar or automatic Genesis', async () => {
    render(tree()); await restore()
    expect(await screen.findByRole('heading', { name: 'About Eden' })).toBeTruthy()
    expect(document.querySelector('.eden-avatar')).toBeNull()
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 35)) })
    expect(document.querySelector('.genesis-boot-screen')).toBeNull()
    expect(window.location.pathname).toBe('/about')
  })
  it('respects Privacy Lock and removes About when the auth session ends', async () => {
    render(tree(true)); await restore()
    const wave = await screen.findByRole('button', { name: 'Wave' })
    expect((wave as HTMLButtonElement).disabled).toBe(true)
    expect(document.querySelector('.genesis-boot-screen')).toBeNull()
    await act(async () => { observer!.next(null) })
    expect(await screen.findByRole('heading', { name: 'Open your workspace' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Wave' })).toBeNull()
    expect(guest).not.toHaveBeenCalled()
  })
})
