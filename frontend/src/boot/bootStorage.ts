export const bootPreferenceKey = 'edenos.boot-animation.v1'
export const bootSessionKey = 'edenos.genesis-played.v1'

export function readBootPreference(): boolean {
  try { return window.localStorage.getItem(bootPreferenceKey) !== 'off' } catch { return true }
}

export function saveBootPreference(enabled: boolean): boolean {
  try { window.localStorage.setItem(bootPreferenceKey, enabled ? 'on' : 'off'); return true } catch { return false }
}

/** Claim before playback, so Skip, refresh and interrupted animations cannot loop. */
export function claimAutomaticBoot(): boolean {
  try {
    if (window.sessionStorage.getItem(bootSessionKey) === 'seen') return false
    window.sessionStorage.setItem(bootSessionKey, 'seen')
    return true
  } catch {
    // Without a reliable tab marker, let the application open normally.
    return false
  }
}

export function markBootSeen(): void {
  try { window.sessionStorage.setItem(bootSessionKey, 'seen') } catch { /* Replay still works. */ }
}

export function prefersReducedBootMotion(): boolean {
  try { return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return true }
}

export function isBootHomeEntry(location: Pick<Location, 'pathname' | 'search' | 'hash'>): boolean {
  return location.pathname === '/' && !location.search && !location.hash
}
