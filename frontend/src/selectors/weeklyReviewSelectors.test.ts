import { describe, expect, it } from 'vitest'
import type { ExpenseCategory, ExpenseRecord, ExerciseRecord } from '../types/records'
import { selectWeeklyReview } from './weeklyReviewSelectors'

const at = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).toISOString()

function expense(id: string, amountSen: number, category: ExpenseCategory, occurredAt: string): ExpenseRecord {
  return {
    id, amountSen, category, title: id, occurredAt,
    createdAt: occurredAt, updatedAt: occurredAt, source: 'manual',
  }
}

function exercise(id: string, durationSeconds: number, occurredAt: string): ExerciseRecord {
  return {
    id, activity: id, durationSeconds, occurredAt,
    createdAt: occurredAt, updatedAt: occurredAt, source: 'manual',
  }
}

describe('weekly review selectors', () => {
  const selectedDate = new Date(2026, 8, 17, 12)

  it('includes local Monday through Sunday and excludes the adjacent weeks', () => {
    const summary = selectWeeklyReview([
      expense('previous-Sunday', 999, 'food', at(2026, 9, 13, 23, 59)),
      expense('Monday', 1250, 'food', at(2026, 9, 14, 0)),
      expense('Thursday', 500, 'transport', at(2026, 9, 17)),
      expense('Sunday', 200, 'food', at(2026, 9, 20, 23, 59)),
      expense('next-Monday', 999, 'food', at(2026, 9, 21, 0)),
    ], [
      exercise('previous-Sunday', 600, at(2026, 9, 13, 23, 59)),
      exercise('Monday', 1200, at(2026, 9, 14, 0)),
      exercise('Sunday', 1800, at(2026, 9, 20, 23, 59)),
      exercise('next-Monday', 600, at(2026, 9, 21, 0)),
    ], selectedDate)

    expect(summary.expenses).toEqual({
      count: 3,
      spentSen: 1950,
      categories: [
        { category: 'food', count: 2, spentSen: 1450 },
        { category: 'transport', count: 1, spentSen: 500 },
      ],
    })
    expect(summary.exercise.count).toBe(2)
    expect(summary.exercise.durationSeconds).toBe(3000)
    expect(summary.exercise.sessions.map((session) => session.id)).toEqual(['Sunday', 'Monday'])
  })

  it('returns a successful empty week without pulling in old historical records', () => {
    const summary = selectWeeklyReview(
      [expense('old-expense', 1000, 'food', at(2026, 9, 1))],
      [exercise('old-session', 1800, at(2026, 9, 1))],
      selectedDate,
    )
    expect(summary).toEqual({
      expenses: { count: 0, spentSen: 0, categories: [] },
      exercise: { count: 0, durationSeconds: 0, sessions: [] },
    })
  })

  it('recomputes totals from the current records after an edit or deletion', () => {
    const first = expense('lunch', 1250, 'food', at(2026, 9, 17))
    const second = expense('coffee', 680, 'food', at(2026, 9, 17))
    expect(selectWeeklyReview([first, second], [], selectedDate).expenses.spentSen).toBe(1930)
    expect(selectWeeklyReview([{ ...first, amountSen: 1500 }], [], selectedDate).expenses)
      .toMatchObject({ count: 1, spentSen: 1500 })
  })
})
