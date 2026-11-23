import { describe, expect, it } from 'vitest'
import { pageDockPlacement } from './pageDockPlacement'
const view = { left: 0, top: 0, width: 390, height: 844, safeTop: 0, safeRight: 0, safeBottom: 0, safeLeft: 0 }
const dock = new DOMRect(270, 100, 88, 164)
describe('C1 document home safety', () => {
  it('waits safely for lazy/missing homes instead of falling back to a data corner', () => {
    expect(pageDockPlacement(view, null).mode).toBe('hidden')
    expect(pageDockPlacement(view, new DOMRect(0, 0, 0, 0)).mode).toBe('hidden')
  })
  it('copies DOMRect getters and keeps the original standing dimensions', () => {
    expect(pageDockPlacement(view, dock)).toEqual({ left: 270, top: 100, width: 88, height: 164, mode: 'full' })
  })
  it('hides partial/outside homes on scroll or keyboard resize without relocating', () => {
    expect(pageDockPlacement(view, new DOMRect(270, -5, 88, 164)).mode).toBe('hidden')
    expect(pageDockPlacement({ ...view, height: 240 }, dock).mode).toBe('hidden')
    expect(pageDockPlacement(view, new DOMRect(270, 680, 88, 164))).toMatchObject({ left: 270, top: 680, mode: 'hidden' })
  })
  it('respects horizontal/vertical safe areas, focused/fixed obstacles and the Review left side', () => {
    expect(pageDockPlacement({ ...view, safeRight: 34 }, dock).mode).toBe('hidden')
    expect(pageDockPlacement({ ...view, safeTop: 100 }, dock).mode).toBe('hidden')
    expect(pageDockPlacement(view, dock, [new DOMRect(270, 100, 44, 44)]).mode).toBe('hidden')
    expect(pageDockPlacement(view, new DOMRect(16, 100, 88, 164)).mode).toBe('full')
    expect(pageDockPlacement({ ...view, safeLeft: 20 }, new DOMRect(16, 100, 88, 164)).mode).toBe('hidden')
  })
})
