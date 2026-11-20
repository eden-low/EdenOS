import { Brain, Hand, Smile } from 'lucide-react'
import { useContext, useEffect, useId, useReducer, useState } from 'react'
import { PrivacyLockContext } from '../privacy/privacyLockContext'
import { aboutContent } from './aboutContent'
import { aboutAvatarInitialState, aboutAvatarReducer, aboutAvatarSequences, type AboutAvatarAction } from './aboutAvatarMachine'
import atlas from './assets/eden-about-gestures.webp'

const icons = { smile: Smile, think: Brain, wave: Hand }
const actions: AboutAvatarAction[] = ['smile', 'think', 'wave']
const overlaySelector = '.genesis-boot-screen, [role="dialog"][data-state="open"], [role="alertdialog"]'

export function AboutInteractiveAvatar() {
  const [state, dispatch] = useReducer(aboutAvatarReducer, aboutAvatarInitialState)
  const { locked } = useContext(PrivacyLockContext)
  const [overlay, setOverlay] = useState(() => typeof document !== 'undefined' && Boolean(document.querySelector(overlaySelector)))
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false))
  const figureId = useId()
  const blocked = locked || overlay

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media?.matches ?? false)
    media?.addEventListener('change', change)
    return () => media?.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    const check = () => setOverlay(Boolean(document.querySelector(overlaySelector)))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] })
    return () => observer.disconnect()
  }, [])
  useEffect(() => { if (blocked) dispatch({ type: 'reset' }) }, [blocked])
  useEffect(() => {
    const visibility = () => { if (document.visibilityState === 'hidden') dispatch({ type: 'reset' }) }
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [])
  useEffect(() => {
    if (blocked || state.action === 'idle') return
    const timer = window.setTimeout(() => dispatch(reduced ? { type: 'finish', run: state.run } : { type: 'advance', run: state.run }),
      reduced ? 1000 : aboutAvatarSequences[state.action][state.frame].ms)
    return () => window.clearTimeout(timer)
  }, [state, reduced, blocked])

  const action = blocked ? 'idle' : state.action
  const cell = action === 'idle' ? 0 : aboutAvatarSequences[action][reduced ? 0 : state.frame].cell
  const copy = aboutContent.interactive
  return <div className="about-interactive-layout">
    <figure id={figureId} className="about-avatar-stage" role="img" aria-label={copy.imageAlt}
      data-action={action} data-cell={cell} data-reduced-motion={reduced}>
      <span className="about-stage-halo" aria-hidden="true" />
      <svg aria-hidden="true" focusable="false" viewBox={`${(cell % 4) * 512} ${Math.floor(cell / 4) * 512} 512 512`}>
        <image href={atlas} width="2048" height="1024" />
      </svg>
    </figure>
    <div className="about-gesture-panel">
      <p className="about-interactive-description">{copy.description}</p>
      <div className="about-gesture-controls" role="group" aria-label={copy.controlsLabel}>
        {actions.map((gesture) => {
          const Icon = icons[gesture]
          return <button key={gesture} type="button" className="about-gesture-button" aria-controls={figureId}
            disabled={blocked} onClick={() => dispatch({ type: 'trigger', action: gesture })}>
            <Icon aria-hidden="true" size={20} /><span>{copy.actions[gesture].label}</span>
          </button>
        })}
      </div>
      <p className="about-gesture-status" role="status" aria-live="polite" aria-atomic="true">
        {blocked ? copy.paused : action === 'idle' ? copy.idle : copy.actions[action].announcement}
      </p>
    </div>
  </div>
}
