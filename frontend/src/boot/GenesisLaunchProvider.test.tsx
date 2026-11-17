import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode, useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FirebaseAuthProvider } from '../state/FirebaseAuthProvider'
import { useFirebaseAuth } from '../state/useFirebaseAuth'
import { createFirebaseAuthService, type AuthIdentity, type AuthObserver } from '../services/firebaseAuthService'
import { PwaContext } from '../pwa/pwaContextDefinition'
import { unlockedPrivacyLock } from '../privacy/privacyLockContext'
import { AccountDialog } from '../components/account/AccountDialog'
import { GenesisBoot } from './GenesisBoot'
import { GenesisLaunchProvider } from './GenesisLaunchProvider'
import { GenesisLaunchSession, type GenesisLaunchSignals } from './genesisLaunchSession'
import { bootPreferenceKey, bootSessionKey } from './bootStorage'

vi.mock('../lib/firebase', () => ({ firebaseInitialization: { status: 'ready', services: { auth: {}, firestore: {} } } }))
vi.mock('../services/firebaseAuthService', () => ({ createFirebaseAuthService: vi.fn() }))
vi.mock('../repositories/guestAccountRepository', () => ({ getGuestDataSummary: async () => { throw Error('synthetic unavailable summary') } }))
vi.mock('../state/useRecords', () => ({ useRecords: () => ({ expenseStatus: readiness, incomeStatus: readiness, exerciseStatus: readiness, drafts: draft ? [{ status: 'draft' }] : [] }) }))
vi.mock('../state/useUserSettings', () => ({ useUserSettings: () => ({ status: readiness }) }))
vi.mock('../privacy/usePrivacyLock', () => ({ usePrivacyLock: () => ({ ...unlockedPrivacyLock, locked }) }))
vi.mock('../components/account/ThemeSettings', () => ({ ThemeSettings: () => null }))
vi.mock('../components/account/PrivacyLockSettings', () => ({ PrivacyLockSettings: () => null }))
vi.mock('../components/account/NetworkSpeedTest', () => ({ NetworkSpeedTest: () => null }))

const fresh: GenesisLaunchSignals = { home: true, navigation: 'navigate', marker: 'new', historyLength: 1, sameOriginReferrer: false, opener: false, standalone: false, discarded: false }
const google: AuthIdentity = { uid: 'synthetic-google', isAnonymous: false, email: 'synthetic@example.invalid' }
const guest: AuthIdentity = { uid: 'synthetic-guest', isAnonymous: true, email: null }
const initialized = vi.fn()
let observer: AuthObserver
let launch: GenesisLaunchSession
let readiness: 'loaded' | 'loading' | 'error'
let locked: boolean, draft: boolean, pwaUpdate: boolean
let reduced: boolean
const sessionDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!
const localDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!

function Workspace() {
  const identity = useFirebaseAuth()
  useEffect(() => { initialized() }, [])
  return <GenesisBoot><p>Private workspace: {identity.uid}</p><AccountDialog><button>Account settings</button></AccountDialog></GenesisBoot>
}
function tree() { return <PwaContext.Provider value={{ updateAvailable: pwaUpdate, applyUpdate: vi.fn(async () => undefined), dismissUpdate: vi.fn() }}><GenesisLaunchProvider session={launch}><FirebaseAuthProvider><Workspace /></FirebaseAuthProvider></GenesisLaunchProvider></PwaContext.Provider> }
function advance(ms = 20) { act(() => { vi.advanceTimersByTime(ms) }) }
function observe(identity: AuthIdentity | null) { act(() => { observer.next(identity) }) }
function boot() { return screen.queryByRole('dialog', { name: 'EdenOS welcome' }) }
function service() { return vi.mocked(createFirebaseAuthService).mock.results.at(-1)!.value }
async function click(name: string) { await act(async () => { fireEvent.click(screen.getByRole('button', { name })) }) }

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); initialized.mockClear()
  window.history.replaceState(null, '', '/')
  readiness = 'loaded'; locked = false; draft = false; pwaUpdate = false; reduced = false
  launch = new GenesisLaunchSession(fresh)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced }, addEventListener() {}, removeEventListener() {} }))
  vi.mocked(createFirebaseAuthService).mockReturnValue({
    observe: vi.fn(async (value) => { observer = value; return vi.fn() }),
    continueAnonymously: vi.fn(async () => guest), signInWithGoogle: vi.fn(async () => google),
    linkGoogle: vi.fn(async () => google), continueWithExistingGoogle: vi.fn(async () => google),
    hasPendingGoogleConflict: vi.fn(() => false), discardConflictingGoogleCredential: vi.fn(),
    signOutGoogle: vi.fn(async () => undefined), signOutGuest: vi.fn(async () => undefined),
  })
})
afterEach(() => {
  Object.defineProperty(window, 'sessionStorage', sessionDescriptor); Object.defineProperty(window, 'localStorage', localDescriptor)
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers()
})

