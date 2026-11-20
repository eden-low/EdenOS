import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PrivacyLockContext } from '../../privacy/privacyLockContext'
import { AvatarCaptureContext, type CaptureAnchor } from './AvatarCaptureContext'
import { AvatarSprite } from './AvatarSprite'
import { avatarTransition } from './avatarMachine'
import { avatarPlacement, type AvatarPlacement, type AvatarRect } from './avatarLayout'
import './avatar.css'

const controlSelector = 'button, a, input, select, textarea, [role="button"], [role="alert"], [role="status"]'
function rectOf(element: Element): AvatarRect { return element.getBoundingClientRect() }

export function EdenAvatarProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [anchor, setAnchor] = useState<CaptureAnchor | null>(null)
  const publish = useCallback((next: CaptureAnchor | null, owner: symbol) => {
    setAnchor((current) => next ?? (current?.owner === owner ? null : current))
  }, [])
  return <AvatarCaptureContext.Provider value={publish}>
    {children}
    {enabled && <EdenAvatar anchor={anchor} />}
  </AvatarCaptureContext.Provider>
}

function EdenAvatar({ anchor }: { anchor: CaptureAnchor | null }) {
  const { locked } = useContext(PrivacyLockContext)
  const [state, dispatch] = useReducer(avatarTransition, 'idle')
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const element = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState<AvatarPlacement>({ left: 0, top: 0, width: 0, height: 0, mode: 'hidden' })
  const [occluded, setOccluded] = useState(false)
  const open = Boolean(anchor)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  useLayoutEffect(() => { dispatch(open ? 'open' : 'close') }, [open])
  useEffect(() => {
    const event = state === 'attentive' ? 'noticed' : state === 'moveToSheet' ? 'arrived' : state === 'returning' ? 'home' : null
    if (!event) return
    const timer = window.setTimeout(() => dispatch(event), reduced ? 0 : state === 'attentive' ? 150 : 360)
    return () => window.clearTimeout(timer)
  }, [state, reduced])

  useLayoutEffect(() => {
    let frame = 0
    let disposed = false
    let dirty = true
    let controls: Element[] = []
    const invalidate = () => { dirty = true; if (!frame) frame = requestAnimationFrame(measure) }
    function measure() {
      frame = 0
      if (disposed || !probe.current) return
      const visual = window.visualViewport
      const style = getComputedStyle(probe.current)
      const viewport = {
        left: visual?.offsetLeft ?? 0, top: visual?.offsetTop ?? 0,
        width: visual?.width ?? window.innerWidth, height: visual?.height ?? window.innerHeight,
        safeTop: parseFloat(style.paddingTop) || 0, safeRight: parseFloat(style.paddingRight) || 0,
        safeBottom: parseFloat(style.paddingBottom) || 0, safeLeft: parseFloat(style.paddingLeft) || 0,
      }
      if (dirty) {
        controls = Array.from(document.querySelectorAll(controlSelector)).filter((control) => !element.current?.contains(control))
        dirty = false
      }
      const anotherDialog = Array.from(document.querySelectorAll('[role="dialog"][data-state="open"], [role="alertdialog"]'))
        .some((dialog) => dialog !== anchor?.sheet)
      setOccluded(anotherDialog || Boolean(document.querySelector('.genesis-boot-screen')))
      const obstacles = controls.filter((control) => {
        if (anchor && !anchor.sheet.contains(control)) return false
        // Capture's top controls are measured too; feet/hands must never cover them.
        const styles = getComputedStyle(control)
        return styles.visibility !== 'hidden' && styles.display !== 'none' && control.getClientRects().length > 0
      }).map(rectOf)
      const next = avatarPlacement(viewport, anchor?.sheet.isConnected ? rectOf(anchor.sheet) : null, obstacles)
      setPlacement((current) => {
        // Preserve the last safe coordinates while hidden, so a later return never flies from (0, 0).
        if (next.mode === 'hidden') return current.mode === 'hidden' ? current : { ...current, mode: 'hidden' }
        return current.mode === next.mode && Math.abs(current.left - next.left) < 0.25 && Math.abs(current.top - next.top) < 0.25 && current.width === next.width ? current : next
      })
      // Rects, unlike ResizeObserver alone, also include animated transforms and height transitions.
      if (anchor) frame = requestAnimationFrame(measure)
    }
    const observer = new MutationObserver(invalidate)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'hidden'] })
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(invalidate)
    resize?.observe(document.documentElement)
    if (anchor) resize?.observe(anchor.sheet)
    window.addEventListener('resize', invalidate)
    window.addEventListener('scroll', invalidate, true)
    window.visualViewport?.addEventListener('resize', invalidate)
    window.visualViewport?.addEventListener('scroll', invalidate)
    invalidate()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect(); resize?.disconnect()
      window.removeEventListener('resize', invalidate)
      window.removeEventListener('scroll', invalidate, true)
      window.visualViewport?.removeEventListener('resize', invalidate)
      window.visualViewport?.removeEventListener('scroll', invalidate)
    }
  }, [anchor])

  const visible = !locked && !occluded && !anchor?.suspended && placement.mode !== 'hidden'
  // Layout/collisions can hide the standing avatar; only an open Capture may select its perch.
  const perched = open && (state === 'perched' || reduced)
  const style = useMemo(() => ({ left: placement.left, top: placement.top, width: placement.width, height: placement.height }), [placement])
  return createPortal(<>
    <div ref={probe} className="eden-avatar-safe-area" aria-hidden="true" />
    <div ref={element} className="eden-avatar" aria-hidden="true" inert data-state={state} data-sheet={open || undefined}
      data-reduced={reduced || undefined} data-visible={visible} style={style}>
      <AvatarSprite perched={perched} attentive={state === 'attentive'} still={reduced || !visible} />
    </div>
  </>, document.body)
}
