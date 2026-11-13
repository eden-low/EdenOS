import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode, useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GenesisBootProvider } from './GenesisBootProvider'
import { GenesisBootSettings } from './GenesisBootSettings'
import { bootPreferenceKey, bootSessionKey } from './bootStorage'

let reduced = false
let mediaListeners: Set<() => void>
const localDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!
const sessionDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!
const mount = vi.fn()
function Workspace() { useEffect(() => { mount() }, []); return <button>Existing workspace action</button> }
function Harness({ ready = true, blocked = false }: { ready?: boolean; blocked?: boolean }) {
  return <GenesisBootProvider ready={ready} blocked={blocked}><Workspace /><GenesisBootSettings /></GenesisBootProvider>
}
function frame() { act(() => { vi.advanceTimersByTime(20) }) }
function advance(ms: number) { act(() => { vi.advanceTimersByTime(ms) }) }
function visible() { return screen.queryByRole('dialog', { name: 'EdenOS welcome' }) }

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); mount.mockClear()
  window.history.replaceState(null, '', '/')
  reduced = false; mediaListeners = new Set()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced }, addEventListener: (_event: string, listener: () => void) => mediaListeners.add(listener), removeEventListener: (_event: string, listener: () => void) => mediaListeners.delete(listener) }))
})
afterEach(() => {
  Object.defineProperty(window, 'localStorage', localDescriptor)
  Object.defineProperty(window, 'sessionStorage', sessionDescriptor)
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers()
})

