import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExpenseDraft } from '../types/records'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'

let drafts: ExpenseDraft[]
let available: boolean
const applyUpdate = vi.fn<() => Promise<void>>(async () => undefined)
const dismissUpdate = vi.fn()
vi.mock('../state/useRecords', () => ({ useRecords: () => ({ drafts }) }))
vi.mock('./usePwaUpdate', () => ({
  usePwaUpdate: () => ({ updateAvailable: available, applyUpdate, dismissUpdate }),
}))

const draft = (id: string): ExpenseDraft => ({
  id, kind: 'expense', status: 'draft', createdAt: '2026-11-17T00:00:00Z', updatedAt: '2026-11-17T00:00:00Z',
  data: { amountSen: 100, category: 'other', title: 'Synthetic draft', occurredAt: '2026-11-17T00:00:00Z', source: 'manual' },
})

beforeEach(() => {
  drafts = []; available = true
  applyUpdate.mockReset().mockResolvedValue(undefined)
  dismissUpdate.mockReset()
})
afterEach(cleanup)

describe('PWA update consent and attempt lifetime', () => {
  it('does not render or apply an update before one is available', () => {
    available = false
    const view = render(<PwaUpdatePrompt />)
    expect(view.container.textContent).toBe('')
    expect(applyUpdate).not.toHaveBeenCalled()
  })

  it('requires the separate discard action and Later only dismisses', async () => {
    drafts = [draft('a')]
    render(<PwaUpdatePrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
    expect(applyUpdate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Later' }))
    expect(dismissUpdate).toHaveBeenCalledOnce()
    expect(applyUpdate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Update and discard drafts' }))
    await waitFor(() => expect(applyUpdate).toHaveBeenCalledOnce())
  })

  it('allows retry after a rejected attempt without silently applying an update', async () => {
    applyUpdate.mockRejectedValueOnce(new Error('synthetic offline'))
    render(<PwaUpdatePrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
    await screen.findByText('The update could not be applied. Your current session is unchanged.')
    expect((screen.getByRole('button', { name: 'Update now' }) as HTMLButtonElement).disabled).toBe(false)
    expect(applyUpdate).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
    await waitFor(() => expect(applyUpdate).toHaveBeenCalledTimes(2))
  })

  it('keeps controls locked after dispatch while waiting for the document reload', async () => {
    render(<PwaUpdatePrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
    await act(async () => { await Promise.resolve() })
    expect((screen.getByRole('button', { name: 'Updating…' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Later' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('requires fresh review when the pending draft identities change', () => {
    drafts = [draft('a')]
    const view = render(<PwaUpdatePrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
    drafts = [draft('b')]; view.rerender(<PwaUpdatePrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
    expect(applyUpdate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Update and discard drafts' })).toBeTruthy()
  })

  it('removes the discard warning after all pending drafts are confirmed or removed', () => {
    drafts = [draft('a')]
    const view = render(<PwaUpdatePrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
    drafts = []; view.rerender(<PwaUpdatePrompt />)
    expect(screen.queryByText('Unsaved draft in progress')).toBeNull()
    expect(screen.getByRole('button', { name: 'Update now' })).toBeTruthy()
    expect(applyUpdate).not.toHaveBeenCalled()
  })

  it('keeps both controls disabled during a pending attempt even if drafts change', async () => {
    let finish!: () => void
    applyUpdate.mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
    const view = render(<PwaUpdatePrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
    drafts = [draft('b')]; view.rerender(<PwaUpdatePrompt />)
    expect((screen.getByRole('button', { name: 'Updating…' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Later' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Updating…' }))
    expect(applyUpdate).toHaveBeenCalledOnce()
    await act(async () => { finish() })
  })

})
