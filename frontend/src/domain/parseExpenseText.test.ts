import { describe, expect, it } from 'vitest'
import { localDateKey } from '../lib/date'
import { parseExpenseText, type ExpenseTextParseFailure } from './parseExpenseText'

const referenceDate = new Date(2026, 8, 17, 14, 35, 42)

function parsed(input: string, date = referenceDate) {
  const result = parseExpenseText(input, date)
  if (!result.ok) throw new Error(`Unexpected parse failure: ${result.reason}`)
  return result.data
}

describe('simple Expense text', () => {
  it.each([
    ['lunch 12.50', 'lunch', 1250],
    ['coffee RM6.80', 'coffee', 680],
    ['grab 18', 'grab', 1800],
    ['dinner 25 yesterday', 'dinner', 2500],
    ['parking RM 4.50 today', 'parking', 450],
    ['coffee rm6.80', 'coffee', 680],
    ['coffee rM 6.80', 'coffee', 680],
    ['  lunch   RM 12.30  ', 'lunch', 1230],
    ['lunch RM12', 'lunch', 1200],
  ])('parses %s into one text-sourced Expense candidate', (input, title, amountSen) => {
    expect(parsed(input)).toMatchObject({
      title, amountSen, category: 'food', source: 'text',
    })
  })

  it('uses the current local minute for an unstated or today date', () => {
    const expected = new Date(2026, 8, 17, 14, 35).toISOString()
    expect(parsed('lunch 12.50').occurredAt).toBe(expected)
    expect(parsed('lunch 12.50 today').occurredAt).toBe(expected)
  })

  it('derives yesterday from the reference local calendar date across year end', () => {
    const afterMidnight = new Date(2026, 0, 1, 0, 10)
    const candidate = parsed('dinner 25 yesterday', afterMidnight)
    expect(candidate.occurredAt).toBe(new Date(2025, 11, 31, 0, 10).toISOString())
    expect(localDateKey(new Date(candidate.occurredAt))).toBe('2025-12-31')
  })
})

describe('recoverable parse failures', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['lunch', 'missing-amount'],
    ['lunch today', 'missing-amount'],
    ['lunch 0', 'non-positive-amount'],
    ['lunch RM0.00', 'non-positive-amount'],
    ['lunch -3', 'non-positive-amount'],
    ['lunch 12.345', 'invalid-amount'],
    ['lunch 12..50', 'invalid-amount'],
    ['lunch 90071992547410', 'amount-too-large'],
    ['lunch 12 30', 'ambiguous'],
    ['lunch 12.50 tomorrow', 'ambiguous'],
    ['lunch today 12.50', 'ambiguous'],
    ['RM12.50', 'missing-description'],
  ] as Array<[string, ExpenseTextParseFailure]>)('%s -> %s', (input, reason) => {
    expect(parseExpenseText(input, referenceDate)).toEqual({ ok: false, reason })
  })
})
