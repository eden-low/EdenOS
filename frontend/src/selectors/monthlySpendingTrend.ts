import type { ExpenseRecord } from '../types/records'

export interface MonthlySpendingPoint {
  day: number
  cumulativeSen: number
}

export interface MonthlySpendingTrend {
  currentMonthLabel: string
  previousMonthLabel: string
  current: MonthlySpendingPoint[]
  previous: MonthlySpendingPoint[] | null
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' }).format(date)
}

function dailyTotals(records: ExpenseRecord[], year: number, month: number): Map<number, number> {
  const totals = new Map<number, number>()
  for (const record of records) {
    const date = new Date(record.occurredAt)
    if (date.getFullYear() !== year || date.getMonth() !== month) continue
    totals.set(date.getDate(), (totals.get(date.getDate()) ?? 0) + record.amountSen)
  }
  return totals
}

function cumulativePoints(totals: Map<number, number>, lastDay: number): MonthlySpendingPoint[] {
  let cumulativeSen = 0
  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1
    cumulativeSen += totals.get(day) ?? 0
    return { day, cumulativeSen }
  })
}

export function selectMonthlySpendingTrend(expenses: ExpenseRecord[], referenceDate: Date): MonthlySpendingTrend {
  const currentYear = referenceDate.getFullYear()
  const currentMonth = referenceDate.getMonth()
  const previousDate = new Date(currentYear, currentMonth - 1, 1)
  const previousLastDay = new Date(previousDate.getFullYear(), previousDate.getMonth() + 1, 0).getDate()
  const currentTotals = dailyTotals(expenses, currentYear, currentMonth)
  const previousTotals = dailyTotals(expenses, previousDate.getFullYear(), previousDate.getMonth())
  const comparisonDay = Math.min(referenceDate.getDate(), previousLastDay)

  return {
    currentMonthLabel: monthLabel(referenceDate),
    previousMonthLabel: monthLabel(previousDate),
    current: cumulativePoints(currentTotals, referenceDate.getDate()),
    previous: previousTotals.size > 0 ? cumulativePoints(previousTotals, comparisonDay) : null,
  }
}
