import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DesktopNavigation, MobileNavigation } from './Navigation'

vi.mock('../capture/CaptureSheet', () => ({ CaptureSheet: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock('../account/AccountDialog', () => ({ AccountDialog: ({ children }: { children: ReactNode }) => <>{children}</> }))

describe('Mobile Navigation V2', () => {
  it('keeps only Capture at the bottom and exposes the approved app drawer', async () => {
    const navigate = vi.fn()
    render(<MobileNavigation activePage="today" onNavigate={navigate} />)
    expect(screen.getAllByRole('button', { name: 'Capture something' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Open apps' }))
    const drawer = await screen.findByRole('dialog', { name: 'Apps' })
    for (const label of ['Today', 'Expenses', 'Exercise', 'Records', 'Review', 'Anime', 'Account']) expect(drawer.textContent).toContain(label)
    expect(drawer.querySelectorAll('nav button')).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'Expenses' }))
    expect(navigate).toHaveBeenCalledWith('expenses')
  })

  it('opens for a deliberate left-edge swipe and ignores vertical or short gestures', async () => {
    render(<MobileNavigation activePage="today" onNavigate={vi.fn()} />)
    fireEvent.touchStart(window, { touches: [{ clientX: 10, clientY: 100 }] })
    fireEvent.touchEnd(window, { changedTouches: [{ clientX: 30, clientY: 102 }] })
    expect(screen.queryByRole('dialog', { name: 'Apps' })).toBeNull()
    fireEvent.touchStart(window, { touches: [{ clientX: 10, clientY: 100 }] })
    fireEvent.touchEnd(window, { changedTouches: [{ clientX: 35, clientY: 180 }] })
    expect(screen.queryByRole('dialog', { name: 'Apps' })).toBeNull()
    fireEvent.touchStart(window, { touches: [{ clientX: 10, clientY: 100 }] })
    fireEvent.touchEnd(window, { changedTouches: [{ clientX: 80, clientY: 105 }] })
    expect(await screen.findByRole('dialog', { name: 'Apps' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Apps' })).toBeNull())
  })

  it('preserves the approved desktop destinations', () => {
    render(<DesktopNavigation activePage="exercise" onNavigate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Exercise' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('navigation', { name: 'Primary navigation' }).querySelectorAll('button')).toHaveLength(6)
  })
})
