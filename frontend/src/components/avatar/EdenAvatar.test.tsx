import { act, cleanup, render, screen } from '@testing-library/react'
import { lazy, StrictMode, Suspense } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EdenAvatarProvider } from './EdenAvatar'

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16))
  vi.stubGlobal('cancelAnimationFrame', (timer: number) => clearTimeout(timer))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('Today companion portal lifecycle', () => {
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
