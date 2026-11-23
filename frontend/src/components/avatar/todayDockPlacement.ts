import { overlaps, type AvatarPlacement, type AvatarRect, type AvatarViewport } from './avatarLayout'

// An in-document home for Today only. Capture still owns the original placement path.
export function todayDockPlacement(view: AvatarViewport, dock: AvatarRect, obstacles: AvatarRect[] = []): AvatarPlacement {
  // DOMRect properties are prototype getters, so copy coordinates explicitly.
  const position = { left: dock.left, top: dock.top, width: dock.width, height: dock.height }
  const hidden: AvatarPlacement = { ...position, mode: 'hidden' }
  // No floating Capture remains; keep only the normal content/safe-area margin.
  const bottomReserve = 20
  if (view.width < 280 || view.height < 240 || dock.width <= 0 || dock.height <= 0) return hidden
  if (dock.left < view.left + view.safeLeft + 12 || dock.left + dock.width > view.left + view.width - view.safeRight - 12 ||
      dock.top < view.top + view.safeTop + 12 || dock.top + dock.height > view.top + view.height - view.safeBottom - bottomReserve ||
      obstacles.some(rect => overlaps(dock, rect))) return hidden
  return { ...position, mode: 'full' }
}
