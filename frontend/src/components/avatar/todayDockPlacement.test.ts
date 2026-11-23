import { describe, expect, it } from 'vitest'
import { todayDockPlacement } from './todayDockPlacement'
const view = { left: 0, top: 0, width: 390, height: 844, safeTop: 0, safeRight: 0, safeBottom: 0, safeLeft: 0 }
const dock = { left: 270, top: 100, width: 88, height: 164 }
describe('Today document landing safety', () => {
  it('accepts actual DOMRect measurements whose coordinates are not enumerable', () => {
    const rect = new DOMRect(270, 100, 88, 164)
    expect(todayDockPlacement(view, rect)).toMatchObject({ left: 270, top: 100, width: 88, height: 164, mode: 'full' })
  })
  it('follows its page home rather than pinning to a viewport corner', () => {
    expect(todayDockPlacement(view, dock)).toMatchObject({ ...dock, mode: 'full' })
    expect(todayDockPlacement(view, { ...dock, top: 40 }).top).toBe(40)
  })
  it('hides when its home scrolls outside the safe viewport instead of overlapping content elsewhere', () => {
    expect(todayDockPlacement(view, { ...dock, top: -10 }).mode).toBe('hidden')
    expect(todayDockPlacement(view, { ...dock, top: 680 }).mode).toBe('hidden')
  })
  it('does not hide a safe document home merely because it reaches the removed plus-button zone', () => {
    expect(todayDockPlacement(view, { ...dock, top: 640 }).mode).toBe('full')
    expect(todayDockPlacement({ ...view, safeBottom: 34 }, { ...dock, top: 640 }).mode).toBe('hidden')
  })
  it('keeps safe-area insets, the home indicator and fixed/focused obstacles authoritative', () => {
    expect(todayDockPlacement({ ...view, safeRight: 34 }, dock).mode).toBe('hidden')
    expect(todayDockPlacement(view, dock, [{ left: 280, top: 120, width: 40, height: 40 }]).mode).toBe('hidden')
    expect(todayDockPlacement({ ...view, height: 220 }, dock).mode).toBe('hidden')
  })
})
