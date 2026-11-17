import type { BootAuthSession } from './bootAuthSession'
import { bootSessionKey, isBootHomeEntry, markBootSeen, prefersReducedBootMotion, readBootPreference } from './bootStorage'

export interface GenesisLaunchSignals {
  home: boolean
  navigation: 'navigate' | 'reload' | 'back_forward' | 'unknown'
  marker: 'new' | 'seen' | 'unavailable'
  historyLength: number
  sameOriginReferrer: boolean
  opener: boolean
  standalone: boolean
  discarded: boolean
}

export function readGenesisLaunchSignals(): GenesisLaunchSignals {
  let navigation: GenesisLaunchSignals['navigation'] = 'unknown'
  try {
    const type = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type
    if (type === 'navigate' || type === 'reload' || type === 'back_forward') navigation = type
  } catch { /* Try the legacy navigation type below. */ }
  if (navigation === 'unknown') {
    try {
      const type = performance.navigation?.type
      if (type === 0) navigation = 'navigate'
      else if (type === 1) navigation = 'reload'
      else if (type === 2) navigation = 'back_forward'
    } catch { /* Neither timing API is available. */ }
  }
  let marker: GenesisLaunchSignals['marker'] = 'unavailable'
  try { marker = sessionStorage.getItem(bootSessionKey) === 'seen' ? 'seen' : 'new' } catch { /* Use navigation evidence when available. */ }
  let standalone = false
  try { standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true } catch { /* Browser tab. */ }
  let sameOriginReferrer = false
  try { sameOriginReferrer = !!document.referrer && new URL(document.referrer).origin === location.origin } catch { /* No usable referrer. */ }
  return {
    home: isBootHomeEntry(location), navigation, marker, historyLength: history.length,
    sameOriginReferrer, opener: window.opener != null, standalone,
    discarded: (document as Document & { wasDiscarded?: boolean }).wasDiscarded === true,
  }
}

/** A resume never becomes a launch merely because enough time has elapsed. */
export function isFreshGenesisLaunch(signals: GenesisLaunchSignals): boolean {
  if (!signals.home || signals.discarded || signals.navigation === 'reload' || signals.navigation === 'back_forward') return false
  // Some engines retain the initial about:blank entry alongside the first URL.
  // A short history is only supporting evidence, never sufficient on its own.
  const shortHistory = signals.historyLength <= 2
  if (signals.navigation === 'unknown') return signals.marker === 'new' && shortHistory && !signals.sameOriginReferrer
  if (signals.marker === 'new') return shortHistory || !signals.sameOriginReferrer
  if (signals.marker === 'unavailable') return shortHistory && !signals.sameOriginReferrer
  // A new tab may inherit its opener's sessionStorage. Standalone engines can
  // retain that storage across new documents; require a fresh entry/navigation.
  return shortHistory && (signals.opener || (signals.standalone && !signals.sameOriginReferrer))
}

/** Document-lifetime visual state only. Never reads or changes a Firebase user. */
export class GenesisLaunchSession {
  private decided = false
  private played = false
  private visible = false
  private firstAuth: BootAuthSession | null = null
  private status = 'initializing'
  private pending = false
  private blocked = false
  private listeners = new Set<() => void>()
  private signals: GenesisLaunchSignals
  constructor(signals = readGenesisLaunchSignals()) { this.signals = signals }
  getSnapshot = () => this.visible
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(visible: boolean) {
    if (this.visible === visible) return
    this.visible = visible
    this.listeners.forEach((listener) => listener())
  }
  start = () => {
    if (this.decided) return
    this.decided = true
    if (this.blocked || this.pending || this.status === 'error' || !isFreshGenesisLaunch(this.signals) ||
      !isBootHomeEntry(location) || !readBootPreference() || prefersReducedBootMotion() || document.visibilityState === 'hidden') return
    this.played = true
    markBootSeen()
    this.publish(true)
  }
  dismiss = () => { this.decided = true; this.publish(false) }
  reportAuth(status: string, pending: boolean, session: BootAuthSession | null) {
    if (status === 'error' || pending || (status === 'unauthenticated' && this.status === 'authenticated')) this.dismiss()
    // Cross-tab/auth-observer account changes need not have a local pending
    // action. Yield the old startup visual before a new session's welcome.
    if (status === 'authenticated' && session && this.firstAuth && session !== this.firstAuth) this.dismiss()
    this.status = status
    this.pending = pending
    if (status === 'authenticated' && !pending && session && !this.firstAuth) this.firstAuth = session
  }
  reportBlocked(blocked: boolean) { this.blocked = blocked; if (blocked) this.dismiss() }
  suppressWelcome(session: BootAuthSession | null): boolean {
    // An already-ready auth tree can register its frame first. Resolve startup
    // on that same (post-StrictMode-cleanup) frame before authorizing a welcome.
    this.start()
    // Startup owns restored-session playback. The first successful sign-in is
    // already welcomed if this launch played, even if Skip/interruption ended it.
    return session?.kind === 'restored' || (!!session && this.played && session === this.firstAuth)
  }
}

const documents = new WeakMap<Document, GenesisLaunchSession>()
export function documentGenesisLaunch(): GenesisLaunchSession {
  let launch = documents.get(document)
  if (!launch) { launch = new GenesisLaunchSession(); documents.set(document, launch) }
  return launch
}
