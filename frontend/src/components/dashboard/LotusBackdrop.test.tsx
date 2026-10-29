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
    expect(svg?.getAttribute('focusable')).toBe('false')
    expect(container.querySelectorAll('.lotus-particle')).toHaveLength(10)
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()

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
})
