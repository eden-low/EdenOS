// Only derived, purpose-made animation art belongs here; never import reference originals.
import atlas from './assets/eden-base-v1.webp'

export function AvatarSprite({ perched, attentive, still }: { perched: boolean; attentive: boolean; still: boolean }) {
  const row = perched ? 512 : 0
  return <svg aria-hidden="true" className="eden-avatar-art" data-attentive={attentive || undefined} data-still={still || undefined}
    viewBox={perched ? '0 512 512 512' : '144 0 256 512'} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <svg className="eden-avatar-eyes-open" x="0" y={row} width="512" height="512" viewBox={`0 ${row} 512 512`} overflow="hidden">
      <image href={atlas} width="1024" height="1024" />
    </svg>
    <svg className="eden-avatar-eyes-closed" x="0" y={row} width="512" height="512" viewBox={`512 ${row} 512 512`} overflow="hidden">
      <image href={atlas} width="1024" height="1024" />
    </svg>
  </svg>
}
