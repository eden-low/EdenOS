import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { lazy, StrictMode, Suspense } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EdenAvatarProvider } from './EdenAvatar'
import { PrivacyLockContext, unlockedPrivacyLock } from '../../privacy/privacyLockContext'
import { CaptureSheet } from '../capture/CaptureSheet'
import { RecordsContext, type RecordsContextValue } from '../../state/recordsContextDefinition'
import type { AppPage } from '../layout/Navigation'

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

function pageFixture(page: AppPage) {
  return <RecordsContext.Provider value={{ drafts: [] } as unknown as RecordsContextValue}>
    <EdenAvatarProvider enabled page={page}><CaptureSheet key={page}><button>Page Capture</button></CaptureSheet></EdenAvatarProvider>
  </RecordsContext.Provider>
}
function avatar() { return document.querySelector('.eden-avatar')! }
async function measure() { await act(async () => { window.dispatchEvent(new Event('resize')); await new Promise((resolve) => setTimeout(resolve, 40)) }) }

describe('Global avatar page and overlay scope', () => {
  it.each<AppPage>(['exercise', 'records'])('keeps %s Capture hidden and standing, then restores idle', async (page) => {
    render(pageFixture(page))
    await measure()
    expect(avatar().getAttribute('data-visible')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Page Capture' }))
    await screen.findByRole('dialog')
    await measure()
    expect(avatar().getAttribute('data-state')).toBe('idle')
    expect(avatar().getAttribute('data-visible')).toBe('false')
    expect(avatar().hasAttribute('data-sheet')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    await waitFor(() => expect(document.querySelector('[data-eden-capture]')).toBeNull())
    await measure()
    expect(avatar().getAttribute('data-visible')).toBe('true')
    expect(avatar().getAttribute('data-state')).toBe('idle')
  })

  it('moves a stable Today portal between document home and Capture without remounting the sprite', async () => {
    const view = render(<RecordsContext.Provider value={{ drafts: [] } as unknown as RecordsContextValue}>
      <EdenAvatarProvider enabled><div data-today-avatar-dock /><CaptureSheet><button>Dock Capture</button></CaptureSheet></EdenAvatarProvider>
    </RecordsContext.Provider>)
    const dock = document.querySelector<HTMLElement>('[data-today-avatar-dock]')!
    dock.getBoundingClientRect = () => new DOMRect(270, 100, 88, 164)
    await measure()
    const original = avatar(), sprite = original.querySelector('.eden-avatar-art')
    expect(original.parentElement?.parentElement).toBe(dock)
    expect((original as HTMLElement).style.position).toBe('absolute')
    fireEvent.click(screen.getByRole('button', { name: 'Dock Capture' }))
    await waitFor(() => expect(avatar().getAttribute('data-state')).toBe('perched'), { timeout: 1500 })
    expect(avatar()).toBe(original)
    expect(avatar().querySelector('.eden-avatar-art')).toBe(sprite)
    expect(original.parentElement?.parentElement).toBe(document.body)
    expect((original as HTMLElement).style.position).toBe('fixed')
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    await waitFor(() => expect(avatar().getAttribute('data-state')).toBe('idle'))
    expect(original.parentElement?.parentElement).toBe(dock)
    expect(avatar().querySelector('.eden-avatar-art')).toBe(sprite)
    view.unmount()
    expect(document.querySelector('.eden-avatar')).toBeNull()
  })

  it('cancels a Today Capture and its timers when changing page, including a return to Today', async () => {
    const view = render(pageFixture('today'))
    fireEvent.click(screen.getByRole('button', { name: 'Page Capture' }))
    await waitFor(() => expect(avatar().getAttribute('data-state')).toBe('moveToSheet'))
    view.rerender(pageFixture('records'))
    await measure()
    expect(document.querySelector('[data-eden-capture]')).toBeNull()
    expect(document.querySelector('.capture-overlay')).toBeNull()
    expect(document.body.style.pointerEvents).not.toBe('none')
    expect(avatar().getAttribute('data-state')).toBe('idle')
    view.rerender(pageFixture('today'))
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 550)) })
    expect(avatar().getAttribute('data-state')).toBe('idle')
    expect(avatar().hasAttribute('data-sheet')).toBe(false)
    expect(avatar().getAttribute('data-visible')).toBe('true')
  })

  it('allows scrolling text, charts and buttons, while protecting a fixed control', async () => {
    render(<EdenAvatarProvider enabled><p>Page fixture</p></EdenAvatarProvider>)
    await measure()
    const obstruction = document.createElement('div')
    obstruction.setAttribute('role', 'status')
    const rect = DOMRect.fromRect({ x: 900, y: 580, width: 124, height: 188 })
    obstruction.getBoundingClientRect = () => rect
    obstruction.getClientRects = () => [rect] as unknown as DOMRectList
    document.body.append(obstruction)
    await measure()
    expect(avatar().getAttribute('data-visible')).toBe('true')
    obstruction.setAttribute('role', 'img')
    obstruction.tabIndex = 0
    await measure()
    expect(avatar().getAttribute('data-visible')).toBe('true')
    obstruction.setAttribute('role', 'button')
    await measure()
    expect(avatar().getAttribute('data-visible')).toBe('true')
    obstruction.style.position = 'fixed'
    await measure()
    expect(avatar().getAttribute('data-visible')).toBe('false')
    obstruction.remove()
    await measure()
    expect(avatar().getAttribute('data-visible')).toBe('true')
  })

  it('hides for a focused input and restores on blur without any scroll', async () => {
    render(<EdenAvatarProvider enabled><p>Page fixture</p></EdenAvatarProvider>)
    const input = document.createElement('input')
    const rect = DOMRect.fromRect({ x: 900, y: 580, width: 124, height: 188 })
    input.getBoundingClientRect = () => rect
    input.getClientRects = () => [rect] as unknown as DOMRectList
    document.body.append(input)
    await measure()
    expect(avatar().getAttribute('data-visible')).toBe('true')
    act(() => input.focus())
    await waitFor(() => expect(avatar().getAttribute('data-visible')).toBe('false'))
    act(() => input.blur())
    await waitFor(() => expect(avatar().getAttribute('data-visible')).toBe('true'))
    input.remove()
  })

  it('mirrors only Review, preserving the standing viewport and Reduced Motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    const view = render(pageFixture('review'))
    await measure()
    expect(avatar().querySelector('.eden-avatar-facing')?.getAttribute('data-mirrored')).toBe('true')
    expect(avatar().querySelector('.eden-avatar-art')?.getAttribute('viewBox')).toBe('144 0 256 512')
    expect(avatar().querySelector('.eden-avatar-art')?.getAttribute('data-still')).toBe('true')
    view.rerender(pageFixture('today'))
    expect(avatar().querySelector('.eden-avatar-facing')?.hasAttribute('data-mirrored')).toBe(false)
  })

  it('hides during native iPhone fullscreen media and resumes standing afterwards', async () => {
    render(pageFixture('anime'))
    await measure()
    document.dispatchEvent(new Event('webkitbeginfullscreen'))
    await measure()
    expect(avatar().getAttribute('data-visible')).toBe('false')
    document.dispatchEvent(new Event('webkitendfullscreen'))
    await measure()
    expect(avatar().getAttribute('data-visible')).toBe('true')
    expect(avatar().getAttribute('data-state')).toBe('idle')
  })

  it('never mounts the global avatar on About even if a caller enables it', () => {
    render(pageFixture('about'))
    expect(document.querySelector('.eden-avatar')).toBeNull()
  })
})