describe('Genesis application startup', () => {
  it('plays the unchanged eight-second sequence before login while auth initializes independently', () => {
    render(<StrictMode>{tree()}</StrictMode>)
    expect(createFirebaseAuthService).toHaveBeenCalled()
    expect(screen.getByText('Opening your private workspace')).toBeTruthy()
    advance(16); expect(boot()?.getAttribute('data-stage')).toBe('genesis')
    expect(screen.queryByText(/Private workspace/)).toBeNull()
    observe(null); expect(screen.getByText('Open your workspace')).toBeTruthy()
    advance(1200); expect(boot()?.getAttribute('data-stage')).toBe('core')
    advance(2000); expect(boot()?.getAttribute('data-stage')).toBe('ready')
    advance(1600); expect(boot()?.getAttribute('data-stage')).toBe('welcome')
    advance(2000); expect(boot()?.getAttribute('data-stage')).toBe('enter')
    advance(1200); expect(boot()).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeTruthy()
    expect(service().continueAnonymously).not.toHaveBeenCalled()
    expect(service().signInWithGoogle).not.toHaveBeenCalled()
  })

  it.each([google, guest])('reveals restored $uid without a second overlay or delayed workspace initialization', (identity) => {
    render(tree()); observe(identity)
    expect(screen.getByText(`Private workspace: ${identity.uid}`)).toBeTruthy()
    expect(initialized).toHaveBeenCalledOnce()
    advance(); expect(screen.getAllByRole('dialog', { name: 'EdenOS welcome' })).toHaveLength(1)
    advance(8000); expect(boot()).toBeNull()
    observe({ ...identity }); advance(); expect(boot()).toBeNull()
    expect(initialized).toHaveBeenCalledOnce()
  })

  it.each(['Sign in with Google', 'Continue as guest'])('does not play consecutively for initial boot followed by %s', async (action) => {
    render(tree()); observe(null); advance(); advance(8000)
    await click(action); advance(); expect(boot()).toBeNull()
    expect(screen.getByText(/Private workspace/)).toBeTruthy()
    expect(initialized).toHaveBeenCalledOnce()
  })

  it('dismisses startup for a login action and waits for pending success without a duplicate welcome', async () => {
    let complete!: (value: AuthIdentity) => void
    render(tree()); observe(null); advance()
    vi.mocked(service().signInWithGoogle).mockReturnValue(new Promise((resolve) => { complete = resolve }))
    await click('Sign in with Google'); expect(boot()).toBeNull()
    observe(google); advance(10000); expect(boot()).toBeNull()
    await act(async () => { complete(google) }); advance(); expect(boot()).toBeNull()
  })

  it.each(['failed', 'cancelled'])('never overlays a %s sign-in or changes a Guest identity', async (kind) => {
    render(tree()); observe(null); advance()
    if (kind === 'failed') vi.mocked(service().signInWithGoogle).mockRejectedValue(Error('synthetic failure'))
    else vi.mocked(service().signInWithGoogle).mockResolvedValue(null)
    await click('Sign in with Google'); advance(10000)
    expect(boot()).toBeNull(); expect(screen.getByText('Open your workspace')).toBeTruthy()
    expect(service().signOutGuest).not.toHaveBeenCalled()
    expect(service().signOutGoogle).not.toHaveBeenCalled()
  })

  it('preserves Sign Out / Sign In welcomes after the initial restored session', async () => {
    render(tree()); observe(google); advance(); await click('Skip')
    await click('Account settings'); await click('Sign out')
    expect(screen.getByText('Open your workspace')).toBeTruthy(); expect(boot()).toBeNull()
    await click('Sign in with Google'); advance(); expect(boot()).toBeTruthy()
    await click('Skip'); observe(google); advance(); expect(boot()).toBeNull()
  })

  it('replaces startup with only one welcome for an observed account change, without replaying token refreshes', () => {
    render(tree()); observe(google); advance(); expect(boot()).toBeTruthy()
    const other = { ...google, uid: 'synthetic-other-google' }
    observe(other); advance()
    expect(launch.getSnapshot()).toBe(false)
    expect(screen.getAllByRole('dialog', { name: 'EdenOS welcome' })).toHaveLength(1)
    advance(1200); expect(boot()?.getAttribute('data-stage')).toBe('core')
    observe({ ...other }); advance(); expect(boot()?.getAttribute('data-stage')).toBe('core')
  })

  it('retains informed Guest exit and welcomes the subsequent Google session', async () => {
    render(tree()); observe(null); advance(); await click('Skip')
    await click('Continue as guest'); advance(); expect(boot()).toBeNull()
    await click('Account settings'); await click('Sign Out / Switch Account')
    expect(screen.getByText('Before leaving Guest')).toBeTruthy()
    expect(service().signOutGuest).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand I may permanently/ }))
    await click('Leave Guest and sign out'); expect(screen.getByText('Open your workspace')).toBeTruthy()
    await click('Sign in with Google'); advance(); expect(boot()).toBeTruthy()
    expect(service().signOutGuest).toHaveBeenCalledExactlyOnceWith(guest.uid)
  })

  it.each(['reload', 'back_forward'] as const)('never starts on %s even if tab storage has been cleared', (navigation) => {
    launch = new GenesisLaunchSession({ ...fresh, navigation })
    render(tree()); observe(google); advance(10000)
    expect(boot()).toBeNull(); expect(screen.getByText(/Private workspace/)).toBeTruthy()
  })

  it('starts for a new standalone document even when its previous application marker is retained', () => {
    sessionStorage.setItem(bootSessionKey, 'seen')
    launch = new GenesisLaunchSession({ ...fresh, marker: 'seen', standalone: true })
    render(tree()); observe(null); advance(); expect(boot()).toBeTruthy()
  })

  it.each(['pagehide', 'freeze', 'restore', 'hidden', 'pointer', 'keyboard', 'navigation'])('dismisses on %s and never replays on resume', (kind) => {
    render(tree()); observe(null); advance(); expect(boot()).toBeTruthy()
    act(() => {
      if (kind === 'hidden') {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
        document.dispatchEvent(new Event('visibilitychange'))
      } else if (kind === 'restore') {
        const event = new Event('pageshow'); Object.defineProperty(event, 'persisted', { value: true }); window.dispatchEvent(event)
      } else if (kind === 'pointer') fireEvent.pointerDown(screen.getByRole('button', { name: 'Sign in with Google' }))
      else if (kind === 'keyboard') fireEvent.keyDown(document, { key: 'Enter' })
      else if (kind === 'navigation') window.dispatchEvent(new PopStateEvent('popstate'))
      else if (kind === 'freeze') document.dispatchEvent(new Event('freeze'))
      else window.dispatchEvent(new Event(kind))
    })
    expect(boot()).toBeNull()
    vi.restoreAllMocks(); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pageshow')); advance(20000)
    expect(boot()).toBeNull()
  })

  it.each(['/expenses?review=synthetic#row', '/#today', '/?auth=return'])('preserves deep link %s across initial load and authentication', async (url) => {
    window.history.replaceState(null, '', url)
    launch = new GenesisLaunchSession({ ...fresh, home: false })
    render(tree()); observe(null); advance(); expect(boot()).toBeNull()
    await click('Sign in with Google'); advance(); expect(boot()).toBeNull()
    expect(location.pathname + location.search + location.hash).toBe(url)
  })

  it('dismisses auth errors before paint and cannot resurrect after recovery', () => {
    render(tree()); advance(); expect(boot()).toBeTruthy()
    act(() => { observer.error(Error('synthetic auth error')) })
    expect(boot()).toBeNull(); expect(screen.getByText('Firebase setup required')).toBeTruthy()
    observe(google); advance(); expect(boot()).toBeNull()
  })

  it.each(['privacy', 'data error', 'draft', 'PWA update'])('gives %s priority over startup', (kind) => {
    const view = render(tree()); advance(); expect(boot()).toBeTruthy()
    if (kind === 'privacy') locked = true
    else if (kind === 'data error') readiness = 'error'
    else if (kind === 'draft') draft = true
    else pwaUpdate = true
    observe(google); view.rerender(tree()); expect(boot()).toBeNull()
    locked = false; readiness = 'loaded'; draft = false; pwaUpdate = false
    view.rerender(tree()); advance(); expect(boot()).toBeNull()
  })

  it('does not gate data initialization while readiness is pending', () => {
    readiness = 'loading'; const view = render(tree()); observe(google); advance()
    expect(initialized).toHaveBeenCalledOnce(); expect(boot()).toBeTruthy()
    advance(8000); expect(boot()).toBeNull()
    readiness = 'loaded'; view.rerender(tree()); advance(); expect(boot()).toBeNull()
  })

  it.each(['disabled', 'reduced'])('respects %s automatic playback and preserves manual Replay', async (kind) => {
    if (kind === 'disabled') localStorage.setItem(bootPreferenceKey, 'off')
    else reduced = true
    render(tree()); observe(google); advance(); expect(boot()).toBeNull()
    await click('Account settings'); await click('Replay Boot Animation'); advance(180)
    expect(boot()).toBeTruthy()
    if (kind === 'reduced') { expect(boot()?.getAttribute('data-stage')).toBe('welcome'); advance(600); expect(boot()).toBeNull() }
  })

  it('persists the existing device toggle for future launches', async () => {
    const view = render(tree()); observe(google); advance(); await click('Skip'); await click('Account settings')
    fireEvent.click(screen.getByRole('switch', { name: 'Show Boot Animation' }))
    expect(localStorage.getItem(bootPreferenceKey)).toBe('off')
    view.unmount(); launch = new GenesisLaunchSession(fresh); render(tree()); advance(); expect(boot()).toBeNull()
  })

  it('uses document memory with denied storage and still suppresses a duplicate welcome', async () => {
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw Error('synthetic denial') } })
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw Error('synthetic denial') } })
    launch = new GenesisLaunchSession({ ...fresh, marker: 'unavailable' })
    const view = render(tree()); observe(null); advance(); expect(boot()).toBeTruthy()
    await click('Skip'); await click('Sign in with Google'); advance(); expect(boot()).toBeNull()
    view.unmount(); render(tree()); observe(google); advance(); expect(boot()).toBeNull()
  })

  it('cleans up startup frames/timers and cannot replay on a root remount', () => {
    const view = render(tree()); advance(); expect(boot()).toBeTruthy()
    view.unmount(); advance(0); expect(vi.getTimerCount()).toBe(0)
    render(tree()); advance(); expect(boot()).toBeNull()
  })
})
