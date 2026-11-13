import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getReferenceRate } from '../../services/exchangeRates'
import { ExpenseForm } from '../capture/ExpenseForm'
import type { ReferenceRate } from '../../domain/currencyConversion'

vi.mock('../../services/exchangeRates', () => ({ getReferenceRate: vi.fn() }))
const rate: ReferenceRate = { base: 'USD', quote: 'MYR', rate: '4.5', date: '2026-09-17' }
function change(label: string | RegExp, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
function form(receipt = false) {
  const onSubmit = vi.fn()
  render(<ExpenseForm receiptCandidate={receipt ? { title: 'Synthetic shop', category: 'food', amountSen: 2500 } : undefined} submitLabel="Review" onSubmit={onSubmit} onCancel={vi.fn()} />)
  change('Merchant / title', 'Synthetic shop'); change('Date', '2026-09-17'); change('Amount', '25')
  return onSubmit
}
beforeEach(() => { vi.mocked(getReferenceRate).mockReset().mockResolvedValue(rate) })
describe('foreign currency before expense review', () => {
  it('preselects explicit currency in typed amount text', async () => {
    form()
    change('Amount', 'USD 25')
    expect((screen.getByLabelText('Currency') as HTMLSelectElement).value).toBe('USD')
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('25')
    await screen.findByText(/Suggested MYR: RM 112.50/)
  })
  it('converts USD25 to reviewed MYR and submits only the existing record fields', async () => {
    const submit = form()
    change('Currency', 'USD')
    await screen.findByText(/Suggested MYR: RM 112.50/)
    expect(getReferenceRate).toHaveBeenCalledWith('USD', '2026-09-17')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(submit).toHaveBeenCalledWith({ amountSen: 11250, title: 'Synthetic shop', category: 'food', occurredAt: expect.any(String), note: undefined, source: 'manual' })
  })
  it('requires a human currency choice for an uncertain receipt', async () => {
    const submit = form(true)
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByText(/Currency is uncertain/)).toBeTruthy()
    change('Currency', 'USD')
    await screen.findByText(/Suggested MYR: RM 112.50/)
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ amountSen: 11250, source: 'photo' }))
  })
  it('keeps bank override through a quote refresh and works during an outage', async () => {
    vi.mocked(getReferenceRate).mockRejectedValueOnce(new Error('Service unavailable'))
    const submit = form()
    change('Currency', 'USD')
    await screen.findByText(/Service unavailable/)
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(submit).not.toHaveBeenCalled()
    change(/Actual bank MYR/, '114.09')
    fireEvent.click(screen.getByRole('button', { name: 'Retry exchange rate' }))
    await screen.findByText(/Suggested MYR: RM 112.50/)
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ amountSen: 11409 }))
  })
  it('rejects stale data and allows returning to manual MYR', async () => {
    vi.mocked(getReferenceRate).mockResolvedValue({ ...rate, date: '2026-08-01' })
    const submit = form(); change('Currency', 'USD')
    await waitFor(() => expect(getReferenceRate).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(submit).not.toHaveBeenCalled()
    change('Currency', 'MYR')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ amountSen: 2500 }))
  })
  it('discards late quotes for a previous currency and consumption date', async () => {
    let finish!: (value: ReferenceRate) => void
    vi.mocked(getReferenceRate).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const submit = form(); change('Currency', 'USD'); change('Currency', 'SGD')
    await act(async () => finish(rate))
    expect(screen.queryByText(/1 USD =/)).toBeNull()
    change('Date', '2026-09-01')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(submit).not.toHaveBeenCalled()
  })
  it('opens an existing confirmed amount as MYR without requesting rates', () => {
    render(<ExpenseForm initialData={{ amountSen: 11250, title: 'Synthetic', category: 'food', occurredAt: '2026-09-17T12:00:00Z', source: 'manual' }} submitLabel="Review" onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect((screen.getByLabelText('Currency') as HTMLSelectElement).value).toBe('MYR')
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('112.50')
    expect(getReferenceRate).not.toHaveBeenCalled()
  })
})
