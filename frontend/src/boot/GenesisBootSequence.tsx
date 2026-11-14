import { Component, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Stage = 'genesis' | 'core' | 'ready' | 'welcome' | 'enter'
const stageNames: Record<Stage, string> = { genesis: 'Genesis', core: 'Core Awakening', ready: 'System Ready', welcome: 'Welcome Back', enter: 'Enter Your Universe' }

class VisualBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

function Sequence({ reduced, onFinish }: { reduced: boolean; onFinish: () => void }) {
  const [stage, setStage] = useState<Stage>(reduced ? 'welcome' : 'genesis')
  const skip = useRef<HTMLButtonElement>(null)
  const id = useId()

  useLayoutEffect(() => {
    const previous = document.activeElement
    skip.current?.focus({ preventScroll: true })
    return () => {
      if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const timers = reduced ? [setTimeout(onFinish, 600)] : [
      setTimeout(() => setStage('core'), 1200),
      setTimeout(() => setStage('ready'), 3200),
      setTimeout(() => setStage('welcome'), 4800),
      setTimeout(() => setStage('enter'), 6800),
      setTimeout(onFinish, 8000),
    ]
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onFinish() }
      // Keyboard navigation and application shortcuts always win over decoration.
      else if (event.key === 'Tab' || event.ctrlKey || event.metaKey) onFinish()
    }
    const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
    const motionChanged = () => { if (media?.matches) onFinish() }
    document.addEventListener('keydown', keyboard, true)
    if (media?.addEventListener) media.addEventListener('change', motionChanged)
    else media?.addListener?.(motionChanged)
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      document.removeEventListener('keydown', keyboard, true)
      if (media?.removeEventListener) media.removeEventListener('change', motionChanged)
      else media?.removeListener?.(motionChanged)
    }
  }, [onFinish, reduced])

  return createPortal(<section className="genesis-boot-screen" data-stage={stage} data-reduced-motion={reduced}
    role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
    <h2 id={`${id}-title`} className="sr-only">EdenOS welcome</h2>
    <p id={`${id}-description`} className="sr-only">Optional welcome animation. Skip or press Escape to continue to your workspace.</p>
    <div className="genesis-night" aria-hidden="true" />
    <header className="genesis-masthead" aria-hidden="true"><span>EDEN OS</span><span>YOUR PERSONAL UNIVERSE</span></header>
    <button ref={skip} type="button" className="genesis-skip" onClick={onFinish}>Skip <span aria-hidden="true">↗</span></button>
    <div className="genesis-center">
      <div className="genesis-art" aria-hidden="true">
        <div className="genesis-halo" />
        <svg className="genesis-orbits" viewBox="0 0 520 520" focusable="false">
          <defs>
            <linearGradient id={`${id}-violet`}><stop stopColor="#7b6ff8" stopOpacity="0.1" /><stop offset="0.5" stopColor="#a99eff" /><stop offset="1" stopColor="#7b6ff8" stopOpacity="0.15" /></linearGradient>
            <linearGradient id={`${id}-cyan`}><stop stopColor="#58aab0" stopOpacity="0.1" /><stop offset="0.5" stopColor="#88d8dd" /><stop offset="1" stopColor="#58aab0" stopOpacity="0.15" /></linearGradient>
          </defs>
          <circle cx="260" cy="260" r="207" fill="none" stroke="#a99eff" strokeOpacity="0.08" />
          <g className="genesis-orbit genesis-orbit-a"><ellipse cx="260" cy="260" rx="226" ry="82" fill="none" stroke={`url(#${id}-violet)`} strokeWidth="1.5" /><circle cx="486" cy="260" r="3" fill="#a99eff" /></g>
          <g className="genesis-orbit genesis-orbit-b"><ellipse cx="260" cy="260" rx="210" ry="85" fill="none" stroke={`url(#${id}-cyan)`} strokeWidth="1.3" /><circle cx="50" cy="260" r="2.6" fill="#88d8dd" /></g>
          <g className="genesis-orbit genesis-orbit-c"><ellipse cx="260" cy="260" rx="186" ry="76" fill="none" stroke={`url(#${id}-violet)`} strokeWidth="0.8" /></g>
          <g fill="#f5f7fb" opacity="0.5"><circle cx="75" cy="103" r="1" /><circle cx="442" cy="146" r="1.2" /><circle cx="384" cy="419" r="1" /><circle cx="109" cy="391" r="1.1" /><circle cx="298" cy="53" r="0.8" /><circle cx="238" cy="476" r="0.8" /></g>
        </svg>
        {/* Exact brand geometry from public/icons/edenos-icon.svg, inlined: no asset request. */}
        <svg className="genesis-brand" viewBox="0 0 512 512" focusable="false">
          <defs><linearGradient id={`${id}-surface`} x1="82" y1="54" x2="430" y2="458" gradientUnits="userSpaceOnUse"><stop stopColor="#1B2140" /><stop offset="0.58" stopColor="#121A2C" /><stop offset="1" stopColor="#111722" /></linearGradient></defs>
          <rect width="512" height="512" fill="#090C13" /><rect x="48" y="48" width="416" height="416" rx="112" fill={`url(#${id}-surface)`} stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="4" />
          <circle cx="384" cy="130" r="34" fill="#7B6FF8" /><path d="M154 142H352V210H226V240H334V304H226V340H360V408H154V142Z" fill="#F5F7FB" />
        </svg>
      </div>
      <div className="genesis-copy" aria-live="polite" aria-atomic="true">
        <p className="genesis-stage">{stageNames[stage]}</p>
        <p className="genesis-wordmark">{stage === 'enter' ? 'ENTER YOUR UNIVERSE' : stage === 'welcome' ? 'WELCOME BACK TO EDEN' : 'EdenOS'}</p>
        <p className="genesis-whisper">{stage === 'genesis' ? 'A quiet beginning.' : stage === 'core' ? 'A little space. A world of possibility.' : stage === 'ready' ? 'Your universe, in balance.' : 'Make room for what matters.'}</p>
      </div>
    </div>
    <footer className="genesis-footer" aria-hidden="true"><span className="genesis-ready-dot" /><span>SPACE TO BECOME</span></footer>
  </section>, document.body)
}

export function GenesisBootSequence(props: { reduced: boolean; onFinish: () => void }) {
  return <VisualBoundary onFailure={props.onFinish}><Sequence {...props} /></VisualBoundary>
}
