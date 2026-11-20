import { act, cleanup, render, screen } from '@testing-library/react'
import { lazy, StrictMode, Suspense } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EdenAvatarProvider } from './EdenAvatar'
import { PrivacyLockContext, unlockedPrivacyLock } from '../../privacy/privacyLockContext'

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

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
