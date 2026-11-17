import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GenesisLaunchSession, isFreshGenesisLaunch, readGenesisLaunchSignals, type GenesisLaunchSignals } from './genesisLaunchSession'
import { bootPreferenceKey, bootSessionKey } from './bootStorage'
import type { BootAuthSession } from './bootAuthSession'

const fresh: GenesisLaunchSignals = { home: true, navigation: 'navigate', marker: 'new', historyLength: 1, sameOriginReferrer: false, opener: false, standalone: false, discarded: false }
const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!
const navigationDescriptor = Object.getOwnPropertyDescriptor(performance, 'navigation')
const authenticated = (kind: BootAuthSession['kind'] = 'sign-in'): BootAuthSession => ({ kind, claim: () => true, discard() {} })
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); window.history.replaceState(null, '', '/')
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
})
afterEach(() => {
  Object.defineProperty(window, 'sessionStorage', storageDescriptor)
  if (navigationDescriptor) Object.defineProperty(performance, 'navigation', navigationDescriptor)
  else Reflect.deleteProperty(performance, 'navigation')
  vi.restoreAllMocks(); vi.unstubAllGlobals()
})

describe('fresh launch evidence', () => {
  it.each([
    ['fresh browser tab', {}, true],
    ['fresh tab with opener-copied marker', { marker: 'seen', opener: true }, true],
    ['fresh tab retaining about:blank and an opener-copied marker', { marker: 'seen', opener: true, historyLength: 2 }, true],
    ['fresh standalone entry with retained tab storage', { marker: 'seen', standalone: true }, true],
    ['fresh standalone entry retaining about:blank', { marker: 'seen', standalone: true, historyLength: 2 }, true],
    ['standalone existing navigation stack', { marker: 'seen', standalone: true, historyLength: 3 }, false],
    ['fresh page with unavailable storage', { marker: 'unavailable' }, true],
    ['reload even with a missing marker', { navigation: 'reload' }, false],
    ['history restore even with unavailable storage', { navigation: 'back_forward', marker: 'unavailable' }, false],
    ['known discarded-page restore', { discarded: true }, false],
    ['ordinary same-tab navigation', { marker: 'seen', historyLength: 3, sameOriginReferrer: true }, false],
    ['same-origin navigation without storage', { marker: 'unavailable', sameOriginReferrer: true, historyLength: 2 }, false],
    ['previous browser entry', { marker: 'seen' }, false],
    ['standalone same-origin navigation', { marker: 'seen', standalone: true, sameOriginReferrer: true }, false],
    ['deep link', { home: false }, false],
    ['legacy engine with a reliable fresh tab marker', { navigation: 'unknown' }, true],
    ['legacy engine with unavailable storage', { navigation: 'unknown', marker: 'unavailable' }, false],
    ['legacy engine with a seen marker', { navigation: 'unknown', marker: 'seen' }, false],
  ] as const)('%s', (_name, overrides, expected) => {
    expect(isFreshGenesisLaunch({ ...fresh, ...overrides })).toBe(expected)
  })

  it('reads the browser navigation entry independently of sessionStorage', () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: 'reload' }] as unknown as PerformanceEntry[])
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw Error('denied') } })
    expect(readGenesisLaunchSignals()).toMatchObject({ navigation: 'reload', marker: 'unavailable' })
  })
  it.each([0, 1, 2])('uses legacy navigation type %s when modern entries are unavailable', (type) => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([])
    Object.defineProperty(performance, 'navigation', { configurable: true, value: { type } })
    expect(readGenesisLaunchSignals().navigation).toBe(['navigate', 'reload', 'back_forward'][type])
  })
  it('fails conservatively when navigation timing and storage both fail', () => {
    vi.spyOn(performance, 'getEntriesByType').mockImplementation(() => { throw Error('unavailable') })
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw Error('denied') } })
    expect(isFreshGenesisLaunch(readGenesisLaunchSignals())).toBe(false)
  })
})

describe('document-lifetime launch decisions', () => {
  it('claims once, marks the existing tab key and suppresses only the initial successful session', () => {
    const launch = new GenesisLaunchSession(fresh), first = authenticated(), second = authenticated()
    launch.start(); expect(launch.getSnapshot()).toBe(true)
    expect(sessionStorage.getItem(bootSessionKey)).toBe('seen')
    launch.reportAuth('authenticated', false, first)
    expect(launch.suppressWelcome(first)).toBe(true)
    launch.dismiss(); launch.start(); expect(launch.getSnapshot()).toBe(false)
    launch.reportAuth('unauthenticated', false, null); launch.reportAuth('authenticated', false, second)
    expect(launch.suppressWelcome(second)).toBe(false)
    expect(JSON.stringify({ ...sessionStorage, ...localStorage })).toBe('{"edenos.genesis-played.v1":"seen"}')
  })
  it('does not use a pending/failed candidate as the first successful session', () => {
    const launch = new GenesisLaunchSession(fresh), failed = authenticated(), success = authenticated()
    launch.start(); launch.reportAuth('authenticated', true, failed)
    expect(launch.getSnapshot()).toBe(false)
    launch.reportAuth('unauthenticated', false, null); launch.reportAuth('authenticated', false, success)
    expect(launch.suppressWelcome(success)).toBe(true)
  })
  it('preserves an explicit sign-in welcome when interaction cancels startup before its first frame', () => {
    const launch = new GenesisLaunchSession(fresh), signedIn = authenticated()
    launch.dismiss(); launch.start(); launch.reportAuth('authenticated', false, signedIn)
    expect(launch.getSnapshot()).toBe(false); expect(launch.suppressWelcome(signedIn)).toBe(false)
  })
  it.each(['error', 'pending', 'workspace block'])('dismisses on %s without resuming after recovery', (kind) => {
    const launch = new GenesisLaunchSession(fresh)
    launch.start()
    if (kind === 'workspace block') launch.reportBlocked(true)
    else launch.reportAuth(kind === 'error' ? 'error' : 'initializing', kind === 'pending', null)
    expect(launch.getSnapshot()).toBe(false)
    launch.reportBlocked(false); launch.reportAuth('unauthenticated', false, null); launch.start()
    expect(launch.getSnapshot()).toBe(false)
  })
  it('does not start when preference is disabled', () => {
    localStorage.setItem(bootPreferenceKey, 'off')
    const launch = new GenesisLaunchSession(fresh); launch.start(); expect(launch.getSnapshot()).toBe(false)
  })
})
