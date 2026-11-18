import { createContext, useContext, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import type { BootAuthSessions } from './bootAuthSession'
import type { GenesisLaunchSession } from './genesisLaunchSession'

export const GenesisLaunchContext = createContext<GenesisLaunchSession | null>(null)
export function useGenesisLaunch() { return useContext(GenesisLaunchContext) }

/** Observe existing outcomes before paint; never participate in auth operations. */
export function useGenesisLaunchAuth(status: string, sessions: BootAuthSessions) {
  const launch = useGenesisLaunch()
  const snapshot = useSyncExternalStore(sessions.subscribe, sessions.getSnapshot, sessions.getSnapshot)
  useLayoutEffect(() => { launch?.reportAuth(status, snapshot.pending, snapshot.session) }, [launch, status, snapshot])
}

export function useGenesisLaunchBlock(blocked: boolean, privacyLocked = false) {
  const launch = useGenesisLaunch()
  // An existing device lock masks money independently of the startup visual.
  // Once unlocked, a later lock is an interruption, never a startup exception.
  const initialLock = useRef(privacyLocked)
  useLayoutEffect(() => {
    if (!privacyLocked) initialLock.current = false
    launch?.reportBlocked(blocked || (privacyLocked && !initialLock.current))
  }, [launch, blocked, privacyLocked])
}