describe('Today companion portal lifecycle', () => {
  it('keeps the same standing avatar visible across Finance Lock changes while honoring real overlays', async () => {
    const tree = (locked: boolean) => <PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, enabled: true, locked }}>
      <EdenAvatarProvider enabled><p>Today fixture</p></EdenAvatarProvider>
    </PrivacyLockContext.Provider>
    const view = render(tree(true))
    const avatar = document.querySelector('.eden-avatar')!
    const measure = () => act(async () => { window.dispatchEvent(new Event('resize')); await new Promise((resolve) => setTimeout(resolve, 40)) })
    await measure()
    expect(avatar.getAttribute('data-visible')).toBe('true')
    for (const locked of [false, true, false]) {
      view.rerender(tree(locked))
      expect(document.querySelector('.eden-avatar')).toBe(avatar)
      expect(avatar.getAttribute('data-visible')).toBe('true')
      expect(avatar.getAttribute('data-state')).toBe('idle')
      expect(avatar.querySelector('.eden-avatar-art')?.getAttribute('viewBox')).toBe('144 0 256 512')
    }
    expect(avatar.getAttribute('aria-hidden')).toBe('true')
    expect(avatar.hasAttribute('inert')).toBe(true)
    for (const kind of ['dialog', 'genesis']) {
      const overlay = document.createElement('div')
      if (kind === 'dialog') { overlay.setAttribute('role', 'dialog'); overlay.dataset.state = 'open' }
      else overlay.className = 'genesis-boot-screen'
      document.body.append(overlay)
      await measure()
      expect(avatar.getAttribute('data-visible')).toBe('false')
      overlay.remove()
      await measure()
      expect(avatar.getAttribute('data-visible')).toBe('true')
    }
  })

  it('leaves no decorative avatar behind when changing to a suspended lazy page', async () => {
    let resolve!: (value: { default: () => React.ReactNode }) => void
    const LazyPage = lazy(() => new Promise<{ default: () => React.ReactNode }>((done) => { resolve = done }))
    const tree = (about: boolean) => <StrictMode><EdenAvatarProvider enabled={!about}>
      <Suspense fallback={<p>Opening About</p>}>{about ? <LazyPage /> : <p>Today fixture</p>}</Suspense>
    </EdenAvatarProvider></StrictMode>
    const view = render(tree(false))
    expect(document.querySelectorAll('.eden-avatar')).toHaveLength(1)
    view.rerender(tree(true))
    await act(async () => { resolve({ default: () => <h1>About fixture</h1> }) })
    expect(await screen.findByRole('heading', { name: 'About fixture' })).toBeTruthy()
    expect(document.querySelector('.eden-avatar')).toBeNull()
    expect(document.querySelector('.eden-avatar-safe-area')).toBeNull()
    view.rerender(tree(false))
    expect(document.querySelectorAll('.eden-avatar')).toHaveLength(1)
    view.unmount()
    expect(document.querySelector('.eden-avatar')).toBeNull()
  })
})
