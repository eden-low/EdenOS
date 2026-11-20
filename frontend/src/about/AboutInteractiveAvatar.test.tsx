import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrivacyLockContext, unlockedPrivacyLock } from '../privacy/privacyLockContext'
import { AboutInteractiveAvatar } from './AboutInteractiveAvatar'
import { aboutAvatarSequences, type AboutAvatarAction } from './aboutAvatarMachine'

let reduced = false
let listeners: Set<() => void>
function figure() { return screen.getByRole('img', { name: '可互动的 Q 版 Eden 人物' }) }
const labels = { smile: '微笑', think: '思考', wave: '挥手' }
function advance(ms: number) { act(() => { vi.advanceTimersByTime(ms) }) }
function waveLoaded() { fireEvent.load(document.querySelector('[data-avatar-art="wave"]')!) }
function renderReady() { const view = render(<AboutInteractiveAvatar />); waveLoaded(); return view }
beforeEach(() => {
  vi.useFakeTimers(); reduced = false; listeners = new Set()
  vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced }, addEventListener: (_: string, listener: () => void) => listeners.add(listener), removeEventListener: (_: string, listener: () => void) => listeners.delete(listener) }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('independent About avatar', () => {
  it.each<AboutAvatarAction>(['smile', 'think', 'wave'])('renders %s artwork, advances its frames and restores idle', (action) => {
    renderReady()
    const button = screen.getByRole('button', { name: labels[action] })
    button.focus(); fireEvent.click(button)
    for (const frame of aboutAvatarSequences[action]) {
      expect(figure().getAttribute('data-cell')).toBe(String(frame.cell))
      if (action === 'wave') expect(figure().getAttribute('data-phase')).toBe(frame.phase)
      advance(frame.ms)
    }
    expect(figure().getAttribute('data-action')).toBe('idle')
    expect(document.activeElement).toBe(button)
    expect(figure().closest('[inert]')).toBeNull()
  })
  it('quickly switches/repeats gestures without letting an old timer end the new gesture', () => {
    renderReady()
    fireEvent.click(screen.getByRole('button', { name: '挥手' })); advance(150)
    fireEvent.click(screen.getByRole('button', { name: '思考' })); advance(40)
    expect(figure().getAttribute('data-action')).toBe('think')
    fireEvent.click(screen.getByRole('button', { name: '思考' }))
    expect(figure().getAttribute('data-cell')).toBe('2')
    advance(650)
    expect(figure().getAttribute('data-cell')).toBe('5')
  })
  it('uses one still gesture with Reduced Motion and then returns to idle', () => {
    reduced = true
    renderReady()
    fireEvent.click(screen.getByRole('button', { name: '挥手' }))
    advance(500)
    expect(figure().getAttribute('data-cell')).toBe('3')
    expect(figure().getAttribute('data-art')).toBe('wave')
    expect(figure().getAttribute('data-phase')).toBe('wave')
    advance(500)
    expect(figure().getAttribute('data-action')).toBe('idle')
  })
  it('honors a motion preference change during a gesture', () => {
    renderReady()
    fireEvent.click(screen.getByRole('button', { name: '挥手' })); advance(180)
    act(() => { reduced = true; listeners.forEach((listener) => listener()) })
    expect(figure().getAttribute('data-cell')).toBe('3')
    advance(1000)
    expect(figure().getAttribute('data-action')).toBe('idle')
  })
  it('cancels interaction when Privacy Lock is engaged', () => {
    const view = render(<PrivacyLockContext.Provider value={unlockedPrivacyLock}><AboutInteractiveAvatar /></PrivacyLockContext.Provider>)
    waveLoaded()
    fireEvent.click(screen.getByRole('button', { name: '挥手' }))
    view.rerender(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, locked: true }}><AboutInteractiveAvatar /></PrivacyLockContext.Provider>)
    expect(figure().getAttribute('data-action')).toBe('idle')
    expect((screen.getByRole('button', { name: '挥手' }) as HTMLButtonElement).disabled).toBe(true)
    advance(1500)
    expect(figure().getAttribute('data-action')).toBe('idle')
  })
  it('pauses behind Genesis without modifying the boot implementation', async () => {
    const overlay = document.createElement('section'); overlay.className = 'genesis-boot-screen'
    renderReady()
    await act(async () => { document.body.append(overlay) })
    expect((screen.getByRole('button', { name: '微笑' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => { overlay.remove() })
    expect((screen.getByRole('button', { name: '微笑' }) as HTMLButtonElement).disabled).toBe(false)
  })
  it('clears its timer on unmount', () => {
    const view = renderReady()
    fireEvent.click(screen.getByRole('button', { name: '思考' }))
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('restarts Wave during lower and completes only the latest run', () => {
    renderReady()
    fireEvent.click(screen.getByRole('button', { name: '挥手' }))
    for (const frame of aboutAvatarSequences.wave.filter((frame) => frame.phase !== 'lower')) advance(frame.ms)
    expect(figure().getAttribute('data-phase')).toBe('lower')
    fireEvent.click(screen.getByRole('button', { name: '挥手' }))
    expect(figure().getAttribute('data-phase')).toBe('raise')
    expect(figure().getAttribute('data-cell')).toBe('0')
    for (const frame of aboutAvatarSequences.wave) advance(frame.ms)
    expect(figure().getAttribute('data-action')).toBe('idle')
    expect(figure().getAttribute('data-art')).toBe('gestures')
  })
  it('interrupts a running Wave when a dialog opens and keeps Chinese status feedback', async () => {
    renderReady()
    fireEvent.click(screen.getByRole('button', { name: '挥手' })); advance(100)
    expect(screen.getByRole('status').textContent).toBe('小 Eden 轻轻挥手，跟你打招呼。')
    const dialog = document.createElement('div'); dialog.setAttribute('role', 'dialog'); dialog.dataset.state = 'open'
    await act(async () => { document.body.append(dialog) })
    expect(figure().getAttribute('data-action')).toBe('idle')
    expect((screen.getByRole('button', { name: '挥手' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toBe('隐私锁或弹窗开启时，人物互动会暂时休息。')
    await act(async () => { dialog.remove() })
    expect(figure().getAttribute('data-action')).toBe('idle')
  })
  it('waits for a cold Wave image before starting Raise, rather than skipping frames', () => {
    render(<AboutInteractiveAvatar />)
    fireEvent.click(screen.getByRole('button', { name: '挥手' }))
    advance(3000)
    expect(figure().getAttribute('data-cell')).toBe('0')
    expect(figure().getAttribute('data-art')).toBe('gestures')
    expect(screen.getByRole('status').textContent).toBe('小 Eden 正在准备挥手，稍等一下。')
    waveLoaded()
    expect(figure().getAttribute('data-phase')).toBe('raise')
    for (const frame of aboutAvatarSequences.wave) advance(frame.ms)
    expect(figure().getAttribute('data-action')).toBe('idle')
  })
  it('reports a Wave loading failure without changing Smile or Think', () => {
    render(<AboutInteractiveAvatar />)
    fireEvent.click(screen.getByRole('button', { name: '挥手' }))
    fireEvent.error(document.querySelector('[data-avatar-art="wave"]')!)
    expect(figure().getAttribute('data-action')).toBe('idle')
    expect((screen.getByRole('button', { name: '挥手' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('挥手素材暂时没有加载好')
    fireEvent.click(screen.getByRole('button', { name: '微笑' }))
    expect(figure().getAttribute('data-action')).toBe('smile')
    expect(figure().getAttribute('data-art')).toBe('gestures')
  })
  it('does not restart the accepted Think timing when the Wave preload completes', () => {
    render(<AboutInteractiveAvatar />)
    fireEvent.click(screen.getByRole('button', { name: '思考' }))
    advance(400)
    waveLoaded()
    advance(250)
    expect(figure().getAttribute('data-cell')).toBe('5')
    expect(figure().getAttribute('data-action')).toBe('think')
  })
})
