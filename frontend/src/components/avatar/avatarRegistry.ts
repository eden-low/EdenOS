import treasurerArt from './assets/eden-treasurer-abacus-static.webp'
import archivistArt from './assets/eden-archivist-clipboard-static.webp'
import reflectorArt from './assets/eden-reflector-journal-static.webp'

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
  prototype: '4A-static' | '4B-static'
  nativeFacing: AvatarFacing
  asset: {
    src: string; width: number; height: number
    cssFrame: { width: number; height: number }
    footAnchor: { x: number; y: number }
  }
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
  },
  'eden-swim': { id: 'eden-swim', label: 'Swim Eden', status: 'planned' },
  'eden-boxing': { id: 'eden-boxing', label: 'Boxing Eden', status: 'planned' },
  'eden-archivist': {
    id: 'eden-archivist', label: 'Archivist Eden', status: 'ready', kind: 'static-image', prototype: '4B-static', blink: false, capturePerch: false,
    nativeFacing: 'left',
    asset: { src: archivistArt, width: 264, height: 492, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
  },
  'eden-reflector': {
    id: 'eden-reflector', label: 'Reflector Eden', status: 'ready', kind: 'static-image', prototype: '4B-static', nativeFacing: 'right', blink: false, capturePerch: false,
    asset: { src: reflectorArt, width: 352, height: 656, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
  },
  'eden-watching': { id: 'eden-watching', label: 'Watching Eden', status: 'planned' },
  'eden-tarot': { id: 'eden-tarot', label: 'Tarot Eden', status: 'planned' },
  'eden-iching': { id: 'eden-iching', label: 'I Ching Eden', status: 'planned' },
  'eden-bazi': { id: 'eden-bazi', label: 'BaZi Eden', status: 'planned' },
  'eden-astrology': { id: 'eden-astrology', label: 'Astrology Eden', status: 'planned' },
  'eden-ziwei': { id: 'eden-ziwei', label: 'Zi Wei Eden', status: 'planned' },
  'eden-ai-explorer': { id: 'eden-ai-explorer', label: 'AI Explorer Eden', status: 'planned' },
}

// Planned IDs have no asset URL and cannot instantiate a loader.
export function resolveAvatar(id: AvatarId): RenderableAvatar {
  const definition = avatarRegistry[id]
  return definition?.status === 'ready' ? definition : original
}
