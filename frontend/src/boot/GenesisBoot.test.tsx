import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountDialog } from '../components/account/AccountDialog'
import { emptyUserSettings } from '../domain/userSettings'
import { getGuestDataSummary } from '../repositories/guestAccountRepository'
import { PrivacyLockContext, unlockedPrivacyLock } from '../privacy/privacyLockContext'
import { PwaContext } from '../pwa/pwaContextDefinition'
import { createFirebaseAuthService, type AuthIdentity, type AuthObserver } from '../services/firebaseAuthService'
import { FirebaseAuthProvider } from '../state/FirebaseAuthProvider'
import { RecordsContext, type RecordsContextValue } from '../state/recordsContextDefinition'
import { UserSettingsContext, type UserSettingsContextValue } from '../state/userSettingsContextDefinition'
import { GenesisBoot } from './GenesisBoot'
import { bootPreferenceKey, bootSessionKey } from './bootStorage'

vi.mock('../lib/firebase', () => ({ firebaseInitialization: { status: 'ready', services: { auth: {}, firestore: {} } } }))
vi.mock('../services/firebaseAuthService', () => ({ createFirebaseAuthService: vi.fn() }))
vi.mock('../repositories/guestAccountRepository', () => ({ getGuestDataSummary: vi.fn() }))

let observer: AuthObserver
let records: RecordsContextValue
let settings: UserSettingsContextValue
let updateAvailable: boolean
let locked: boolean
const identity = { uid: 'synthetic-genesis-user', isAnonymous: false, email: 'synthetic@example.invalid' }
const write = vi.fn(async () => undefined)
const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!

function Application() {
  return <RecordsContext.Provider value={records}><UserSettingsContext.Provider value={settings}>
    <PwaContext.Provider value={{ updateAvailable, applyUpdate: vi.fn(async () => undefined), dismissUpdate: vi.fn() }}>
      <PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, locked }}>
        <GenesisBoot><p>Initialized workspace</p><input aria-label="Synthetic local state" defaultValue="" /><AccountDialog><button>Account settings</button></AccountDialog></GenesisBoot>
      </PrivacyLockContext.Provider>
    </PwaContext.Provider>
  </UserSettingsContext.Provider></RecordsContext.Provider>
}
function tree(key = 'application') { return <FirebaseAuthProvider><Application key={key} /></FirebaseAuthProvider> }
function advance(ms = 20) { act(() => { vi.advanceTimersByTime(ms) }) }
function restore() { act(() => { observer.next(identity) }) }
function boot() { return screen.queryByRole('dialog', { name: 'EdenOS welcome' }) }
function service() { return vi.mocked(createFirebaseAuthService).mock.results.at(-1)!.value }
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function click(name: string) { await act(async () => { fireEvent.click(screen.getByRole('button', { name })) }) }
function signedOut() { act(() => { observer.next(null) }) }

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); write.mockClear()
  window.history.replaceState(null, '', '/')
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  updateAvailable = false; locked = false
  vi.mocked(getGuestDataSummary).mockResolvedValue({
    expensesCount: 0, incomesCount: 0, exercisesCount: 0, hasBodyWeight: false, hasHeight: false,
    hasBudget: false, hasSavingsGoal: false, animeProgressCount: 0, animeCloudProgressCount: 0,
    otherBlockingData: [], hasBlockingData: false,
  })
  records = {
    expenses: [], incomes: [], exerciseRecords: [], drafts: [],
    expenseStatus: 'loaded', incomeStatus: 'loaded', exerciseStatus: 'loaded',
    expenseError: null, incomeError: null, exerciseError: null,
    retryExpenseSubscription: vi.fn(), retryIncomeSubscription: vi.fn(), retryExerciseSubscription: vi.fn(),
    discardDraft: vi.fn(), createExpenseDraft: vi.fn(() => 'synthetic'), updateExpenseDraft: vi.fn(), confirmExpenseDraft: write,
    createExpense: write, updateExpense: write, deleteExpense: write,
    createIncome: write, updateIncome: write, deleteIncome: write,
    createExerciseDraft: vi.fn(() => 'synthetic'), updateExerciseDraft: vi.fn(), confirmExerciseDraft: write,
    createExercise: write, updateExercise: write, deleteExercise: write,
  }
  settings = { settings: emptyUserSettings, status: 'loaded', saveBodyWeight: write, saveHeight: write, saveMonthlyBudget: write, saveSavingsGoal: write }
  vi.mocked(createFirebaseAuthService).mockReturnValue({
    observe: vi.fn(async (value) => { observer = value; return vi.fn() }),
    continueAnonymously: vi.fn(async () => identity), signInWithGoogle: vi.fn(async () => identity),
    linkGoogle: vi.fn(async () => identity), continueWithExistingGoogle: vi.fn(async () => identity),
    hasPendingGoogleConflict: vi.fn(() => false), discardConflictingGoogleCredential: vi.fn(), signOutGoogle: write,
    signOutGuest: vi.fn(async () => undefined),
  })
})

