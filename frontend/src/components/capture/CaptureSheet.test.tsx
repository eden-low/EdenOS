import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordsContext, type RecordsContextValue } from '../../state/recordsContextDefinition'
import type { ExpenseData, ExpenseDraft, ExerciseData, ExerciseDraft, RecordDraft } from '../../types/records'
import type { ReceiptCandidate } from '../../types/receipt'
import type { FitnessScreenshotCandidate } from '../../types/fitnessScreenshot'
import { CaptureSheet } from './CaptureSheet'

const { readReceiptImage } = vi.hoisted(() => ({
  readReceiptImage: vi.fn(async (): Promise<ReceiptCandidate> => ({ title: 'STARBUCKS', amountSen: 1590 })),
}))
const { readFitnessScreenshot } = vi.hoisted(() => ({
  readFitnessScreenshot: vi.fn(async (): Promise<FitnessScreenshotCandidate> => ({
    source: 'fitness_screenshot', activity: 'Running', durationSeconds: 1800,
    occurredAt: '2026-09-18T07:30:00.000Z', metricsSource: 'Apple Fitness',
    reportedActiveCaloriesKcal: 382, needsEdit: false,
  })),
}))
vi.mock('../../services/receiptOcrService', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/receiptOcrService')>(), readReceiptImage,
}))
vi.mock('../../services/fitnessScreenshotService', () => ({ readFitnessScreenshot }))

const confirmExpenseDraft = vi.fn(async (): Promise<void> => undefined)
const confirmExerciseDraft = vi.fn(async (): Promise<void> => undefined)

function Harness() {
  const [drafts, setDrafts] = useState<RecordDraft[]>([])
  const value = {
    expenses: [], incomes: [], exerciseRecords: [], drafts,
    expenseStatus: 'loaded', expenseError: null,
    incomeStatus: 'loaded', incomeError: null,
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
    createExerciseDraft(data: ExerciseData) {
      const draft: ExerciseDraft = {
        id: 'exercise-draft', kind: 'exercise', status: 'draft', data,
        createdAt: data.occurredAt, updatedAt: data.occurredAt,
      }
      setDrafts((current) => [...current, draft])
      return draft.id
    },
    updateExerciseDraft(id: string, data: ExerciseData) {
      setDrafts((current) => current.map((draft) =>
        draft.kind === 'exercise' && draft.id === id ? { ...draft, data } : draft,
      ))
    },
    confirmExerciseDraft,
    retryExpenseSubscription: vi.fn(),
    retryIncomeSubscription: vi.fn(),
    retryExerciseSubscription: vi.fn(),
    updateExpense: vi.fn(async () => undefined),
    createExpense: vi.fn(async () => undefined),
    deleteExpense: vi.fn(async () => undefined),
    createIncome: vi.fn(async () => undefined),
    updateIncome: vi.fn(async () => undefined),
    deleteIncome: vi.fn(async () => undefined),
    updateExercise: vi.fn(async () => undefined),
    deleteExercise: vi.fn(async () => undefined),
  } as RecordsContextValue

  return <RecordsContext.Provider value={value}>
    <CaptureSheet><button type="button">Capture</button></CaptureSheet>
    <output data-testid="draft-count">{drafts.length}</output>
    <output data-testid="draft-data">{
      drafts[0]?.kind === 'expense'
        ? `${drafts[0].data.amountSen}:${drafts[0].data.source}:${drafts[0].data.title}`
        : drafts[0]?.kind === 'exercise'
          ? `${drafts[0].data.activity}:${drafts[0].data.durationSeconds}:${drafts[0].data.source}`
          : ''
    }</output>
    <output data-testid="draft-intensity">{drafts[0]?.kind === 'exercise' ? drafts[0].data.intensity ?? 'default' : ''}</output>
  </RecordsContext.Provider>
}

beforeEach(() => {
  confirmExpenseDraft.mockReset()
  confirmExpenseDraft.mockResolvedValue(undefined)
  confirmExerciseDraft.mockReset()
  confirmExerciseDraft.mockResolvedValue(undefined)
  readReceiptImage.mockClear()
  readFitnessScreenshot.mockClear()
  URL.createObjectURL = vi.fn(() => 'blob:receipt')
  URL.revokeObjectURL = vi.fn()
})

function openExpenseForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
  fireEvent.click(screen.getByRole('button', { name: 'Expense Manual' }))
}

