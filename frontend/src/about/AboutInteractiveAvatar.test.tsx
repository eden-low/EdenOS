import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrivacyLockContext, unlockedPrivacyLock } from '../privacy/privacyLockContext'
import { AboutInteractiveAvatar } from './AboutInteractiveAvatar'
import { aboutAvatarSequences, type AboutAvatarAction } from './aboutAvatarMachine'

let reduced = false
let listeners: Set<() => void>
function figure() { return screen.getByRole('img', { name: 'Interactive illustrated Eden avatar.' }) }
function advance(ms: number) { act(() => { vi.advanceTimersByTime(ms) }) }
beforeEach(() => {
  vi.useFakeTimers(); reduced = false; listeners = new Set()
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced }, addEventListener: (_: string, listener: () => void) => listeners.add(listener), removeEventListener: (_: string, listener: () => void) => listeners.delete(listener) }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('independent About avatar', () => {
  it.each<AboutAvatarAction>(['smile', 'think', 'wave'])('renders %s artwork, advances its frames and restores idle', (action) => {
    render(<AboutInteractiveAvatar />)
    const button = screen.getByRole('button', { name: action[0].toUpperCase() + action.slice(1) })
    button.focus(); fireEvent.click(button)
    for (const frame of aboutAvatarSequences[action]) {
      expect(figure().getAttribute('data-cell')).toBe(String(frame.cell))
      advance(frame.ms)
    }
    expect(figure().getAttribute('data-action')).toBe('idle')
    expect(document.activeElement).toBe(button)
    expect(figure().closest('[inert]')).toBeNull()
  })
  it('quickly switches/repeats gestures without letting an old timer end the new gesture', () => {
    render(<AboutInteractiveAvatar />)
    fireEvent.click(screen.getByRole('button', { name: 'Wave' })); advance(150)
    fireEvent.click(screen.getByRole('button', { name: 'Think' })); advance(40)
    expect(figure().getAttribute('data-action')).toBe('think')
    fireEvent.click(screen.getByRole('button', { name: 'Think' }))
    expect(figure().getAttribute('data-cell')).toBe('2')
    advance(650)
    expect(figure().getAttribute('data-cell')).toBe('5')
  })
  it('uses one still gesture with Reduced Motion and then returns to idle', () => {
    reduced = true
    render(<AboutInteractiveAvatar />)
    fireEvent.click(screen.getByRole('button', { name: 'Wave' }))
    advance(500)
    expect(figure().getAttribute('data-cell')).toBe('3')
    advance(500)
    expect(figure().getAttribute('data-action')).toBe('idle')
  })
  it('honors a motion preference change during a gesture', () => {
    render(<AboutInteractiveAvatar />)
    fireEvent.click(screen.getByRole('button', { name: 'Wave' })); advance(180)
    act(() => { reduced = true; listeners.forEach((listener) => listener()) })
    expect(figure().getAttribute('data-cell')).toBe('3')
    advance(1000)
    expect(figure().getAttribute('data-action')).toBe('idle')
  })
  it('cancels interaction when Privacy Lock is engaged', () => {
    const view = render(<PrivacyLockContext.Provider value={unlockedPrivacyLock}><AboutInteractiveAvatar /></PrivacyLockContext.Provider>)
    fireEvent.click(screen.getByRole('button', { name: 'Wave' }))
    view.rerender(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, locked: true }}><AboutInteractiveAvatar /></PrivacyLockContext.Provider>)
    expect(figure().getAttribute('data-action')).toBe('idle')
    expect((screen.getByRole('button', { name: 'Wave' }) as HTMLButtonElement).disabled).toBe(true)
    advance(1500)
    expect(figure().getAttribute('data-action')).toBe('idle')
  })
  it('pauses behind Genesis without modifying the boot implementation', async () => {
    const overlay = document.createElement('section'); overlay.className = 'genesis-boot-screen'
    render(<AboutInteractiveAvatar />)
    await act(async () => { document.body.append(overlay) })
    expect((screen.getByRole('button', { name: 'Smile' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => { overlay.remove() })
    expect((screen.getByRole('button', { name: 'Smile' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('clears its timer on unmount', () => {
    const view = render(<AboutInteractiveAvatar />)
    fireEvent.click(screen.getByRole('button', { name: 'Think' }))
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
