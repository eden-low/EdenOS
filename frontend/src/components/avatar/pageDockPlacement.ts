import { overlaps, type AvatarPlacement, type AvatarRect, type AvatarViewport } from './avatarLayout'

// No corner fallback: missing/unsafe homes must never cover the page's data.
export function pageDockPlacement(view: AvatarViewport, dock: AvatarRect | null, obstacles: AvatarRect[] = []): AvatarPlacement {
  if (!dock) return { left: 0, top: 0, width: 0, height: 0, mode: 'hidden' }
  const position = { left: dock.left, top: dock.top, width: dock.width, height: dock.height }
  const hidden: AvatarPlacement = { ...position, mode: 'hidden' }
  if (view.width < 280 || view.height < 240 || dock.width <= 0 || dock.height <= 0) return hidden
  if (dock.left < view.left + view.safeLeft + 12 || dock.left + dock.width > view.left + view.width - view.safeRight - 12 ||
      dock.top < view.top + view.safeTop + 12 || dock.top + dock.height > view.top + view.height - view.safeBottom - 20 ||
      obstacles.some(rect => overlaps(dock, rect))) return hidden
  return { ...position, mode: 'full' }
}
