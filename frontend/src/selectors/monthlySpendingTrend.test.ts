import { describe, expect, it } from 'vitest'
import type { ExpenseRecord } from '../types/records'
import { selectMonthlySpendingTrend } from './monthlySpendingTrend'

function expense(id: string, amountSen: number, occurredAt: string): ExpenseRecord {
  return { id, amountSen, occurredAt, category: 'food', title: id, createdAt: occurredAt, updatedAt: occurredAt, source: 'manual' }
}

describe('monthly spending trend selector', () => {
  it('builds exact integer-sen cumulative points and carries zero-spend days forward', () => {
    const result = selectMonthlySpendingTrend([
      expense('day-one', 101, '2026-09-01T08:00:00+08:00'),
      expense('day-three-a', 200, '2026-09-03T08:00:00+08:00'),
      expense('day-three-b', 99, '2026-09-03T12:00:00+08:00'),
      expense('day-five', 50, '2026-09-05T08:00:00+08:00'),
    ], new Date(2026, 8, 5, 16))

    expect(result.current).toEqual([
      { day: 1, cumulativeSen: 101 },
      { day: 2, cumulativeSen: 101 },
      { day: 3, cumulativeSen: 400 },
      { day: 4, cumulativeSen: 400 },
      { day: 5, cumulativeSen: 450 },
    ])
  })

  it('compares previous-month spending by day of month when data exists', () => {
    const result = selectMonthlySpendingTrend([
      expense('aug-one', 500, '2026-08-01T08:00:00+08:00'),
      expense('aug-three', 250, '2026-08-03T08:00:00+08:00'),
    ], new Date(2026, 8, 5, 16))

    expect(result.previous).toEqual([
      { day: 1, cumulativeSen: 500 },
      { day: 2, cumulativeSen: 500 },
      { day: 3, cumulativeSen: 750 },
      { day: 4, cumulativeSen: 750 },
      { day: 5, cumulativeSen: 750 },
    ])
  })

  it('omits the comparison series when the previous month has no expenses', () => {
    const result = selectMonthlySpendingTrend([expense('current', 500, '2026-09-01T08:00:00+08:00')], new Date(2026, 8, 5, 16))
    expect(result.previous).toBeNull()
  })

  it('keeps records on the correct side of a month boundary', () => {
    const result = selectMonthlySpendingTrend([
      expense('feb-end', 700, '2026-02-28T20:00:00+08:00'),
      expense('mar-one', 300, '2026-03-01T00:15:00+08:00'),
      expense('mar-two', 200, '2026-03-02T23:30:00+08:00'),
    ], new Date(2026, 2, 2, 23, 45))

    expect(result.current).toEqual([{ day: 1, cumulativeSen: 300 }, { day: 2, cumulativeSen: 500 }])
    expect(result.previous).toEqual([{ day: 1, cumulativeSen: 0 }, { day: 2, cumulativeSen: 0 }])
  })
})
