import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { AppPage } from '../layout/Navigation'
import { AvatarCaptureContext, type CaptureAnchor } from './AvatarCaptureContext'
import { AvatarAppearance } from './AvatarAppearance'
import { selectAvatarForPage } from './avatarPageSelection'
import { useExerciseAvatarEntry } from './useExerciseAvatarEntry'
import type { AvatarId } from './avatarRegistry'
import { avatarTransition } from './avatarMachine'
import { avatarPlacement, type AvatarPlacement, type AvatarRect } from './avatarLayout'
import { isIdleAvatarObstacle } from './avatarObstacles'
import './avatar.css'

const controlSelector = 'button, a, input, select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="slider"], [role="checkbox"], [role="switch"], [role="combobox"], [role="spinbutton"], [role="menuitem"], [contenteditable="true"], video[controls], audio[controls]'
function rectOf(element: Element): AvatarRect { return element.getBoundingClientRect() }

export function EdenAvatarProvider({ enabled, page = 'today', children }: { enabled: boolean; page?: AppPage; children: ReactNode }) {
  const [capture, setCapture] = useState<{ page: AppPage; anchor: CaptureAnchor } | null>(null)
  const publish = useCallback((next: CaptureAnchor | null, owner: symbol) => {
    setCapture((current) => next ? { page, anchor: next } : current?.anchor.owner === owner ? null : current)
  }, [page])
  // Only Today owns a perch. Other pages' Capture dialogs remain ordinary occluders.
  const anchor = page === 'today' && capture?.page === page ? capture.anchor : null
  const exerciseForm = useExerciseAvatarEntry(page)
  const avatarId = page === 'exercise' && !exerciseForm ? null : selectAvatarForPage(page, exerciseForm ?? undefined)
  return <AvatarCaptureContext.Provider value={publish}>
    {children}
    {enabled && avatarId && <EdenAvatar key={`avatar:${page}`} avatarId={avatarId} anchor={anchor} corner={page === 'review' ? 'left' : 'right'} reserveCapture={page === 'today'} />}
  </AvatarCaptureContext.Provider>
}

function EdenAvatar({ avatarId, anchor, corner, reserveCapture }: { avatarId: AvatarId; anchor: CaptureAnchor | null; corner: 'left' | 'right'; reserveCapture: boolean }) {
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
    let nativeMediaFullscreen = false
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
      setOccluded(anotherDialog || Boolean(document.querySelector('.genesis-boot-screen')) || Boolean(document.fullscreenElement) || nativeMediaFullscreen)
      const obstacles = controls.filter((control) => {
        if (anchor && !anchor.sheet.contains(control)) return false
        if (!anchor && !isIdleAvatarObstacle(control)) return false
        // Capture's top controls are measured too; feet/hands must never cover them.
        const styles = getComputedStyle(control)
        return styles.visibility !== 'hidden' && styles.display !== 'none' && control.getClientRects().length > 0
      }).map(rectOf)
      const next = avatarPlacement(viewport, anchor?.sheet.isConnected ? rectOf(anchor.sheet) : null, anchor ? obstacles : [], { corner, reserveCapture, idleObstacles: anchor ? [] : obstacles })
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
    document.addEventListener('focusin', invalidate)
    document.addEventListener('focusout', invalidate)
    const enterMedia = () => { nativeMediaFullscreen = true; invalidate() }
    const exitMedia = () => { nativeMediaFullscreen = false; invalidate() }
    document.addEventListener('fullscreenchange', invalidate)
    document.addEventListener('webkitbeginfullscreen', enterMedia, true)
    document.addEventListener('webkitendfullscreen', exitMedia, true)
    window.visualViewport?.addEventListener('resize', invalidate)
    window.visualViewport?.addEventListener('scroll', invalidate)
    invalidate()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect(); resize?.disconnect()
      window.removeEventListener('resize', invalidate)
      window.removeEventListener('scroll', invalidate, true)
      document.removeEventListener('focusin', invalidate)
      document.removeEventListener('focusout', invalidate)
      document.removeEventListener('fullscreenchange', invalidate)
      document.removeEventListener('webkitbeginfullscreen', enterMedia, true)
      document.removeEventListener('webkitendfullscreen', exitMedia, true)
      window.visualViewport?.removeEventListener('resize', invalidate)
      window.visualViewport?.removeEventListener('scroll', invalidate)
    }
  }, [anchor, corner, reserveCapture])

  const visible = !occluded && !anchor?.suspended && placement.mode !== 'hidden'
  // Layout/collisions can hide the standing avatar; only an open Capture may select its perch.
  const perched = open && (state === 'perched' || reduced)
  const style = useMemo(() => ({ left: placement.left, top: placement.top, width: placement.width, height: placement.height }), [placement])
  return createPortal(<>
    <div ref={probe} className="eden-avatar-safe-area" aria-hidden="true" />
    <div ref={element} className="eden-avatar" aria-hidden="true" inert data-state={state} data-sheet={open || undefined}
      data-reduced={reduced || undefined} data-visible={visible} style={style}>
      <AvatarAppearance avatarId={avatarId} faceInward={corner === 'left'} perched={perched} attentive={state === 'attentive'} still={reduced || !visible} />
    </div>
  </>, document.body)
}