describe('successful authentication welcomes', () => {
  it('welcomes existing Google login after explicit Guest exit, never the exit warning or sign-out screen', async () => {
    const guest = { ...identity, uid: 'synthetic-exiting-guest', isAnonymous: true, email: null }
    vi.mocked(getGuestDataSummary).mockRejectedValue(new Error('permission-denied'))
    render(tree()); act(() => { observer.next(guest) }); advance(); await click('Skip')
    await click('Account settings'); await click('Sign Out / Switch Account')
    expect(screen.getByText('Before leaving Guest')).toBeTruthy(); expect(boot()).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand I may permanently/ }))
    await click('Leave Guest and sign out'); advance()
    expect(screen.getByText('Open your workspace')).toBeTruthy(); expect(boot()).toBeNull()
    await click('Sign in with Google'); advance(); expect(boot()).toBeTruthy()
    await click('Skip'); act(() => { observer.next(identity) }); advance(); expect(boot()).toBeNull()
    expect(service().signOutGuest).toHaveBeenCalledExactlyOnceWith(guest.uid)
  })
  it('is StrictMode safe for explicit entry and subsequent ordinary remounts', async () => {
    sessionStorage.setItem(bootSessionKey, 'seen')
    const view = render(<StrictMode>{tree()}</StrictMode>); signedOut()
    await click('Sign in with Google'); advance(); expect(boot()).toBeTruthy()
    await click('Skip')
    view.rerender(<StrictMode>{tree('remounted')}</StrictMode>); advance(); expect(boot()).toBeNull()
  })

  it('uses the in-memory successful session once when sessionStorage is unavailable', async () => {
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new Error('synthetic storage denial') } })
    const view = render(tree()); signedOut(); await click('Sign in with Google'); advance(); expect(boot()).toBeTruthy()
    await click('Skip'); view.rerender(tree('remounted')); advance(); expect(boot()).toBeNull()
  })

  it.each(['Google account', 'unused Google account', 'Guest'] as const)('welcomes a successful %s entry even when this tab has already played', async (kind) => {
    sessionStorage.setItem(bootSessionKey, 'seen')
    render(tree()); signedOut(); advance()
    expect(boot()).toBeNull()
    const next = { ...identity, uid: `synthetic-${kind}`, isAnonymous: kind === 'Guest', email: null }
    vi.mocked(service().signInWithGoogle).mockResolvedValue(next)
    vi.mocked(service().continueAnonymously).mockResolvedValue(next)
    await click(kind === 'Guest' ? 'Continue as guest' : 'Sign in with Google'); advance()
    expect(boot()).toBeTruthy()
    expect(screen.getByText('Initialized workspace')).toBeTruthy()
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(next.uid)
    expect(localStorage.length).toBe(0)
  })

  it.each(['same Google account', 'different Google account', 'Guest'] as const)('welcomes Sign Out then Sign In with %s, never the sign-out screen', async (kind) => {
    render(tree()); restore(); advance(); await click('Skip')
    service().signOutGoogle = vi.fn(async () => undefined)
    await click('Account settings'); await click('Sign out'); advance()
    expect(screen.getByText('Open your workspace')).toBeTruthy(); expect(boot()).toBeNull()
    const next = { ...identity, uid: kind === 'same Google account' ? identity.uid : `synthetic-${kind}`, isAnonymous: kind === 'Guest' }
    vi.mocked(service().signInWithGoogle).mockResolvedValue(next)
    vi.mocked(service().continueAnonymously).mockResolvedValue(next)
    await click(kind === 'Guest' ? 'Continue as guest' : 'Sign in with Google'); advance()
    expect(boot()).toBeTruthy()
    await click('Skip')
    act(() => { observer.next({ ...next }) }); advance()
    expect(boot()).toBeNull()
  })

  it('deduplicates same-identity auth notifications and ordinary app remounts without relying on storage', async () => {
    const view = render(tree()); restore(); advance(); await click('Skip')
    sessionStorage.clear()
    act(() => { observer.next({ ...identity, email: 'refreshed@example.invalid' }) }); advance()
    expect(boot()).toBeNull()
    view.rerender(tree('ordinary-remount')); advance()
    expect(boot()).toBeNull()
  })

  it('preserves restored-session playback and suppresses refresh with a new auth-provider instance', async () => {
    const view = render(tree()); restore(); advance(); expect(boot()).toBeTruthy()
    await click('Skip'); view.unmount()
    render(tree()); restore(); advance(); expect(boot()).toBeNull()
  })

  it('welcomes an observed account switch, but never replays for repeated observations', async () => {
    render(tree()); restore(); advance(); await click('Skip')
    const next = { ...identity, uid: 'synthetic-second-google' }
    act(() => { observer.next(next) }); advance(); expect(boot()).toBeTruthy()
    await click('Skip'); act(() => { observer.next({ ...next }) }); advance(); expect(boot()).toBeNull()
  })

  it('handles a batched sign-out/sign-in without remounting the running app', async () => {
    render(tree()); restore(); advance(); await click('Skip')
    fireEvent.change(screen.getByLabelText('Synthetic local state'), { target: { value: 'keep this local state' } })
    act(() => { observer.next(null); observer.next(identity) }); advance()
    expect(boot()).toBeTruthy()
    expect((screen.getByLabelText('Synthetic local state') as HTMLInputElement).value).toBe('keep this local state')
  })

  it.each(['/expenses?review=synthetic#row', '/#today'])('keeps post-login deep link %s unobstructed, including later remounts at home', async (url) => {
    window.history.replaceState(null, '', url)
    const view = render(tree()); signedOut(); await click('Sign in with Google'); advance()
    expect(boot()).toBeNull()
    expect(location.pathname + location.search + location.hash).toBe(url)
    window.history.replaceState(null, '', '/')
    view.rerender(tree('home-remount')); advance(); expect(boot()).toBeNull()
  })

  it('waits for application readiness after successful sign-in', async () => {
    records.expenseStatus = 'loading'
    const view = render(tree()); signedOut(); await click('Sign in with Google'); advance(10000)
    expect(boot()).toBeNull(); expect(screen.getByText('Initialized workspace')).toBeTruthy()
    records = { ...records, expenseStatus: 'loaded' }; view.rerender(tree()); advance()
    expect(boot()).toBeTruthy()
  })

  it('waits for the sign-in promise even if its auth observer reports the account first', async () => {
    const pending = deferred<AuthIdentity | null>()
    render(tree()); signedOut(); vi.mocked(service().signInWithGoogle).mockReturnValue(pending.promise)
    await click('Sign in with Google'); restore(); advance(10000)
    expect(boot()).toBeNull()
    await act(async () => { pending.resolve(identity) }); advance()
    expect(boot()).toBeTruthy()
  })

  it.each(['Google failure', 'Google cancellation', 'Guest failure'])('does not welcome %s', async (kind) => {
    sessionStorage.setItem(bootSessionKey, 'seen')
    render(tree()); signedOut()
    if (kind === 'Google cancellation') vi.mocked(service().signInWithGoogle).mockResolvedValue(null)
    else if (kind === 'Google failure') vi.mocked(service().signInWithGoogle).mockRejectedValue({ code: 'auth/network-request-failed' })
    else vi.mocked(service().continueAnonymously).mockRejectedValue(new Error('synthetic guest failure'))
    await click(kind === 'Guest failure' ? 'Continue as guest' : 'Sign in with Google'); advance(10000)
    expect(boot()).toBeNull(); expect(screen.getByText('Open your workspace')).toBeTruthy()
    expect(sessionStorage.getItem(bootSessionKey)).toBe('seen')
  })

  it('discards an observed candidate when the pending sign-in subsequently fails', async () => {
    const pending = deferred<AuthIdentity | null>()
    const view = render(tree()); signedOut(); vi.mocked(service().signInWithGoogle).mockReturnValue(pending.promise)
    await click('Sign in with Google'); restore(); advance(); expect(boot()).toBeNull()
    await act(async () => { pending.reject(new Error('synthetic late failure')) }); advance()
    expect(boot()).toBeNull()
    sessionStorage.clear(); view.rerender(tree('remount-after-failure')); advance(); expect(boot()).toBeNull()
  })

  it('does not treat linking Google to the same Guest UID as a new session', async () => {
    const guest = { ...identity, isAnonymous: true, email: null }
    render(tree()); act(() => { observer.next(guest) }); advance(); await click('Skip')
    vi.mocked(service().linkGoogle).mockResolvedValue(identity)
    await click('Account settings'); await click('Connect Google account'); advance()
    expect(boot()).toBeNull()
  })

  it('welcomes a successful Guest-to-existing-Google switch after the existing safety checks', async () => {
    const guest = { ...identity, uid: 'synthetic-guest', isAnonymous: true, email: null }
    render(tree()); act(() => { observer.next(guest) }); advance(); await click('Skip')
    vi.mocked(service().linkGoogle).mockRejectedValue({ code: 'auth/credential-already-in-use' })
    vi.mocked(service().hasPendingGoogleConflict).mockReturnValue(true)
    await click('Account settings'); await click('Connect Google account')
    expect(boot()).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand switching/ })); await click('Continue with existing Google account'); advance()
    expect(boot()).toBeTruthy()
    expect(getGuestDataSummary).toHaveBeenCalled()
  })

  it.each(['disabled preference', 'reduced motion'])('respects %s for automatic post-login playback', async (kind) => {
    if (kind === 'disabled preference') localStorage.setItem(bootPreferenceKey, 'off')
    else vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    render(tree()); signedOut(); await click('Sign in with Google'); advance()
    expect(boot()).toBeNull()
    await click('Account settings'); await click('Replay Boot Animation'); advance(180)
    expect(boot()).toBeTruthy()
    if (kind === 'reduced motion') { advance(600); expect(boot()).toBeNull() }
  })

  it.each(['PWA update', 'privacy lock', 'draft'])('keeps %s and its recovery ahead of a post-login welcome', async (kind) => {
    if (kind === 'PWA update') updateAvailable = true
    else if (kind === 'privacy lock') locked = true
    else records.drafts = [{ id: 'synthetic', kind: 'expense', status: 'draft', createdAt: '', updatedAt: '', data: { amountSen: 100, category: 'other', title: 'Synthetic', occurredAt: '', source: 'manual' } }]
    const view = render(tree()); signedOut(); await click('Sign in with Google'); advance(); expect(boot()).toBeNull()
    updateAvailable = false; locked = false; records = { ...records, drafts: [] }
    view.rerender(tree()); advance(); expect(boot()).toBeNull()
  })
})
afterEach(() => { expect(write).not.toHaveBeenCalled(); Object.defineProperty(window, 'sessionStorage', sessionStorageDescriptor); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('Genesis integration inside existing authentication gates', () => {
  it('never mounts over unresolved authentication, the sign-in screen, or auth errors', () => {
    render(tree()); advance(5000)
    expect(screen.getByText('Opening your private workspace')).toBeTruthy(); expect(boot()).toBeNull()
    act(() => { observer.next(null) }); advance()
    expect(screen.getByText('Open your workspace')).toBeTruthy(); expect(boot()).toBeNull()
    act(() => { observer.error(new Error('synthetic auth failure')) }); advance()
    expect(screen.getByText('Firebase setup required')).toBeTruthy(); expect(boot()).toBeNull()
    expect(sessionStorage.getItem(bootSessionKey)).toBeNull()
  })
  it('shows the already initialized app after restored authentication, and yields immediately to an auth error', () => {
    render(tree()); restore()
    expect(screen.getByText('Initialized workspace')).toBeTruthy(); expect(boot()).toBeNull()
    advance(); expect(boot()).toBeTruthy()
    act(() => { observer.error(new Error('synthetic auth failure')) }); advance()
    expect(boot()).toBeNull(); expect(screen.getByText('Firebase setup required')).toBeTruthy()
    advance(5000); expect(boot()).toBeNull()
  })
  it.each(['expenseStatus', 'incomeStatus', 'exerciseStatus', 'settings'] as const)('waits for %s while app initialization continues', (key) => {
    if (key === 'settings') settings.status = 'loading'
    else records[key] = 'loading'
    const view = render(tree()); restore(); advance()
    expect(screen.getByText('Initialized workspace')).toBeTruthy(); expect(boot()).toBeNull()
    if (key === 'settings') settings = { ...settings, status: 'loaded' }
    else records = { ...records, [key]: 'loaded' }
    view.rerender(tree()); advance(); expect(boot()).toBeTruthy()
  })
  it.each(['expenseStatus', 'incomeStatus', 'exerciseStatus', 'settings'] as const)('does not obscure %s errors or start on error recovery', (key) => {
    if (key === 'settings') settings.status = 'error'
    else records[key] = 'error'
    const view = render(tree()); restore(); advance(); expect(boot()).toBeNull()
    if (key === 'settings') settings = { ...settings, status: 'loaded' }
    else records = { ...records, [key]: 'loaded' }
    view.rerender(tree()); advance(); expect(boot()).toBeNull()
  })
  it.each(['PWA update', 'privacy lock', 'unconfirmed draft'])('yields to an existing %s', (state) => {
    const view = render(tree()); restore(); advance(); expect(boot()).toBeTruthy()
    if (state === 'PWA update') updateAvailable = true
    if (state === 'privacy lock') locked = true
    if (state === 'unconfirmed draft') records = { ...records, drafts: [{
      id: 'synthetic-draft', kind: 'expense', status: 'draft', createdAt: '', updatedAt: '',
      data: { amountSen: 100, category: 'other', title: 'Synthetic', occurredAt: '2026-11-14', source: 'manual' },
    }] }
    view.rerender(tree()); expect(boot()).toBeNull()
  })
  it('preserves a deep link across restored authentication and explicit replay', () => {
    window.history.replaceState(null, '', '/expenses?review=synthetic#row')
    render(tree()); restore(); advance(); expect(boot()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Replay Boot Animation' })); advance(180)
    expect(boot()).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Account' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/expenses?review=synthetic#row')
    expect(screen.getByText('Initialized workspace')).toBeTruthy()
  })
  it('disables replay while an existing Account authentication action is unresolved', () => {
    render(tree()); restore(); advance(); fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    const service = vi.mocked(createFirebaseAuthService).mock.results.at(-1)!.value
    service.signOutGoogle = vi.fn(() => new Promise<void>(() => undefined))
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect((screen.getByRole('button', { name: 'Replay Boot Animation' }) as HTMLButtonElement).disabled).toBe(true)
    expect(boot()).toBeNull()
  })
})