function openExerciseReview(text: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
  fireEvent.click(screen.getByRole('button', { name: 'Exercise Text' }))
  fireEvent.change(screen.getByLabelText('What exercise did you do?'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
}

describe('Capture prototype', () => {
  it('groups all existing methods by domain with clear labels', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    const expense = screen.getByRole('region', { name: 'Expense' })
    const exercise = screen.getByRole('region', { name: 'Exercise' })
    expect(within(expense).getAllByRole('button').map((button) => button.getAttribute('aria-label')))
      .toEqual(['Expense Manual', 'Expense Text', 'Expense Receipt'])
    expect(within(exercise).getAllByRole('button').map((button) => button.getAttribute('aria-label')))
      .toEqual(['Exercise Manual', 'Exercise Text', 'Exercise Fitness Screenshot'])
  })

  it('reviews a screenshot candidate and writes only after explicit confirmation', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exercise Fitness Screenshot' }))
    fireEvent.change(screen.getByLabelText('Choose fitness screenshot'), {
      target: { files: [new File(['png'], 'workout.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Review exercise')).toBeTruthy()
    expect(screen.getByText(/Active Calories · 382 kcal/)).toBeTruthy()
    expect(screen.getByTestId('draft-data').textContent).toBe('Running:1800:fitness_screenshot')
    expect(confirmExerciseDraft).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm exercise' }))
    await waitFor(() => expect(confirmExerciseDraft).toHaveBeenCalledOnce())
  })

  it('sends a partial screenshot candidate to edit and cancel never writes', async () => {
    readFitnessScreenshot.mockResolvedValueOnce({ source: 'fitness_screenshot', activity: 'Rowing',
      needsEdit: true, issue: 'Check the extracted fields.' })
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exercise Fitness Screenshot' }))
    fireEvent.change(screen.getByLabelText('Choose fitness screenshot'), {
      target: { files: [new File(['png'], 'workout.png', { type: 'image/png' })] },
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' }).hasAttribute('disabled')).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Edit screenshot exercise')).toBeTruthy()
    expect(screen.getByLabelText('Activity').getAttribute('value')).toBe('Rowing')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(confirmExerciseDraft).not.toHaveBeenCalled()
    expect(screen.getByTestId('draft-count').textContent).toBe('0')
  })

  it('rejects unsupported and oversized screenshot inputs before extraction', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exercise Fitness Screenshot' }))
    const input = screen.getByLabelText('Choose fitness screenshot')
    fireEvent.change(input, { target: { files: [new File(['x'], 'workout.txt', { type: 'text/plain' })] } })
    expect((await screen.findByRole('alert')).textContent).toContain('JPEG, PNG, or WebP')
    const oversized = new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [oversized] } })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('too large'))
    expect(readFitnessScreenshot).not.toHaveBeenCalled()
  })

  it('starts press feedback on pointer down and clears it on cancellation or release', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    const method = screen.getByRole('button', { name: 'Exercise Text' })

    fireEvent.pointerDown(method, { pointerType: 'touch' })
    expect(method.getAttribute('data-pressed')).toBe('true')
    fireEvent.pointerCancel(method, { pointerType: 'touch' })
    expect(method.hasAttribute('data-pressed')).toBe(false)
    expect(screen.getByRole('region', { name: 'Exercise' })).toBeTruthy()

    fireEvent.pointerDown(method, { pointerType: 'mouse' })
    fireEvent.pointerUp(method, { pointerType: 'mouse' })
    expect(method.hasAttribute('data-pressed')).toBe(false)
  })

  it('returns focus to Capture after Escape', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Capture' })
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('shows pending only while the confirmed write is unresolved, then acknowledges success', async () => {
    let completeWrite: (() => void) | undefined
    confirmExerciseDraft.mockImplementationOnce(() => new Promise<void>((resolve) => {
      completeWrite = resolve
    }))
    render(<Harness />)
    openExerciseReview('跑步1h30')

    const confirm = screen.getByRole('button', { name: 'Confirm exercise' })
    fireEvent.click(confirm)
    expect(confirmExerciseDraft).toHaveBeenCalledOnce()
    const pendingButton = screen.getByRole('button', { name: 'Confirming…' })
    expect(pendingButton.hasAttribute('disabled')).toBe(true)
    fireEvent.click(pendingButton)
    expect(confirmExerciseDraft).toHaveBeenCalledOnce()
    expect(screen.getByText('Review exercise')).toBeTruthy()
    expect(screen.queryByText('Exercise saved')).toBeNull()

    completeWrite?.()
    await waitFor(() => expect(screen.queryByText('Review exercise')).toBeNull())
    expect(screen.getByText('Exercise saved').getAttribute('role')).toBe('status')
  })

  it('keeps the reviewed draft and error visible when a confirmed write fails', async () => {
    confirmExerciseDraft.mockRejectedValueOnce(new Error('write failed'))
    render(<Harness />)
    openExerciseReview('羽毛球1.5小时')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm exercise' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(screen.getByText('Review exercise')).toBeTruthy()
    expect(screen.getByTestId('draft-count').textContent).toBe('1')
    expect(screen.getByTestId('draft-data').textContent).toBe('Badminton:5400:text')
    expect(screen.queryByText('Exercise saved')).toBeNull()
    expect(screen.getByRole('button', { name: 'Confirm exercise' }).hasAttribute('disabled')).toBe(false)
  })
})

