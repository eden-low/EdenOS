import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordsContext, type RecordsContextValue } from '../../state/recordsContextDefinition'
import type { ExpenseData, ExpenseDraft, RecordDraft } from '../../types/records'
import { CaptureSheet } from './CaptureSheet'

const { readReceiptImage } = vi.hoisted(() => ({
  readReceiptImage: vi.fn(async () => ({ rawText: 'STARBUCKS\n17/09/2026\nTOTAL RM15.90' })),
}))
vi.mock('../../services/receiptOcrService', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/receiptOcrService')>(), readReceiptImage,
}))

const confirmExpenseDraft = vi.fn(async () => undefined)

function Harness() {
  const [drafts, setDrafts] = useState<RecordDraft[]>([])
  const value = {
    expenses: [], exerciseRecords: [], drafts,
    expenseStatus: 'loaded', expenseError: null,
    exerciseStatus: 'loaded', exerciseError: null,
    createExpenseDraft(data: ExpenseData) {
      const draft: ExpenseDraft = {
        id: 'expense-draft', kind: 'expense', status: 'draft', data,
        createdAt: data.occurredAt, updatedAt: data.occurredAt,
      }
      setDrafts((current) => [...current, draft])
      return draft.id
    },
    discardDraft(id: string) {
      setDrafts((current) => current.filter((draft) => draft.id !== id))
    },
    updateExpenseDraft(id: string, data: ExpenseData) {
      setDrafts((current) => current.map((draft) =>
        draft.kind === 'expense' && draft.id === id ? { ...draft, data } : draft,
      ))
    },
    confirmExpenseDraft,
    createExerciseDraft: vi.fn(),
    updateExerciseDraft: vi.fn(),
    confirmExerciseDraft: vi.fn(async () => undefined),
    retryExpenseSubscription: vi.fn(),
    retryExerciseSubscription: vi.fn(),
    updateExpense: vi.fn(async () => undefined),
    deleteExpense: vi.fn(async () => undefined),
    updateExercise: vi.fn(async () => undefined),
    deleteExercise: vi.fn(async () => undefined),
  } as RecordsContextValue

  return <RecordsContext.Provider value={value}>
    <CaptureSheet><button type="button">Capture</button></CaptureSheet>
    <output data-testid="draft-count">{drafts.length}</output>
    <output data-testid="draft-data">{
      drafts[0]?.kind === 'expense'
        ? `${drafts[0].data.amountSen}:${drafts[0].data.source}:${drafts[0].data.title}`
        : ''
    }</output>
  </RecordsContext.Provider>
}

beforeEach(() => {
  confirmExpenseDraft.mockClear()
  readReceiptImage.mockClear()
  URL.createObjectURL = vi.fn(() => 'blob:receipt')
  URL.revokeObjectURL = vi.fn()
})

function openExpenseForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
  fireEvent.click(screen.getByRole('button', { name: 'Quick entry' }))
}

describe('Capture discard confirmation', () => {
  it('asks before closing a dirty form', () => {
    render(<Harness />)
    openExpenseForm()
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))

    expect(screen.getByText('Discard this draft?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('Amount')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByText('Quick Expense')).toBeNull()
  })

  it('asks before discarding an unconfirmed review draft', () => {
    render(<Harness />)
    openExpenseForm()
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.34' } })
    fireEvent.change(screen.getByLabelText('Merchant / title'), { target: { value: 'Lunch' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(screen.getByTestId('draft-count').textContent).toBe('1')

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(screen.getByText('Discard this draft?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.getByTestId('draft-count').textContent).toBe('0')
  })
})

describe('Text Capture', () => {
  it('sends a parsed candidate through the existing editable Review and explicit Confirm flow', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Text Capture' }))
    fireEvent.change(screen.getByLabelText('What did you spend?'), {
      target: { value: 'coffee RM6.80' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByTestId('draft-count').textContent).toBe('1')
    expect(screen.getByTestId('draft-data').textContent).toBe('680:text:coffee')
    expect(screen.getByText('Review expense')).toBeTruthy()
    expect(confirmExpenseDraft).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Merchant / title'), { target: { value: 'Coffee shop' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(screen.getByTestId('draft-data').textContent).toBe('680:text:Coffee shop')
    expect(confirmExpenseDraft).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm expense' }))
    await waitFor(() => expect(confirmExpenseDraft).toHaveBeenCalledWith('expense-draft'))
  })

  it('keeps ambiguous text recoverable and allows manual entry', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Text Capture' }))
    fireEvent.change(screen.getByLabelText('What did you spend?'), {
      target: { value: 'lunch 12 30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('alert').textContent).toContain('one clear amount')
    expect(screen.getByTestId('draft-count').textContent).toBe('0')
    expect(confirmExpenseDraft).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(screen.getByText('Discard this draft?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter manually' }))
    expect(screen.getByText('Quick Expense')).toBeTruthy()
  })
})

describe('Receipt Capture', () => {
  it('keeps OCR untrusted through Edit, Review, and explicit Confirm', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Receipt Capture' }))
    fireEvent.change(screen.getByLabelText('Choose receipt image'), {
      target: { files: [new File(['image'], 'receipt.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(screen.getByAltText('Receipt preview')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(screen.getByText('Edit receipt expense')).toBeTruthy())
    expect(screen.getByLabelText('Amount').getAttribute('value')).toBe('15.90')
    expect(screen.getByTestId('draft-count').textContent).toBe('0')
    expect(confirmExpenseDraft).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:receipt')

    fireEvent.change(screen.getByLabelText('Merchant / title'), { target: { value: 'Coffee shop' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(screen.getByTestId('draft-data').textContent).toBe('1590:photo:Coffee shop')
    expect(confirmExpenseDraft).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm expense' }))
    await waitFor(() => expect(confirmExpenseDraft).toHaveBeenCalledOnce())
  })

  it('requires an amount when OCR totals conflict and cleans up on discard', async () => {
    readReceiptImage.mockResolvedValueOnce({ rawText: 'SHOP\nTOTAL RM10.00\nGRAND TOTAL RM12.00' })
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Receipt Capture' }))
    fireEvent.change(screen.getByLabelText('Choose receipt image'), {
      target: { files: [new File(['image'], 'receipt.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(screen.getByAltText('Receipt preview')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(screen.getByText('Several totals were found. Enter the correct amount.')).toBeTruthy())
    expect(screen.getByLabelText('Amount').getAttribute('value')).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(screen.getByTestId('draft-count').textContent).toBe('0')
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(screen.getByText('Discard this draft?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(confirmExpenseDraft).not.toHaveBeenCalled()
  })

  it('releases the selected image when an unconfirmed capture is discarded', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Receipt Capture' }))
    fireEvent.change(screen.getByLabelText('Choose receipt image'), {
      target: { files: [new File(['image'], 'receipt.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(screen.getByAltText('Receipt preview')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(screen.getByText('Discard this draft?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:receipt'))
    expect(readReceiptImage).not.toHaveBeenCalled()
  })
})
