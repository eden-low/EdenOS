import { describe, expect, it } from 'vitest'
import { candidateIssues, MAX_BATCH_TRANSACTIONS, parseBatchTransactions, parseSignedRinggit, updateCandidateAmount } from './batchTransactions'

const today = '2026-09-21'

describe('Batch transaction parsing', () => {
  it('parses signed text Income and Expense using integer sen', () => {
    const result = parseBatchTransactions('2026-09-01 Salary +5000\n2026-09-02 Lunch -18.50', today)
    expect(result.error).toBeNull()
    expect(result.candidates).toEqual([
      expect.objectContaining({ direction: 'income', amountSen: 500000, date: '2026-09-01', description: 'Salary', category: 'salary' }),
      expect.objectContaining({ direction: 'expense', amountSen: 1850, date: '2026-09-02', description: 'Lunch', category: 'food' }),
    ])
  })

  it('parses comma and tabular rows', () => {
    const result = parseBatchTransactions('Salary,5000,2026-09-01\n2026-09-02\tGrab\t-12.40', today)
    expect(result.candidates[0]).toEqual(expect.objectContaining({ direction: 'income', amountSen: 500000, description: 'Salary' }))
    expect(result.candidates[1]).toEqual(expect.objectContaining({ direction: 'expense', amountSen: 1240, description: 'Grab', category: 'transport' }))
  })

  it('ignores blank lines and defaults a missing date visibly to today', () => {
    const result = parseBatchTransactions('\n\nGroceries -156.80\n', today)
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0]).toEqual(expect.objectContaining({ date: today, dateDefaulted: true, amountSen: 15680 }))
  })

  it('keeps malformed amounts and direction conflicts as invalid review rows', () => {
    const malformed = parseBatchTransactions('2026-09-02 Lunch -18.501', today).candidates[0]
    const conflict = parseBatchTransactions('expense Lunch +18.50', today).candidates[0]
    expect(candidateIssues(malformed).join(' ')).toMatch(/valid amount/)
    expect(conflict.direction).toBeNull()
    expect(candidateIssues(conflict).join(' ')).toMatch(/Choose Income or Expense/)
  })

  it('detects obvious duplicates without removing them', () => {
    const result = parseBatchTransactions('2026-09-02 Lunch -18.50\n2026-09-02  lunch  -18.50', today)
    expect(result.candidates).toHaveLength(2)
    expect(result.candidates.every((candidate) => candidate.duplicate)).toBe(true)
  })

  it('rejects empty and oversized batches before review', () => {
    expect(parseBatchTransactions('  \n ', today).error).toMatch(/Paste at least one/)
    const rows = Array.from({ length: MAX_BATCH_TRANSACTIONS + 1 }, (_, index) => `Item ${index} -1`).join('\n')
    const result = parseBatchTransactions(rows, today)
    expect(result.candidates).toHaveLength(0)
    expect(result.error).toContain(String(MAX_BATCH_TRANSACTIONS))
  })

  it('parses decimal Ringgit without floating-point persistence', () => {
    expect(parseSignedRinggit('18.50')).toEqual({ amountSen: 1850, direction: 'income' })
    expect(parseSignedRinggit('-12.40')).toEqual({ amountSen: 1240, direction: 'expense' })
    expect(parseSignedRinggit('1.001')).toBeNull()
  })

  it('requires review amounts to be positive after direction is selected separately', () => {
    const candidate = parseBatchTransactions('2026-09-02 Lunch -18.50', today).candidates[0]
    expect(updateCandidateAmount(candidate, '25.50').amountSen).toBe(2550)
    expect(updateCandidateAmount(candidate, '-25.50').amountSen).toBeNull()
  })
})
