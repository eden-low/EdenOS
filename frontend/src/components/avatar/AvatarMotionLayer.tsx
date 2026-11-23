import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createAvatarMotion, type AvatarMotionDefinition } from './avatarMotion'

// No page/data ownership here. The caller grants motion to Expenses/Records/Review and
// supplies its existing reduced-motion / occlusion / viewport pause signal.
export default function AvatarMotionLayer({ definition, paused }: { definition: AvatarMotionDefinition; paused: boolean }) {
  const controller = useMemo(() => createAvatarMotion(definition), [definition])
  const frame = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const canLoad = !paused && visible
  useEffect(() => {
    if (!canLoad || status !== 'loading') return
    let active = true
    const image = new Image()
    const failed = () => { if (active) setStatus('error') }
    image.onload = () => { void (async () => {
      try { await image.decode?.(); if (active) setStatus('ready') } catch { failed() }
    })() }
    image.onerror = failed
    image.src = definition.atlas.src
    return () => { active = false; image.onload = null; image.onerror = null }
  }, [definition.atlas.src, canLoad, status, attempt])
  useEffect(() => {
    if (status !== 'error') return
    const retry = () => { setStatus('loading'); setAttempt(value => value + 1) }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [status])

  const canPlay = !paused && status === 'ready'
  useEffect(() => {
    const restore = () => {
      const next = document.visibilityState !== 'hidden'
      // Stop immediately in the event, before React can be frozen/BF-cached.
      controller.setActive(canPlay && next);setVisible(next)
    }
    const pause = () => { controller.setActive(false);setVisible(false) }
    controller.setActive(canPlay && visible && document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', restore)
    document.addEventListener('freeze', pause)
    document.addEventListener('resume', restore)
    window.addEventListener('pagehide', pause)
    window.addEventListener('pageshow', restore)
    return () => {
      controller.setActive(false)
      document.removeEventListener('visibilitychange', restore)
      document.removeEventListener('freeze', pause)
      document.removeEventListener('resume', restore)
      window.removeEventListener('pagehide', pause)
      window.removeEventListener('pageshow', restore)
    }
  }, [controller, canPlay, visible])

  const active = canPlay && visible && frame.active
  const atlas = definition.atlas
  return <div className="eden-avatar-motion-layer" aria-hidden="true" data-motion-active={active}
    data-motion-asset={status} data-motion-action={active ? frame.action : 'idle'} data-motion-frame={active ? frame.frame + 1 : 1}>
    {active && <svg className="eden-avatar-motion-art" focusable="false" preserveAspectRatio="xMidYMid meet"
      viewBox={`${frame.frame % atlas.columns * atlas.cellWidth} ${Math.floor(frame.frame / atlas.columns) * atlas.cellHeight} ${atlas.cellWidth} ${atlas.cellHeight}`}>
      <image href={atlas.src} width={atlas.width} height={atlas.height} onError={() => setStatus('error')} />
    </svg>}
  </div>
}
