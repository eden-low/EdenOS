import { useEffect, useState } from 'react'
import { AvatarSprite } from '../components/avatar/AvatarSprite'
import { resolveAvatar } from '../components/avatar/avatarRegistry'
import { wardrobeContent as copy, type WardrobeLook } from './aboutWardrobeContent'

// Keep the actual button mounted across selections so keyboard focus survives.
// Only resource callbacks/inner artwork change; URLs come from the registry.
export function AboutWardrobePreview({ look, blocked, onNext, describedBy }: {
  look: WardrobeLook; blocked: boolean; onNext: () => void; describedBy: string
}) {
  const visual = resolveAvatar(look.id)
  type Status = 'loading' | 'ready' | 'error'
  const resourceKey = `${visual.id}:${visual.kind === 'static-image' ? visual.asset.src : 'standing-atlas'}`
  const initialStatus = visual.kind === 'legacy-sprite' ? 'ready' : 'loading'
  const [asset, setAsset] = useState<{ key: string; status: Status; attempt: number }>({ key: resourceKey, status: initialStatus, attempt: 0 })
  // Adjust only on a changed resource, before committing its DOM. This keeps
  // the button/focus stable without a second, effect-driven reset render.
  if (asset.key !== resourceKey) setAsset({ key: resourceKey, status: initialStatus, attempt: 0 })
  const status = asset.key === resourceKey ? asset.status : initialStatus
  const attempt = asset.key === resourceKey ? asset.attempt : 0
  const setStatus = (status: Status) => setAsset(current => current.key === resourceKey ? { ...current, status } : current)
  useEffect(() => {
    if (visual.kind === 'legacy-sprite') return
    let active = true
    const image = new Image()
    const update = (status: Status) => { if (active) setAsset(current => current.key === resourceKey ? { ...current, status } : current) }
    const failed = () => update('error')
    image.onload = () => { void (async () => {
      try { await image.decode?.(); update('ready') } catch { failed() }
    })() }
    image.onerror = failed
    image.src = visual.asset.src
    return () => { active = false; image.onload = null; image.onerror = null }
  }, [visual, resourceKey, attempt])
  useEffect(() => {
    if (status !== 'error') return
    const retry = () => setAsset(current => current.key === resourceKey ? { ...current, status: 'loading', attempt: current.attempt + 1 } : current)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [status, resourceKey])
  const ready = status === 'ready' && visual.kind === 'static-image'
  const previewWindow = look.window
  return <div className="about-wardrobe-preview" data-selected-avatar={look.id}
    data-preview-avatar={ready ? visual.id : 'eden-default'} data-asset-state={status}>
    <button type="button" className="about-wardrobe-character" aria-label={copy.previewNext}
      aria-describedby={describedBy} disabled={blocked} onClick={onNext}>
      <span className="about-wardrobe-halo" aria-hidden="true" />
      <span className="about-wardrobe-art" aria-hidden="true" aria-busy={status === 'loading'} data-posture={ready ? visual.posture : undefined}
        onErrorCapture={() => setStatus('error')} onLoadCapture={() => { if (visual.kind === 'legacy-sprite') setStatus('ready') }}>
        {ready ? previewWindow ? <svg key={visual.id} viewBox={`${previewWindow.x} ${previewWindow.y} ${previewWindow.width} ${previewWindow.height}`} preserveAspectRatio="xMidYMid meet" focusable="false">
          <image href={visual.asset.src} width={visual.asset.width} height={visual.asset.height} onError={() => setStatus('error')} />
        </svg> : <img key={visual.id} src={visual.asset.src} width={visual.asset.width} height={visual.asset.height} alt="" draggable={false}
          decoding="async" onError={() => setStatus('error')} />
          : <AvatarSprite key={attempt} perched={false} attentive={false} still />}
      </span>
    </button>
    <p className="about-wardrobe-status">
      <span className="about-wardrobe-status-size" aria-hidden="true" inert>{copy.failed}</span>
      <span className="about-wardrobe-status-message" role="status" aria-live="polite" aria-atomic="true">
        {status === 'loading' ? copy.loading : status === 'error' ? visual.kind === 'legacy-sprite' ? copy.originalFailed : copy.failed : copy.hint}
      </span>
    </p>
  </div>
}
