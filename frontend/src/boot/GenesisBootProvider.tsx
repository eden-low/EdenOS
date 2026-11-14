import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { BootAuthSession } from './bootAuthSession'
import { BootAnimationContext } from './bootContext'
import { claimAutomaticBoot, isBootHomeEntry, markBootSeen, prefersReducedBootMotion, readBootPreference, saveBootPreference } from './bootStorage'
import { GenesisBootSequence } from './GenesisBootSequence'
import './genesisBoot.css'

/** An optional sibling of the running app; never a gate around its children. */
export function GenesisBootProvider({ children, ready, blocked = false, authSession = null }: {
  children: ReactNode; ready: boolean; blocked?: boolean; authSession?: BootAuthSession | null
}) {
  const [enabled, setEnabledState] = useState(readBootPreference)
  const [preferenceSaved, setPreferenceSaved] = useState(true)
  const [playback, setPlayback] = useState<{ id: number; reduced: boolean; session: BootAuthSession | null } | null>(null)
  // A new successful auth session gets a new decision without remounting the app.
  const decided = useRef(false)
  const entry = useRef({ session: authSession, home: isBootHomeEntry(window.location) })
  const sequence = useRef(0)
  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finish = useCallback(() => setPlayback(null), [])
  const canReplay = ready && !blocked

  useEffect(() => {
    if (entry.current.session === authSession) return
    entry.current = { session: authSession, home: isBootHomeEntry(window.location) }
    decided.current = false
  }, [authSession])

  useEffect(() => {
    if (!canReplay || decided.current) return
    // Start on a frame after the app mounts. StrictMode cleanup cancels this frame
    // before the tab marker is claimed; data subscriptions are already running.
    const frame = requestAnimationFrame(() => {
      decided.current = true
      if (authSession && !authSession.claim()) return
      if (!entry.current.home || !isBootHomeEntry(window.location) || !enabled ||
        prefersReducedBootMotion() || document.visibilityState === 'hidden') return
      if (authSession?.kind === 'sign-in') {
        markBootSeen()
        setPlayback({ id: ++sequence.current, reduced: false, session: authSession })
      } else if (claimAutomaticBoot()) setPlayback({ id: ++sequence.current, reduced: false, session: authSession })
    })
    return () => cancelAnimationFrame(frame)
  }, [canReplay, enabled, authSession])

  useEffect(() => {
    if (canReplay) return
    // An error/update/lock wins immediately in render. Also discard pending replay
    // so recovery never resurrects a sequence that covered an interrupted state.
    if (blocked) { decided.current = true; authSession?.discard() }
    if (replayTimer.current !== null) clearTimeout(replayTimer.current)
    const timer = setTimeout(finish, 0)
    return () => clearTimeout(timer)
  }, [canReplay, blocked, finish, authSession])

  useEffect(() => {
    // Once the user is working (including in Account/auth dialogs), never open
    // an automatic welcome over that interaction when data finishes loading.
    const interacting = () => { decided.current = true; authSession?.discard() }
    const dismiss = () => {
      decided.current = true
      authSession?.discard()
      if (replayTimer.current !== null) clearTimeout(replayTimer.current)
      finish()
    }
    const visibility = () => { if (document.visibilityState === 'hidden') dismiss() }
    window.addEventListener('popstate', dismiss)
    window.addEventListener('hashchange', dismiss)
    document.addEventListener('visibilitychange', visibility)
    document.addEventListener('pointerdown', interacting, true)
    document.addEventListener('keydown', interacting, true)
    return () => {
      if (replayTimer.current !== null) clearTimeout(replayTimer.current)
      window.removeEventListener('popstate', dismiss)
      window.removeEventListener('hashchange', dismiss)
      document.removeEventListener('visibilitychange', visibility)
      document.removeEventListener('pointerdown', interacting, true)
      document.removeEventListener('keydown', interacting, true)
    }
  }, [finish, authSession])

  return <BootAnimationContext.Provider value={{
    enabled, preferenceSaved, canReplay,
    setEnabled(next) {
      setEnabledState(next)
      setPreferenceSaved(saveBootPreference(next))
    },
    replay() {
      if (!canReplay) return false
      decided.current = true
      authSession?.discard()
      if (replayTimer.current !== null) clearTimeout(replayTimer.current)
      // Let the existing Account dialog finish closing before moving focus.
      replayTimer.current = setTimeout(() => {
        replayTimer.current = null
        markBootSeen()
        setPlayback({ id: ++sequence.current, reduced: prefersReducedBootMotion(), session: authSession })
      }, 180)
      return true
    },
  }}>
    {children}
    {playback && canReplay && playback.session === authSession && <GenesisBootSequence key={playback.id} reduced={playback.reduced} onFinish={finish} />}
  </BootAnimationContext.Provider>
}
