import { createContext, useContext, useSyncExternalStore } from 'react'
import { BootAuthSessions, emptyBootAuthSnapshot } from './bootAuthSession'

export const BootAuthContext = createContext<{ sessions: BootAuthSessions; uid: string } | null>(null)
const noSubscribe = () => () => undefined
const noSession = () => emptyBootAuthSnapshot
const waitingForIdentity = { session: null, pending: true }

export function useBootAuthState() {
  const auth = useContext(BootAuthContext)
  const snapshot = useSyncExternalStore(auth?.sessions.subscribe ?? noSubscribe, auth?.sessions.getSnapshot ?? noSession, noSession)
  // Never apply a new identity's welcome decision to the previous account tree.
  return auth && !auth.sessions.matches(auth.uid) ? waitingForIdentity : snapshot
}
