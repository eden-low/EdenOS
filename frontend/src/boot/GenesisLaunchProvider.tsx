import { useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { PwaContext } from '../pwa/pwaContextDefinition'
import { GenesisBootSequence } from './GenesisBootSequence'
import { GenesisLaunchContext } from './genesisLaunchContext'
import { documentGenesisLaunch, type GenesisLaunchSession } from './genesisLaunchSession'
import './genesisBoot.css'

/** Visual sibling only: authentication, subscriptions and children run normally. */
export function GenesisLaunchProvider({ children, session }: { children: ReactNode; session?: GenesisLaunchSession }) {
  const [launch] = useState(() => session ?? documentGenesisLaunch())
  const visible = useSyncExternalStore(launch.subscribe, launch.getSnapshot, launch.getSnapshot)
  const updateAvailable = useContext(PwaContext)?.updateAvailable === true
  useEffect(() => {
    if (updateAvailable) { launch.dismiss(); return }
    // Passive-effect cleanup cancels StrictMode's probe before any claim. A
    // layout-effect frame can fire before that probe is cleaned up in browsers.
    const frame = requestAnimationFrame(launch.start)
    return () => {
      cancelAnimationFrame(frame)
      if (launch.getSnapshot()) launch.dismiss()
    }
  }, [launch, updateAvailable])
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === 'hidden') launch.dismiss() }
    const restored = (event: PageTransitionEvent) => { if (event.persisted) launch.dismiss() }
    window.addEventListener('popstate', launch.dismiss)
    window.addEventListener('hashchange', launch.dismiss)
    window.addEventListener('pagehide', launch.dismiss)
    window.addEventListener('pageshow', restored)
    document.addEventListener('freeze', launch.dismiss)
    document.addEventListener('visibilitychange', hidden)
    document.addEventListener('pointerdown', launch.dismiss, true)
    document.addEventListener('keydown', launch.dismiss, true)
    return () => {
      window.removeEventListener('popstate', launch.dismiss)
      window.removeEventListener('hashchange', launch.dismiss)
      window.removeEventListener('pagehide', launch.dismiss)
      window.removeEventListener('pageshow', restored)
      document.removeEventListener('freeze', launch.dismiss)
      document.removeEventListener('visibilitychange', hidden)
      document.removeEventListener('pointerdown', launch.dismiss, true)
      document.removeEventListener('keydown', launch.dismiss, true)
    }
  }, [launch])
  return <GenesisLaunchContext.Provider value={launch}>
    {children}
    {visible && !updateAvailable && <GenesisBootSequence reduced={false} onFinish={launch.dismiss} />}
  </GenesisLaunchContext.Provider>
}
