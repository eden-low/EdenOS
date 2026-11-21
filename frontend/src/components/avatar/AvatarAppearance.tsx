import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { AvatarSprite } from './AvatarSprite'
import { resolveAvatar, type AvatarFacing, type AvatarId, type StaticAvatar } from './avatarRegistry'

interface Pose { perched: boolean; attentive: boolean; still: boolean }
const AvatarMotionLayer = lazy(() => import('./AvatarMotionLayer'))
export function AvatarAppearance({ avatarId, faceInward = false, motionEnabled = false, ...pose }: Pose & { avatarId: AvatarId; faceInward?: boolean; motionEnabled?: boolean }) {
  const visual = resolveAvatar(avatarId)
  // Only the accepted original atlas can represent the Capture perch.
  if (visual.kind === 'legacy-sprite' || pose.perched) return <Facing nativeFacing={resolveAvatar('eden-default').nativeFacing} faceInward={faceInward}><div className="eden-avatar-appearance" data-avatar-id="eden-default" data-avatar-requested={avatarId} data-avatar-mode="sprite" data-asset-state="ready"><AvatarSprite {...pose} /></div></Facing>
  return <StaticAppearance key={`${visual.id}:${visual.asset.src}`} visual={visual} pose={pose} faceInward={faceInward} motionEnabled={motionEnabled} />
}

// Orientation follows the actual pixels, including the default during loading
// and any failure. The layout corner never mirrors the entire page/portal.
function Facing({ nativeFacing, faceInward, children }: { nativeFacing: AvatarFacing; faceInward: boolean; children: ReactNode }) {
  return <div className="eden-avatar-facing" data-mirrored={faceInward && nativeFacing === 'left' || undefined}>{children}</div>
}

function StaticAppearance({ visual, pose, faceInward, motionEnabled }: { visual: StaticAvatar; pose: Pose; faceInward: boolean; motionEnabled: boolean }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    const image = new Image()
    const failed = () => { if (active) setStatus('error') }
    const loaded = async () => {
      try { await image.decode?.(); if (active) setStatus('ready') } catch { failed() }
    }
    image.onload = () => { void loaded() }
    image.onerror = failed
    image.src = visual.asset.src
    return () => { active = false; image.onload = null; image.onerror = null }
  }, [visual.asset.src, attempt])
  useEffect(() => {
    if (status !== 'error') return
    const retry = () => { setStatus('loading'); setAttempt(value => value + 1) }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [status])

  const ready = status === 'ready'
  return <Facing nativeFacing={ready ? visual.nativeFacing : resolveAvatar('eden-default').nativeFacing} faceInward={faceInward}><div className="eden-avatar-appearance" data-motion-capable={motionEnabled && !!visual.motion || undefined} data-avatar-id={ready ? visual.id : 'eden-default'} data-avatar-requested={visual.id}
    data-avatar-mode={ready ? motionEnabled && visual.motion && !pose.still ? 'motion-prototype' : 'static-prototype' : 'sprite'} data-asset-state={status} data-avatar-posture={ready && visual.posture === 'prone' ? 'prone' : undefined}>
    {ready ? <>
      {motionEnabled && visual.motion && <Suspense fallback={null}><AvatarMotionLayer definition={visual.motion} paused={pose.still} /></Suspense>}
      <img className="eden-avatar-static-image" src={visual.asset.src} width={visual.asset.width} height={visual.asset.height}
      alt="" draggable={false} decoding="async" onError={() => setStatus('error')}
      style={{ objectPosition: `${visual.asset.footAnchor.x * 100}% ${visual.asset.footAnchor.y * 100}%` }} /></>
      : <AvatarSprite {...pose} />}
  </div></Facing>
}
