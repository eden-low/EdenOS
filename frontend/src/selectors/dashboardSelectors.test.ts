import { describe, expect, it } from 'vitest'
import type { ExpenseRecord, ExerciseRecord, IncomeRecord } from '../types/records'
import { selectDashboardSummary } from './dashboardSelectors'

const occurredAt = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).toISOString()

function expense(id: string, amountSen: number, at: string): ExpenseRecord {
  return {
    id,
    amountSen,
    category: 'food',
    title: id,
    occurredAt: at,
    source: 'manual',
    createdAt: at,
    updatedAt: at,
  }
}

function exercise(id: string, at: string, distanceMetres?: number): ExerciseRecord {
  return {
    id,
    activity: id,
    durationSeconds: 1800,
    ...(distanceMetres === undefined ? {} : { distanceMetres }),
    source: 'manual',
    occurredAt: at,
    createdAt: at,
    updatedAt: at,
  }
}

function income(id: string, amountSen: number, at: string): IncomeRecord {
  return { id, amountSen, category: 'salary', description: id, occurredAt: at, createdAt: at, updatedAt: at }
}

describe('Today summary', () => {
  const referenceDate = new Date(2026, 8, 17, 12)

  it('sums integer sen for the current local day and month', () => {
    const summary = selectDashboardSummary([
      expense('today', 1234, occurredAt(2026, 9, 17, 0)),
      expense('yesterday', 200, occurredAt(2026, 9, 16, 23)),
      expense('month-start', 500, occurredAt(2026, 9, 1, 0)),
      expense('previous-month', 999, occurredAt(2026, 8, 31, 23)),
      expense('next-month', 999, occurredAt(2026, 10, 1, 0)),
    ], [], referenceDate)

    expect(summary.monthlySpending).toEqual({
      month: 'September',
      spentSen: 1934,
      spentTodaySen: 1234,
    })
  })

  it('adds a current-month finance overview without treating net cashflow as savings', () => {
    const summary = selectDashboardSummary(
      [expense('expense', 1200, occurredAt(2026, 9, 17))],
      [],
      referenceDate,
      [income('salary', 5000, occurredAt(2026, 9, 1)), income('old', 9999, occurredAt(2026, 8, 1))],
    )
    expect(summary.monthlyFinance).toEqual({ incomeSen: 5000, expenseSen: 1200, netCashflowSen: 3800 })
  })

  it('counts Monday through Sunday and picks the latest exercise in that week', () => {
    const summary = selectDashboardSummary([], [
      exercise('previous-Sunday', occurredAt(2026, 9, 13, 23)),
      exercise('Monday', occurredAt(2026, 9, 14, 0)),
      exercise('Thursday', occurredAt(2026, 9, 17), 2400),
      exercise('Sunday', occurredAt(2026, 9, 20, 23)),
      exercise('next-Monday', occurredAt(2026, 9, 21, 0)),
    ], referenceDate)

    expect(summary.exercise).toEqual({
      completedSessions: 3,
      durationSeconds: 5400,
      distanceMetres: 2400,
      latestActivity: { name: 'Sunday', distanceMetres: undefined, durationSeconds: 1800 },
    })
  })

  it('never presents an old historical session as this week’s latest', () => {
    const summary = selectDashboardSummary([], [
      exercise('last-week', occurredAt(2026, 9, 10)),
    ], referenceDate)

    expect(summary.exercise).toEqual({ completedSessions: 0, durationSeconds: 0, distanceMetres: 0, latestActivity: null })
  })
})
