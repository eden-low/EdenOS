import { describe, expect, it, vi } from 'vitest'
import type { BatchTransactionCandidate } from '../domain/batchTransactions'
import { confirmBatchTransactions } from './batchTransactionImport'

function candidate(overrides: Partial<BatchTransactionCandidate> = {}): BatchTransactionCandidate {
  return {
    tempId: 'batch-1', sourceLine: 1, direction: 'expense', amountSen: 1850, amountInput: '18.50',
    date: '2026-09-02', description: 'Lunch', category: 'food', note: '', dateDefaulted: false, duplicate: false,
    ...overrides,
  }
}

describe('confirmBatchTransactions', () => {
  it('writes mixed rows through their existing domain writers', async () => {
    const createExpense = vi.fn(async () => undefined)
    const createIncome = vi.fn(async () => undefined)
    const results = await confirmBatchTransactions([
      candidate(),
      candidate({ tempId: 'batch-2', direction: 'income', amountSen: 500000, amountInput: '5000.00', description: 'Salary', category: 'salary' }),
    ], { createExpense, createIncome })
    expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({ amountSen: 1850, title: 'Lunch', source: 'manual' }))
    expect(createIncome).toHaveBeenCalledWith(expect.objectContaining({ amountSen: 500000, description: 'Salary' }))
    expect(results.every((result) => result.status === 'success')).toBe(true)
  })

  it('reports per-row failures and continues safely', async () => {
    const results = await confirmBatchTransactions([
      candidate(),
      candidate({ tempId: 'batch-2', direction: 'income', description: 'Salary', category: 'salary' }),
    ], {
      createExpense: vi.fn(async () => { throw new Error('Expense unavailable') }),
      createIncome: vi.fn(async () => undefined),
    })
    expect(results).toEqual([
      { tempId: 'batch-1', status: 'failed', message: 'Expense unavailable' },
      { tempId: 'batch-2', status: 'success' },
    ])
  })

  it('does not rewrite rows already known to have succeeded', async () => {
    const createExpense = vi.fn(async () => undefined)
    const results = await confirmBatchTransactions([candidate()], { createExpense, createIncome: vi.fn() }, new Set(['batch-1']))
    expect(results).toEqual([])
    expect(createExpense).not.toHaveBeenCalled()
  })

  it('never writes an unresolved invalid row', async () => {
    const createExpense = vi.fn()
    const results = await confirmBatchTransactions([candidate({ amountSen: null, amountInput: 'bad' })], { createExpense, createIncome: vi.fn() })
    expect(createExpense).not.toHaveBeenCalled()
    expect(results[0]).toEqual(expect.objectContaining({ status: 'failed' }))
  })
})
