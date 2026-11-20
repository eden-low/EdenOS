import { useEffect, useState } from 'react'
import { AvatarSprite } from './AvatarSprite'
import { resolveAvatar, type AvatarId, type StaticAvatar } from './avatarRegistry'

interface Pose { perched: boolean; attentive: boolean; still: boolean }
export function AvatarAppearance({ avatarId, ...pose }: Pose & { avatarId: AvatarId }) {
  const visual = resolveAvatar(avatarId)
  // Only the accepted original atlas can represent the Capture perch.
  if (visual.kind === 'legacy-sprite' || pose.perched) return <div className="eden-avatar-appearance" data-avatar-id="eden-default" data-avatar-requested={avatarId} data-avatar-mode="sprite" data-asset-state="ready"><AvatarSprite {...pose} /></div>
  return <StaticAppearance key={`${visual.id}:${visual.asset.src}`} visual={visual} pose={pose} />
}

function StaticAppearance({ visual, pose }: { visual: StaticAvatar; pose: Pose }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
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
  }, [visual.asset.src])

  const ready = status === 'ready'
  return <div className="eden-avatar-appearance" data-avatar-id={ready ? visual.id : 'eden-default'} data-avatar-requested={visual.id}
    data-avatar-mode={ready ? 'static-prototype' : 'sprite'} data-asset-state={status}>
    {ready ? <img className="eden-avatar-static-image" src={visual.asset.src} width={visual.asset.width} height={visual.asset.height}
      alt="" draggable={false} decoding="async" onError={() => setStatus('error')}
      style={{ objectPosition: `${visual.asset.footAnchor.x * 100}% ${visual.asset.footAnchor.y * 100}%` }} />
      : <AvatarSprite {...pose} />}
  </div>
}
