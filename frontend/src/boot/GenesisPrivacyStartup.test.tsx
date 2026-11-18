import { webcrypto } from 'node:crypto'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FinancialAmount } from '../components/privacy/FinancialAmount'
import { PrivacyLockProvider } from '../privacy/PrivacyLockProvider'
import { createPrivacyLockRecord, privacyLockStorageKey } from '../privacy/privacyLock'
import type { PrivacyLockContextValue } from '../privacy/privacyLockContext'
import { usePrivacyLock } from '../privacy/usePrivacyLock'
import { PwaContext } from '../pwa/pwaContextDefinition'
import { createFirebaseAuthService, type AuthObserver } from '../services/firebaseAuthService'
import { FirebaseAuthProvider } from '../state/FirebaseAuthProvider'
import { GenesisBoot } from './GenesisBoot'
import { GenesisLaunchProvider } from './GenesisLaunchProvider'
import { GenesisLaunchSession, type GenesisLaunchSignals } from './genesisLaunchSession'

vi.mock('../lib/firebase', () => ({ firebaseInitialization: { status: 'ready', services: { auth: {}, firestore: {} } } }))
vi.mock('../services/firebaseAuthService', () => ({ createFirebaseAuthService: vi.fn() }))
vi.mock('../state/useRecords', () => ({ useRecords: () => ({ expenseStatus: dataStatus, incomeStatus: dataStatus, exerciseStatus: dataStatus, drafts: [] }) }))
vi.mock('../state/useUserSettings', () => ({ useUserSettings: () => ({ status: dataStatus }) }))

const fresh: GenesisLaunchSignals = { home: true, navigation: 'navigate', marker: 'new', historyLength: 1, sameOriginReferrer: false, opener: false, standalone: true, discarded: false }
let launch: GenesisLaunchSession, observer: AuthObserver, privacy: PrivacyLockContextValue
let dataStatus: 'loaded' | 'error', updateAvailable: boolean
let storedRecord: string
const forbidden = vi.fn(async () => { throw Error('Real authentication is forbidden') })
function Values() {
  privacy = usePrivacyLock()
  return <><output data-testid="lock-state">{privacy.locked ? 'locked' : 'unlocked'}</output><FinancialAmount amountSen={987654} exact /></>
}
function tree() {
  return <StrictMode><PwaContext.Provider value={{ updateAvailable, applyUpdate: forbidden, dismissUpdate: vi.fn() }}>
    <GenesisLaunchProvider session={launch}><FirebaseAuthProvider><PrivacyLockProvider>
      <GenesisBoot><Values /></GenesisBoot>
    </PrivacyLockProvider></FirebaseAuthProvider></GenesisLaunchProvider>
  </PwaContext.Provider></StrictMode>
}
function advance(ms: number) { act(() => { vi.advanceTimersByTime(ms) }) }
function restore(guest = false) { act(() => observer.next({ uid: guest ? 'synthetic-restored-guest' : 'synthetic-restored-google', isAnonymous: guest, email: null })) }
function boot() { return screen.queryByRole('dialog', { name: 'EdenOS welcome' }) }
function masked() {
  expect(screen.getByTestId('lock-state').textContent).toBe('locked')
  // Inspect all DOM text, including underneath the decorative overlay.
  expect(document.body.textContent).not.toContain('9,876.54')
  expect(screen.getByRole('button', { name: 'Unlock financial value' })).toBeTruthy()
  expect(localStorage.getItem(privacyLockStorageKey)).toBe(storedRecord)
}

beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto)
  localStorage.clear(); sessionStorage.clear(); forbidden.mockClear()
  storedRecord = JSON.stringify(await createPrivacyLockRecord('123456'))
  localStorage.setItem(privacyLockStorageKey, storedRecord)
  vi.useFakeTimers()
  window.history.replaceState(null, '', '/')
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  launch = new GenesisLaunchSession(fresh); dataStatus = 'loaded'; updateAvailable = false
  vi.mocked(createFirebaseAuthService).mockReturnValue({ observe: vi.fn(async value => { observer = value; return vi.fn() }),
    continueAnonymously: forbidden, signInWithGoogle: forbidden, linkGoogle: forbidden, continueWithExistingGoogle: forbidden,
    hasPendingGoogleConflict: () => false, discardConflictingGoogleCredential: vi.fn(), signOutGoogle: forbidden, signOutGuest: forbidden })
})
afterEach(() => { expect(forbidden).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('cold Genesis startup with the real financial lock', () => {
  it('still runs eight seconds with Privacy Lock disabled', () => {
    localStorage.removeItem(privacyLockStorageKey)
    render(tree()); advance(16); advance(1000); restore()
    expect(screen.getByTestId('lock-state').textContent).toBe('unlocked')
    advance(6999); expect(boot()).toBeTruthy()
    advance(1); expect(boot()).toBeNull()
  })

  it.each([false, true])('keeps all eight seconds and masks every stage for restored Guest=%s', guest => {
    render(tree()); advance(16); advance(1000); restore(guest)
    expect(boot()?.getAttribute('data-stage')).toBe('genesis'); masked()
    for (const [ms, stage] of [[200, 'core'], [2000, 'ready'], [1600, 'welcome'], [2000, 'enter']] as const) {
      advance(ms); expect(boot()?.getAttribute('data-stage')).toBe(stage); masked()
    }
    advance(1199); expect(boot()).toBeTruthy(); masked()
    advance(1); expect(boot()).toBeNull(); masked()
    advance(10000); expect(boot()).toBeNull(); masked()
  })

  it('also permits an already-restored locked tree before the first animation frame', () => {
    render(tree()); restore(); advance(16)
    expect(boot()).toBeTruthy(); masked()
    advance(7999); expect(boot()).toBeTruthy(); masked()
    advance(1); expect(boot()).toBeNull(); masked()
  })

  it.each(['finish', 'skip'])('requires the correct real PIN after %s without changing the stored verifier', async end => {
    render(tree()); advance(16); advance(1000); restore()
    expect(boot()).toBeTruthy(); masked()
    if (end === 'skip') fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    else advance(7000)
    expect(boot()).toBeNull(); masked()
    vi.useRealTimers()
    act(() => privacy.requestUnlock())
    const input = screen.getByLabelText('PIN')
    fireEvent.change(input, { target: { value: '654321' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByRole('alert').textContent).toBe('That PIN is incorrect.'); masked()
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(screen.getByTestId('lock-state').textContent).toBe('unlocked'))
    expect(document.body.textContent).toContain('9,876.54')
    expect(boot()).toBeNull()
    expect(localStorage.getItem(privacyLockStorageKey)).toBe(storedRecord)
  })

  it.each(['request unlock', 'direct unlock', 'lock', 'data error', 'PWA update', 'auth error', 'pagehide', 'navigation'])('yields immediately to %s while initially locked and never resurrects', async interrupt => {
    const view = render(tree()); advance(16); advance(1000); restore()
    expect(boot()).toBeTruthy(); masked()
    await act(async () => {
      if (interrupt === 'request unlock') privacy.requestUnlock()
      else if (interrupt === 'direct unlock') await privacy.unlock('wrong')
      else if (interrupt === 'lock') privacy.lock()
      else if (interrupt === 'auth error') observer.error(Error('synthetic auth error'))
      else if (interrupt === 'pagehide') window.dispatchEvent(new Event('pagehide'))
      else if (interrupt === 'navigation') window.dispatchEvent(new PopStateEvent('popstate'))
      else if (interrupt === 'data error') dataStatus = 'error'
      else updateAvailable = true
    })
    view.rerender(tree()); expect(boot()).toBeNull()
    if (interrupt === 'request unlock') expect(screen.getByRole('dialog', { name: 'Unlock financial values' })).toBeTruthy()
    if (interrupt !== 'auth error') masked()
    dataStatus = 'loaded'; updateAvailable = false
    view.rerender(tree()); advance(10000); expect(boot()).toBeNull()
  })
})