describe('optional Genesis playback', () => {
  it('mounts the application immediately, then plays all four stages once in 4.3 seconds', () => {
    render(<Harness />)
    expect(mount).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Existing workspace action' })).toBeTruthy()
    expect(visible()).toBeNull()
    frame()
    expect(visible()?.getAttribute('data-stage')).toBe('genesis')
    expect(sessionStorage.getItem(bootSessionKey)).toBe('seen')
    advance(800); expect(visible()?.getAttribute('data-stage')).toBe('core')
    advance(1600); expect(visible()?.getAttribute('data-stage')).toBe('ready')
    advance(700); expect(visible()?.getAttribute('data-stage')).toBe('welcome')
    expect(screen.getByText('WELCOME BACK TO EDEN')).toBeTruthy()
    advance(1200); expect(visible()).toBeNull()
  })
  it('is StrictMode safe and suppresses remount/refresh playback in the same tab', () => {
    const view = render(<StrictMode><Harness /></StrictMode>); frame()
    expect(visible()).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    view.unmount()
    render(<Harness />); frame()
    expect(visible()).toBeNull()
    expect(sessionStorage.getItem(bootSessionKey)).toBe('seen')
  })
  it('Skip clears timers and restores focus without changing the URL', () => {
    const previous = document.createElement('button'); document.body.append(previous); previous.focus()
    const view = render(<Harness />); frame()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Skip' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    // React schedules immediate work after focus/unmount; drain only that turn.
    advance(0)
    expect(visible()).toBeNull(); expect(vi.getTimerCount()).toBe(0)
    expect(document.activeElement).toBe(previous)
    expect(window.location.pathname).toBe('/')
    view.unmount(); previous.remove()
  })
  it.each(['Escape', 'Tab'])('allows %s to dismiss decoration immediately', (key) => {
    render(<Harness />); frame(); fireEvent.keyDown(document, { key })
    advance(0)
    expect(visible()).toBeNull(); expect(vi.getTimerCount()).toBe(0)
  })
  it('preserves application keyboard shortcuts', () => {
    render(<Harness />); frame(); fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(visible()).toBeNull()
  })
  it.each(['/expenses', '/anime?q=moon', '/cosmos#tarot', '/?auth=return', '/#today'])('does not cover or redirect deep link %s', (url) => {
    window.history.replaceState(null, '', url)
    render(<Harness />); frame()
    expect(visible()).toBeNull()
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(url)
  })
  it('dismisses on navigation and never replays when navigating back home', () => {
    render(<Harness />); frame()
    act(() => { window.history.pushState(null, '', '/records'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(visible()).toBeNull()
    act(() => { window.history.pushState(null, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }); frame()
    expect(visible()).toBeNull()
  })
  it('waits for readiness without delaying child initialization, and cancels when an error/update wins', () => {
    const view = render(<Harness ready={false} />); frame()
    expect(mount).toHaveBeenCalledOnce(); expect(visible()).toBeNull()
    view.rerender(<Harness ready />); frame(); expect(visible()).toBeTruthy()
    view.rerender(<Harness blocked />); expect(visible()).toBeNull(); advance(1)
    view.rerender(<Harness />); frame(); expect(visible()).toBeNull()
  })
  it('does not start later after an initial error or PWA-update state recovers', () => {
    const view = render(<Harness blocked />); frame()
    view.rerender(<Harness />); frame(); expect(visible()).toBeNull()
  })
  it.each(['pointer', 'keyboard'])('does not interrupt %s interaction when loading finishes', (kind) => {
    const view = render(<Harness ready={false} />)
    if (kind === 'pointer') fireEvent.pointerDown(screen.getByRole('button', { name: 'Existing workspace action' }))
    else fireEvent.keyDown(document, { key: 'Enter' })
    view.rerender(<Harness />); frame()
    expect(visible()).toBeNull()
    expect(sessionStorage.getItem(bootSessionKey)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Replay Boot Animation' })); advance(180)
    expect(visible()).toBeTruthy()
  })
  it('persists the toggle for future automatic playback while explicit replay still works', () => {
    localStorage.setItem(bootPreferenceKey, 'off')
    render(<Harness />); frame(); expect(visible()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Replay Boot Animation' })); advance(180)
    expect(visible()).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Show Boot Animation' }))
    expect(localStorage.getItem(bootPreferenceKey)).toBe('on')
    frame(); expect(visible()).toBeNull()
  })
  it('skips reduced-motion autoplay and uses a short static explicit replay', () => {
    reduced = true; render(<Harness />); frame(); expect(visible()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Replay Boot Animation' })); advance(180)
    expect(visible()?.getAttribute('data-reduced-motion')).toBe('true')
    expect(visible()?.getAttribute('data-stage')).toBe('welcome')
    advance(600); expect(visible()).toBeNull()
  })
  it('honors a reduced-motion change while running', () => {
    render(<Harness />); frame()
    act(() => { reduced = true; for (const listener of mediaListeners) listener() })
    expect(visible()).toBeNull()
  })
  it.each(['get', 'read', 'write'])('fails open when session storage %s fails', (kind) => {
    if (kind === 'get') Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new DOMException('blocked') } })
    else Object.defineProperty(window, 'sessionStorage', { configurable: true, value: { getItem() { if (kind === 'read') throw new Error('blocked'); return null }, setItem() { throw new Error('quota') } } })
    render(<Harness />); frame(); expect(visible()).toBeNull()
    expect(screen.getByRole('button', { name: 'Existing workspace action' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Replay Boot Animation' })); advance(180)
    expect(visible()).toBeTruthy()
  })
  it('handles localStorage access/persistence failures without breaking settings or app', () => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked') } })
    render(<Harness />); frame(); fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Show Boot Animation' }))
    expect(screen.getByRole('status').textContent).toContain('could not save')
    expect(screen.getByRole('button', { name: 'Existing workspace action' })).toBeTruthy()
  })
  it.each(['frame', 'sequence', 'replay'])('cleans up the pending %s on unmount', (kind) => {
    const view = render(<Harness />)
    if (kind !== 'frame') frame()
    if (kind === 'replay') {
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
      fireEvent.click(screen.getByRole('button', { name: 'Replay Boot Animation' }))
    }
    view.unmount(); advance(0); expect(vi.getTimerCount()).toBe(0)
    expect(mediaListeners.size).toBe(0); advance(10000); expect(visible()).toBeNull()
  })
})
