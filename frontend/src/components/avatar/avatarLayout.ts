export interface AvatarRect { left: number; top: number; width: number; height: number }
export interface AvatarViewport extends AvatarRect {
  safeTop: number; safeRight: number; safeBottom: number; safeLeft: number
}
export interface AvatarPlacement extends AvatarRect { mode: 'full' | 'bust' | 'hidden' }
export interface AvatarPlacementOptions { corner?: 'left' | 'right'; reserveCapture?: boolean; idleObstacles?: AvatarRect[] }
const hidden: AvatarPlacement = { left: 0, top: 0, width: 0, height: 0, mode: 'hidden' }
export function overlaps(a: AvatarRect, b: AvatarRect) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top
}

export function avatarPlacement(view: AvatarViewport, sheet: AvatarRect | null, obstacles: AvatarRect[] = [], { corner = 'right', reserveCapture = true, idleObstacles = [] }: AvatarPlacementOptions = {}): AvatarPlacement {
  const left = view.left + view.safeLeft + 12
  const right = view.left + view.width - view.safeRight - 12
  const top = view.top + view.safeTop + 12
  const bottom = view.top + view.height - view.safeBottom - (view.width < 1024 && reserveCapture ? 96 : 20)
  if (view.width < 280 || view.height < 240) return hidden
  if (sheet) {
    // The sprite's hand baseline sits on the actual edge, entirely outside the form.
    const width = 106
    const height = 106
    const x = Math.min(right - width, sheet.left + sheet.width - width - 76)
    const y = sheet.top - height + 3
    const result: AvatarPlacement = { left: x, top: y, width, height, mode: 'bust' }
    if (x < left || y < top || sheet.top > view.top + view.height || sheet.top < view.top || obstacles.some((rect) => overlaps(result, rect))) return hidden
    return result
  }
  // Idle always uses the standing frame at its normal proportions. The bust belongs
  // exclusively to the Capture edge; hide if standing cannot fit safely.
  const width = 88
  const height = 164
  // Leave room for the existing desktop sidebar at the lower-left corner.
  const x = corner === 'left' ? left + (view.width >= 1024 ? 100 : 0) : right - width
  const result: AvatarPlacement = { left: x, top: bottom - height, width, height, mode: 'full' }
  return result.top >= top && !idleObstacles.some((rect) => overlaps(result, rect)) ? result : hidden
}
