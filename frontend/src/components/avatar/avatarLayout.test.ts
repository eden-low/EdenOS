import { describe, expect, it } from 'vitest'
import { avatarPlacement, overlaps, type AvatarViewport } from './avatarLayout'

const iphone: AvatarViewport = { left: 0, top: 0, width: 390, height: 844, safeTop: 47, safeBottom: 34, safeLeft: 0, safeRight: 0 }
const sheet = { left: 0, top: 420, width: 390, height: 424 }
describe('Avatar safe placement', () => {
  it('anchors Review at lower-left inside safe areas and beside the desktop sidebar', () => {
    const mobile = avatarPlacement({ ...iphone, left: 20, safeLeft: 47 }, null, [], { corner: 'left' })
    expect(mobile.left).toBe(20 + 47 + 12)
    expect(mobile.top).toBe(avatarPlacement(iphone, null).top)
    const desktop = avatarPlacement({ ...iphone, width: 1440, height: 1000 }, null, [], { corner: 'left' })
    expect(desktop.left).toBe(112)
    expect(avatarPlacement(iphone, null, [mobile], { corner: 'left' }).mode).not.toBe('bust')
  })
  it('reserves the mobile + space on Today only, retaining the home indicator inset elsewhere', () => {
    const today = avatarPlacement(iphone, null)
    const otherPage = avatarPlacement(iphone, null, [], { reserveCapture: false })
    expect(otherPage.top - today.top).toBe(76)
    expect(otherPage.top + otherPage.height).toBe(iphone.height - iphone.safeBottom - 20)
  })

  it('rests above mobile + and the home indicator, inside safe horizontal edges', () => {
    const avatar = avatarPlacement(iphone, null)
    expect(avatar.mode).toBe('full')
    expect(avatar.left + avatar.width).toBeLessThanOrEqual(378)
    expect(avatar.top + avatar.height).toBeLessThanOrEqual(844 - 34 - 96)
  })
  it('follows actual sheet height and desktop centered position', () => {
    const first = avatarPlacement(iphone, sheet)
    const taller = avatarPlacement(iphone, { ...sheet, top: 320, height: 524 })
    expect(taller.top - first.top).toBe(-100)
    const desktop = avatarPlacement({ ...iphone, width: 1440, height: 900 }, { left: 416, top: 260, width: 608, height: 400 })
    expect(desktop.left + desktop.width).toBeLessThan(1024 - 40)
  })
  it('hides when landscape, keyboard or enlarged sheet leaves no headroom', () => {
    expect(avatarPlacement({ ...iphone, width: 844, height: 390, safeLeft: 47, safeRight: 47 }, { ...sheet, top: 40, width: 608 }).mode).toBe('hidden')
    expect(avatarPlacement({ ...iphone, top: 190, height: 300 }, { ...sheet, top: 240 }).mode).toBe('hidden')
    expect(avatarPlacement(iphone, { ...sheet, top: 80 }).mode).toBe('hidden')
  })
  it('ignores scrolling controls in idle, but hides for protected idle controls and Capture controls', () => {
    const idle = avatarPlacement(iphone, null)
    const tallControl = { left: idle.left, top: idle.top, width: idle.width, height: 40 }
    expect(avatarPlacement(iphone, null, [tallControl])).toEqual(idle)
    expect(avatarPlacement(iphone, null, [idle])).toEqual(idle)
    expect(avatarPlacement(iphone, null, [], { idleObstacles: [tallControl] }).mode).toBe('hidden')
    const close = { left: 330, top: sheet.top + 20, width: 40, height: 40 }
    expect(overlaps(avatarPlacement(iphone, sheet), close)).toBe(false)
    expect(avatarPlacement(iphone, sheet, [avatarPlacement(iphone, sheet)]).mode).toBe('hidden')
  })
  it('never selects a bust without a sheet, across viewport sizes and scrolling obstacles', () => {
    for (const width of [280, 320, 390, 844, 1440]) {
      for (const height of [240, 300, 390, 740, 844, 1000]) {
        const view = { ...iphone, width, height }
        expect(avatarPlacement(view, null).mode).not.toBe('bust')
        for (let top = -100; top < height + 100; top += 20) {
          const control = { left: width - 120, top, width: 108, height: 36 }
          const result = avatarPlacement(view, null, [control])
          expect(result.mode).not.toBe('bust')
          expect(result).toEqual(avatarPlacement(view, null))
        }
      }
    }
  })
  it('accounts for panned visual viewport and landscape side insets', () => {
    const result = avatarPlacement({ ...iphone, top: 100, left: 25, safeRight: 47 }, null)
    expect(result.left + result.width).toBe(25 + 390 - 47 - 12)
    expect(result.top).toBeGreaterThan(100 + 47)
  })
})