describe('Capture discard confirmation', () => {
  it('asks before closing a dirty form', () => {
    render(<Harness />)
    openExpenseForm()
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))

    expect(screen.getByText('Discard this draft?')).toBeTruthy()
    expect(document.querySelector('.confirmation-overlay')).not.toBeNull()
    expect(document.querySelector('.confirmation-dialog')).not.toBeNull()
    expect(document.querySelector('.capture-dialog')).not.toBeNull()
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

  it('lets Escape cancel nested Discard without closing the parent draft', async () => {
    render(<Harness />)
    openExpenseForm()
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))

    expect(screen.getByRole('dialog', { name: 'Discard this draft?' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Discard this draft?' })).toBeNull())
    expect(screen.getByLabelText('Amount')).toBeTruthy()
    expect(screen.getByLabelText<HTMLInputElement>('Amount').value).toBe('12.34')
  })
})

describe('Text Capture', () => {
  it('sends a parsed candidate through the existing editable Review and explicit Confirm flow', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expense Text' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Expense Text' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Expense Receipt' }))
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
    readReceiptImage.mockResolvedValueOnce({ title: 'SHOP', amountIssue: 'ambiguous' })
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expense Receipt' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Expense Receipt' }))
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

describe('Exercise text capture', () => {
  it('keeps a supported intensity choice on the reviewed Exercise draft', () => {
    render(<Harness />)
    openExerciseReview('Badminton 30 min')
    const select = screen.getByLabelText('Intensity') as HTMLSelectElement
    expect(select.value).toBe('moderate')
    fireEvent.change(select, { target: { value: 'vigorous' } })
    expect(screen.getByTestId('draft-intensity').textContent).toBe('vigorous')
    expect(screen.getByText(/Add body weight in Account/)).toBeTruthy()
  })

  it('reviews a compact hour-minute duration without an automatic write', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exercise Text' }))
    const shell = screen.getByRole('dialog')
    fireEvent.change(screen.getByLabelText('What exercise did you do?'), {
      target: { value: '跑步1h30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('dialog')).toBe(shell)
    expect(screen.getByText('Review exercise')).toBeTruthy()
    expect(screen.getByText('1 hr 30 min')).toBeTruthy()
    expect(screen.queryByText('5400')).toBeNull()
    expect(screen.getByTestId('draft-data').textContent).toBe('Running:5400:text')
    expect(confirmExerciseDraft).not.toHaveBeenCalled()
  })

  it('creates a text candidate for Review, keeps Edit normalized, and writes only after Confirm', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exercise Text' }))
    fireEvent.change(screen.getByLabelText('What exercise did you do?'), {
      target: { value: '羽毛球1.5小时' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByTestId('draft-data').textContent).toBe('Badminton:5400:text')
    expect(screen.getByText('Review exercise')).toBeTruthy()
    expect(screen.getByText('1 hr 30 min')).toBeTruthy()
    expect(confirmExerciseDraft).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect((screen.getByLabelText('Duration') as HTMLInputElement).value).toBe('1 hr 30 min')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(screen.getByTestId('draft-data').textContent).toBe('Badminton:5400:text')
    expect(confirmExerciseDraft).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm exercise' }))
    await waitFor(() => expect(confirmExerciseDraft).toHaveBeenCalledWith('exercise-draft'))
  })

  it('routes incomplete text through editable fields before it can become a draft', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Capture' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exercise Text' }))
    const shell = screen.getByRole('dialog')
    fireEvent.change(screen.getByLabelText('What exercise did you do?'), {
      target: { value: '跑步' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('dialog')).toBe(shell)
    expect(screen.getByTestId('draft-count').textContent).toBe('0')
    expect((screen.getByLabelText('Activity') as HTMLInputElement).value).toBe('Running')
    expect((screen.getByLabelText('Duration') as HTMLInputElement).value).toBe('')
    expect(confirmExerciseDraft).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '1 hr 30 min' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    expect(screen.getByTestId('draft-data').textContent).toBe('Running:5400:text')
    expect(confirmExerciseDraft).not.toHaveBeenCalled()
  })
})
