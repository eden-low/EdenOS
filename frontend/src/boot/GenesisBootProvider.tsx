import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { BootAnimationContext } from './bootContext'
import { claimAutomaticBoot, isBootHomeEntry, markBootSeen, prefersReducedBootMotion, readBootPreference, saveBootPreference } from './bootStorage'
import { GenesisBootSequence } from './GenesisBootSequence'
import './genesisBoot.css'

/** An optional sibling of the running app; never a gate around its children. */
export function GenesisBootProvider({ children, ready, blocked = false }: {
  children: ReactNode; ready: boolean; blocked?: boolean
}) {
  const [enabled, setEnabledState] = useState(readBootPreference)
  const [preferenceSaved, setPreferenceSaved] = useState(true)
  const [playback, setPlayback] = useState<{ id: number; reduced: boolean } | null>(null)
  const [homeEntry] = useState(() => isBootHomeEntry(window.location))
  const decided = useRef(false)
  const sequence = useRef(0)
  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finish = useCallback(() => setPlayback(null), [])
  const canReplay = ready && !blocked

  useEffect(() => {
    if (!canReplay || decided.current) return
    // Start on a frame after the app mounts. StrictMode cleanup cancels this frame
    // before the tab marker is claimed; data subscriptions are already running.
    const frame = requestAnimationFrame(() => {
      decided.current = true
      if (!homeEntry || !isBootHomeEntry(window.location) || !enabled ||
        prefersReducedBootMotion() || document.visibilityState === 'hidden') return
      if (claimAutomaticBoot()) setPlayback({ id: ++sequence.current, reduced: false })
    })
    return () => cancelAnimationFrame(frame)
  }, [canReplay, enabled, homeEntry])

  useEffect(() => {
    if (canReplay) return
    // An error/update/lock wins immediately in render. Also discard pending replay
    // so recovery never resurrects a sequence that covered an interrupted state.
    if (blocked) decided.current = true
    if (replayTimer.current !== null) clearTimeout(replayTimer.current)
    const timer = setTimeout(finish, 0)
    return () => clearTimeout(timer)
  }, [canReplay, blocked, finish])

  useEffect(() => {
    const dismiss = () => {
      decided.current = true
      if (replayTimer.current !== null) clearTimeout(replayTimer.current)
      finish()
    }
    const visibility = () => { if (document.visibilityState === 'hidden') dismiss() }
    window.addEventListener('popstate', dismiss)
    window.addEventListener('hashchange', dismiss)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      if (replayTimer.current !== null) clearTimeout(replayTimer.current)
      window.removeEventListener('popstate', dismiss)
      window.removeEventListener('hashchange', dismiss)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [finish])

  return <BootAnimationContext.Provider value={{
    enabled, preferenceSaved, canReplay,
    setEnabled(next) {
      setEnabledState(next)
      setPreferenceSaved(saveBootPreference(next))
    },
    replay() {
      if (!canReplay) return false
      decided.current = true
      if (replayTimer.current !== null) clearTimeout(replayTimer.current)
      // Let the existing Account dialog finish closing before moving focus.
      replayTimer.current = setTimeout(() => {
        replayTimer.current = null
        markBootSeen()
        setPlayback({ id: ++sequence.current, reduced: prefersReducedBootMotion() })
      }, 180)
      return true
    },
  }}>
    {children}
    {playback && canReplay && <GenesisBootSequence key={playback.id} reduced={playback.reduced} onFinish={finish} />}
  </BootAnimationContext.Provider>
}
