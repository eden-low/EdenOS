import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ExpenseData } from '../../types/records'
import { ExpenseForm } from './ExpenseForm'

const occurredAt = new Date(2026, 8, 17, 14, 30).toISOString()

function setInput(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('Expense form conversion', () => {
  it('creates integer sen and omits an empty optional note', () => {
    const onSubmit = vi.fn()
    render(<ExpenseForm submitLabel="Review" onSubmit={onSubmit} onCancel={vi.fn()} />)
    setInput('Amount', '12.34')
    setInput('Merchant / title', '  Lunch  ')
    setInput(/Note/, '  ')
    setInput('Date', '2026-09-17')
    setInput('Time', '14:30')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))

    expect(onSubmit).toHaveBeenCalledWith({
      amountSen: 1234,
      category: 'food',
      title: 'Lunch',
      note: undefined,
      occurredAt,
      source: 'manual',
    } satisfies ExpenseData)
  })

  it('preserves an edited record’s source and clears the optional note', () => {
    const onSubmit = vi.fn()
    render(<ExpenseForm
      initialData={{
        amountSen: 1250, category: 'food', title: 'Lunch', note: 'Old note',
        occurredAt, source: 'text',
      }}
      submitLabel="Save changes"
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />)
    setInput('Amount', '12.51')
    setInput(/Note/, '')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      amountSen: 1251, note: undefined, source: 'text',
    }))
  })
})
