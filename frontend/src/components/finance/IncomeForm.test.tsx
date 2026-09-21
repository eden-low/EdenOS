import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IncomeForm } from './IncomeForm'

describe('IncomeForm', () => {
  it('creates a positive integer-sen Income record', () => {
    const onSubmit = vi.fn()
    render(<IncomeForm submitLabel="Add income" onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1234.56' } })
    fireEvent.change(screen.getByLabelText('Source / description'), { target: { value: '  Monthly salary  ' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-09-21' } })
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '09:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add income' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amountSen: 123456, category: 'salary', description: 'Monthly salary' }))
  })

  it('rejects zero, negative, and fractional-sen values', () => {
    const onSubmit = vi.fn()
    render(<IncomeForm submitLabel="Add income" onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Source / description'), { target: { value: 'Salary' } })
    for (const value of ['0', '-1', '1.001']) {
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value } })
      fireEvent.click(screen.getByRole('button', { name: 'Add income' }))
    }
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/amount greater than RM 0/)).toBeTruthy()
  })
})
