import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrivacyLockContext, unlockedPrivacyLock } from '../../privacy/privacyLockContext'
import { BatchScreenshotError, readBatchTransactionScreenshot } from '../../services/batchScreenshotService'
import { useRecords } from '../../state/useRecords'
import { BatchImportDialog } from './BatchImportDialog'

vi.mock('../../state/useRecords', () => ({ useRecords: vi.fn() }))
vi.mock('../../services/batchScreenshotService', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/batchScreenshotService')>(),
  readBatchTransactionScreenshot: vi.fn(),
}))

const createExpense = vi.fn<() => Promise<void>>(async () => undefined)
const createIncome = vi.fn<() => Promise<void>>(async () => undefined)

function renderDialog(privacy = unlockedPrivacyLock) {
  return render(<PrivacyLockContext.Provider value={privacy}><BatchImportDialog open onClose={vi.fn()} /></PrivacyLockContext.Provider>)
}

function pasteAndParse(value: string) {
  fireEvent.change(screen.getByLabelText('Transactions'), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Parse Transactions' }))
}

beforeEach(() => {
  createExpense.mockReset().mockResolvedValue(undefined)
  createIncome.mockReset().mockResolvedValue(undefined)
  vi.mocked(useRecords).mockReturnValue({ createExpense, createIncome } as unknown as ReturnType<typeof useRecords>)
  vi.mocked(readBatchTransactionScreenshot).mockReset()
  URL.createObjectURL = vi.fn(() => 'blob:batch-screenshot')
  URL.revokeObjectURL = vi.fn()
})

describe('BatchImportDialog', () => {
  it('creates zero records before explicit confirmation and writes a mixed confirmed batch', async () => {
    renderDialog()
    pasteAndParse('2026-09-01 Salary +5000\n2026-09-02 Lunch -18.50')
    expect(createExpense).not.toHaveBeenCalled()
    expect(createIncome).not.toHaveBeenCalled()
    expect(screen.getByText('2', { selector: 'div' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Transactions' }))
    await waitFor(() => expect(createIncome).toHaveBeenCalledOnce())
    expect(createExpense).toHaveBeenCalledOnce()
    expect(screen.getByText('Imported 2 transactions successfully.')).toBeTruthy()
  })

  it('allows direction, amount, and date edits plus row removal before confirm', async () => {
    renderDialog()
    pasteAndParse('2026-09-01 Salary +5000\n2026-09-02 Lunch -18.50')
    fireEvent.change(screen.getByLabelText('Transaction 1 disposition'), { target: { value: 'expense' } })
    fireEvent.change(screen.getByLabelText('Transaction 1 amount'), { target: { value: '25.50' } })
    fireEvent.change(screen.getByLabelText('Transaction 1 date'), { target: { value: '2026-09-03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Remove transaction 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Transactions' }))
    await waitFor(() => expect(createExpense).toHaveBeenCalledOnce())
    expect(createIncome).not.toHaveBeenCalled()
    expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({ amountSen: 2550, title: 'Salary' }))
  })

  it('blocks confirmation while required fields remain unresolved', () => {
    renderDialog()
    pasteAndParse('2026-09-01 -18.50')
    expect(screen.getByText('Add a description or source.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm Transactions' }).hasAttribute('disabled')).toBe(true)
    expect(createExpense).not.toHaveBeenCalled()
  })

  it('guards against double submission while a write is in flight', async () => {
    let finish: (() => void) | undefined
    createExpense.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve }))
    renderDialog()
    pasteAndParse('2026-09-02 Lunch -18.50')
    const confirm = screen.getByRole('button', { name: 'Confirm Transactions' })
    fireEvent.click(confirm); fireEvent.click(confirm)
    expect(createExpense).toHaveBeenCalledOnce()
    finish?.()
    await waitFor(() => expect(screen.getByText('Imported 1 transactions successfully.')).toBeTruthy())
  })

  it('reports partial failure and retries only failed rows', async () => {
    createIncome.mockRejectedValueOnce(new Error('Income unavailable')).mockResolvedValueOnce(undefined)
    renderDialog()
    pasteAndParse('2026-09-01 Salary +5000\n2026-09-02 Lunch -18.50')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Transactions' }))
    await waitFor(() => expect(screen.getByText('1 saved. 0 ignored. 1 failed and remain available to edit or retry.')).toBeTruthy())
    expect(screen.getByText('Write failed: Income unavailable')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Back to input' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry Unsaved Transactions' }))
    await waitFor(() => expect(screen.getByText('Imported 2 transactions successfully.')).toBeTruthy())
    expect(createIncome).toHaveBeenCalledTimes(2)
    expect(createExpense).toHaveBeenCalledOnce()
  })

  it('hides review values when Financial Privacy Lock becomes locked', () => {
    const view = renderDialog()
    pasteAndParse('2026-09-01 Salary +5000')
    expect(screen.getAllByText('RM 5,000').length).toBeGreaterThan(0)
    view.rerender(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, enabled: true, locked: true, requestUnlock: vi.fn() }}><BatchImportDialog open onClose={vi.fn()} /></PrivacyLockContext.Provider>)
    expect(screen.getByText('Financial values are locked')).toBeTruthy()
    expect(screen.queryByText('RM 5,000')).toBeNull()
  })

  it('reviews multiple screenshot rows and writes only Income and Expense dispositions', async () => {
    vi.mocked(readBatchTransactionScreenshot).mockResolvedValue({
      candidates: [
        { tempId: 'screenshot-1', sourceLine: 1, direction: 'expense', amountSen: 1400, amountInput: '14.00', date: '2026-09-01', time: '09:10', description: 'Merchant', category: 'food', note: '', dateDefaulted: false, duplicate: false, extracted: true, needsReview: false },
        { tempId: 'screenshot-2', sourceLine: 2, direction: 'income', amountSen: 80000, amountInput: '800.00', date: '2026-09-01', time: '10:00', description: 'Received', category: 'other', note: '', dateDefaulted: false, duplicate: false, extracted: true, needsReview: false },
        { tempId: 'screenshot-3', sourceLine: 3, direction: 'ignore', amountSen: 1000, amountInput: '10.00', date: '2026-09-01', description: 'GO+ Quick Cash In', category: 'other', note: '', dateDefaulted: false, duplicate: false, extracted: true, needsReview: false },
      ],
      warnings: ['1 rewards or points line was excluded.'],
      totalVisibleRows: 4,
    })
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: /Upload Screenshot/ }))
    fireEvent.change(screen.getByLabelText('Choose transaction screenshot'), {
      target: { files: [new File(['image'], 'tng.png', { type: 'image/png' })] },
    })
    await screen.findByAltText('Transaction history screenshot preview')
    fireEvent.click(screen.getByRole('button', { name: 'Extract Transactions' }))
    await screen.findByDisplayValue('GO+ Quick Cash In')
    expect(createExpense).not.toHaveBeenCalled()
    expect(createIncome).not.toHaveBeenCalled()
    expect(screen.getByText('1 rewards or points line was excluded.')).toBeTruthy()
    expect(screen.getAllByText('Ignored / Transfer').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Transactions' }))
    await waitFor(() => expect(createExpense).toHaveBeenCalledOnce())
    expect(createIncome).toHaveBeenCalledOnce()
    expect(screen.getByText('2 saved. 1 ignored or treated as transfers.')).toBeTruthy()
  })

  it('shows screenshot-specific no-row extraction errors', async () => {
    vi.mocked(readBatchTransactionScreenshot).mockRejectedValue(new BatchScreenshotError('no-rows'))
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: /Upload Screenshot/ }))
    fireEvent.change(screen.getByLabelText('Choose transaction screenshot'), {
      target: { files: [new File(['image'], 'empty.png', { type: 'image/png' })] },
    })
    await screen.findByAltText('Transaction history screenshot preview')
    fireEvent.click(screen.getByRole('button', { name: 'Extract Transactions' }))
    expect(await screen.findByText(/Could not detect transaction rows/)).toBeTruthy()
  })
})
