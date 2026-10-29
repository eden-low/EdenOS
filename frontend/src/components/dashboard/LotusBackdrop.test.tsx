import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LotusBackdrop } from './LotusBackdrop'

const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState')

function motionPreference(reduced: boolean) {
  let listener: (() => void) | undefined
  const query = {
    matches: reduced,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_: string, next: () => void) => { listener = next }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => query))
  return { query, notify: () => listener?.() }
}

describe('LotusBackdrop', () => {
  let visibility: DocumentVisibilityState

  beforeEach(() => {
    visibility = 'visible'
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalVisibilityDescriptor) Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor)
    else Reflect.deleteProperty(document, 'visibilityState')
  })

  it('is decorative, non-interactive, and animated only while the page is active', () => {
    motionPreference(false)
    const { container } = render(<LotusBackdrop />)
    const backdrop = container.querySelector('.today-lotus-backdrop')
    const svg = container.querySelector('svg')

    expect(backdrop?.getAttribute('aria-hidden')).toBe('true')
    expect(backdrop?.getAttribute('data-animated')).toBe('true')
    expect(backdrop?.getAttribute('data-viewport-anchored')).toBe('true')
    expect(svg?.getAttribute('focusable')).toBe('false')
    expect(container.querySelectorAll('.lotus-petal-tier')).toHaveLength(7)
    expect(container.querySelectorAll('.lotus-petal')).toHaveLength(35)
    expect(container.querySelectorAll('.lotus-veins path')).toHaveLength(18)
    expect(container.querySelectorAll('.lotus-stars circle')).toHaveLength(28)
    expect(container.querySelectorAll('.lotus-trail')).toHaveLength(3)
    expect(container.querySelectorAll('.lotus-edge-glints path')).toHaveLength(5)
    expect(container.querySelectorAll('filter')).toHaveLength(1)
    expect(container.querySelectorAll('*').length).toBeLessThan(220)
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
    expect(container.querySelector('canvas, video, image')).toBeNull()

    act(() => {
      visibility = 'hidden'
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(backdrop?.getAttribute('data-animated')).toBe('false')

    act(() => {
      visibility = 'visible'
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(backdrop?.getAttribute('data-animated')).toBe('true')
  })

  it('renders the static lotus when reduced motion is preferred', () => {
    const preference = motionPreference(true)
    const { container, unmount } = render(<LotusBackdrop />)

    expect(container.querySelector('.today-lotus-backdrop')?.getAttribute('data-animated')).toBe('false')
    unmount()
    expect(preference.query.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('anchors the ambient layer to the dynamic viewport without creating a horizontal scroll surface', () => {
    motionPreference(false)
    const { container } = render(<LotusBackdrop />)
    const backdrop = container.querySelector<HTMLElement>('.today-lotus-backdrop')

    expect(backdrop?.style.position).toBe('fixed')
    expect(backdrop?.style.inset).toBe('0px')
    expect(backdrop?.style.width).toBe('auto')
    expect(backdrop?.style.pointerEvents).toBe('none')
    expect(backdrop?.getAttribute('data-viewport-anchored')).toBe('true')
  })
})
