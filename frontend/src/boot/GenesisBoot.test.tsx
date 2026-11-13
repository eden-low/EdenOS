import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountDialog } from '../components/account/AccountDialog'
import { emptyUserSettings } from '../domain/userSettings'
import { PrivacyLockContext, unlockedPrivacyLock } from '../privacy/privacyLockContext'
import { PwaContext } from '../pwa/pwaContextDefinition'
import { createFirebaseAuthService, type AuthObserver } from '../services/firebaseAuthService'
import { FirebaseAuthProvider } from '../state/FirebaseAuthProvider'
import { RecordsContext, type RecordsContextValue } from '../state/recordsContextDefinition'
import { UserSettingsContext, type UserSettingsContextValue } from '../state/userSettingsContextDefinition'
import { GenesisBoot } from './GenesisBoot'
import { bootSessionKey } from './bootStorage'

vi.mock('../lib/firebase', () => ({ firebaseInitialization: { status: 'ready', services: { auth: {}, firestore: {} } } }))
vi.mock('../services/firebaseAuthService', () => ({ createFirebaseAuthService: vi.fn() }))

let observer: AuthObserver
let records: RecordsContextValue
let settings: UserSettingsContextValue
let updateAvailable: boolean
let locked: boolean
const identity = { uid: 'synthetic-genesis-user', isAnonymous: false, email: 'synthetic@example.invalid' }
const write = vi.fn(async () => undefined)

function Application() {
  return <RecordsContext.Provider value={records}><UserSettingsContext.Provider value={settings}>
    <PwaContext.Provider value={{ updateAvailable, applyUpdate: vi.fn(async () => undefined), dismissUpdate: vi.fn() }}>
      <PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, locked }}>
        <GenesisBoot><p>Initialized workspace</p><AccountDialog><button>Account settings</button></AccountDialog></GenesisBoot>
      </PrivacyLockContext.Provider>
    </PwaContext.Provider>
  </UserSettingsContext.Provider></RecordsContext.Provider>
}
function tree() { return <FirebaseAuthProvider><Application /></FirebaseAuthProvider> }
function advance(ms = 20) { act(() => { vi.advanceTimersByTime(ms) }) }
function restore() { act(() => { observer.next(identity) }) }
function boot() { return screen.queryByRole('dialog', { name: 'EdenOS welcome' }) }

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); write.mockClear()
  window.history.replaceState(null, '', '/')
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  updateAvailable = false; locked = false
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
  })
})
afterEach(() => { expect(write).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.useRealTimers() })

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
})
