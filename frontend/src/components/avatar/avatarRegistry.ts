import treasurerArt from './assets/eden-treasurer-abacus-static.webp'
import archivistArt from './assets/eden-archivist-clipboard-static.webp'
import reflectorArt from './assets/eden-reflector-journal-static.webp'
import watchingArt from './assets/eden-watching-prone-static.webp'
import swimArt from './assets/eden-swim-static.webp'
import boxingArt from './assets/eden-boxing-static.webp'
import tarotArt from './assets/eden-tarot-static.webp'
import ichingArt from './assets/eden-iching-static.webp'
import baziArt from './assets/eden-bazi-static.webp'
import astrologyArt from './assets/eden-astrology-static.webp'
import ziweiArt from './assets/eden-ziwei-static.webp'
import aiExplorerArt from './assets/eden-ai-explorer-static.webp'
import { treasurerMotion } from './treasurerMotion'
import { archivistMotion } from './archivistMotion'
import { reflectorMotion } from './reflectorMotion'
import type { AvatarMotionDefinition } from './avatarMotion'

export const avatarIds = [
  'eden-default', 'eden-treasurer', 'eden-swim', 'eden-boxing', 'eden-archivist',
  'eden-reflector', 'eden-watching', 'eden-tarot', 'eden-iching', 'eden-bazi',
  'eden-astrology', 'eden-ziwei', 'eden-ai-explorer',
] as const
export type AvatarId = typeof avatarIds[number]

interface AvatarIdentity { id: AvatarId; label: string }
export type AvatarFacing = 'left' | 'right'
interface PlannedAvatar extends AvatarIdentity { status: 'planned' }
interface LegacyAvatar extends AvatarIdentity {
  status: 'ready'; kind: 'legacy-sprite'; blink: true; capturePerch: true
  nativeFacing: AvatarFacing
}
export interface StaticAvatar extends AvatarIdentity {
  status: 'ready'; kind: 'static-image'; blink: false; capturePerch: false
  prototype: '4A-static' | '4B-static' | '4C-static' | '4D-static'
  nativeFacing: AvatarFacing
  asset: {
    src: string; width: number; height: number
    cssFrame: { width: number; height: number }
    footAnchor: { x: number; y: number }
  }
  posture?: 'standing' | 'prone'
  // Static base stays available to the About wardrobe and Reduced Motion.
  motion?: AvatarMotionDefinition
}
export type RenderableAvatar = LegacyAvatar | StaticAvatar
export type AvatarDefinition = PlannedAvatar | RenderableAvatar

const original: LegacyAvatar = { id: 'eden-default', label: 'Eden', status: 'ready', kind: 'legacy-sprite', nativeFacing: 'left', blink: true, capturePerch: true }
export const avatarRegistry: Readonly<Record<AvatarId, AvatarDefinition>> = {
  'eden-default': original,
  'eden-treasurer': {
    id: 'eden-treasurer', label: 'Treasurer Eden · Abacus', status: 'ready', kind: 'static-image', prototype: '4A-static', blink: false, capturePerch: false,
    nativeFacing: 'left',
    asset: { src: treasurerArt, width: 352, height: 656, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
    motion: treasurerMotion,
  },
  'eden-swim': {
    id: 'eden-swim', label: 'Swim Eden', status: 'ready', kind: 'static-image', prototype: '4C-static', nativeFacing: 'right', blink: false, capturePerch: false,
    asset: { src: swimArt, width: 352, height: 656, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
  },
  'eden-boxing': {
    id: 'eden-boxing', label: 'Boxing Eden', status: 'ready', kind: 'static-image', prototype: '4C-static', nativeFacing: 'left', blink: false, capturePerch: false,
    asset: { src: boxingArt, width: 352, height: 656, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
  },
  'eden-archivist': {
    id: 'eden-archivist', label: 'Archivist Eden', status: 'ready', kind: 'static-image', prototype: '4B-static', blink: false, capturePerch: false,
    nativeFacing: 'left',
    asset: { src: archivistArt, width: 264, height: 492, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
    motion: archivistMotion,
  },
  'eden-reflector': {
    id: 'eden-reflector', label: 'Reflector Eden', status: 'ready', kind: 'static-image', prototype: '4B-static', nativeFacing: 'right', blink: false, capturePerch: false,
    asset: { src: reflectorArt, width: 352, height: 656, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
    motion: reflectorMotion,
  },
  'eden-watching': {
    id: 'eden-watching', label: 'Watching Eden', status: 'ready', kind: 'static-image', prototype: '4B-static', nativeFacing: 'left', posture: 'prone', blink: false, capturePerch: false,
    asset: { src: watchingArt, width: 352, height: 656, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
  },
  'eden-tarot': cosmosStatic('eden-tarot', 'Tarot Eden', tarotArt),
  'eden-iching': cosmosStatic('eden-iching', 'I Ching Eden', ichingArt),
  'eden-bazi': cosmosStatic('eden-bazi', 'BaZi Eden', baziArt),
  'eden-astrology': cosmosStatic('eden-astrology', 'Astrology Eden', astrologyArt),
  'eden-ziwei': cosmosStatic('eden-ziwei', 'Zi Wei Eden', ziweiArt),
  'eden-ai-explorer': cosmosStatic('eden-ai-explorer', 'AI Explorer Eden', aiExplorerArt, 'left'),
}

function cosmosStatic(id: AvatarId, label: string, src: string, nativeFacing: AvatarFacing = 'right'): StaticAvatar {
  return { id, label, status: 'ready', kind: 'static-image', prototype: '4D-static', nativeFacing, blink: false, capturePerch: false,
    asset: { src, width: 352, height: 656, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } } }
}

// Planned IDs have no asset URL and cannot instantiate a loader.
export function resolveAvatar(id: AvatarId): RenderableAvatar {
  const definition = avatarRegistry[id]
  return definition?.status === 'ready' ? definition : original
}
