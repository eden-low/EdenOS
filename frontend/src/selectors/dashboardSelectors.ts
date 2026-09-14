import { expenseCategoryLabels } from '../domain/expense'
import {
  formatDashboardDate,
  isSameLocalDay,
  isSameLocalMonth,
  relativeDayLabel,
} from '../lib/date'
import type { DashboardSummary, RecentActivityItem } from '../types/dashboard'
import type { ExpenseRecord, ExerciseRecord } from '../types/records'

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' })

function startOfWeek(date: Date): Date {
  const start = new Date(date)
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  start.setHours(0, 0, 0, 0)
  return start
}

function selectRecentActivity(
  expenses: ExpenseRecord[],
  exerciseRecords: ExerciseRecord[],
  referenceDate: Date,
): RecentActivityItem[] {
  return [
    ...expenses.map((expense) => ({
      sortAt: expense.occurredAt,
      item: {
        id: expense.id,
        type: 'finance' as const,
        title: expense.title,
        category: expenseCategoryLabels[expense.category],
        amountSen: expense.amountSen,
        occurredAt: relativeDayLabel(expense.occurredAt, referenceDate),
      },
    })),
    ...exerciseRecords.map((exercise) => ({
      sortAt: exercise.occurredAt,
      item: {
        id: exercise.id,
        type: 'exercise' as const,
        title: exercise.activity,
        distanceMetres: exercise.distanceMetres,
        durationSeconds: exercise.durationSeconds,
        occurredAt: relativeDayLabel(exercise.occurredAt, referenceDate),
      },
    })),
  ]
    .sort((left, right) => new Date(right.sortAt).getTime() - new Date(left.sortAt).getTime())
    .slice(0, 2)
    .map(({ item }) => item)
}

export function selectDashboardSummary(
  expenses: ExpenseRecord[],
  exerciseRecords: ExerciseRecord[],
  referenceDate: Date,
): DashboardSummary {
  const monthlyExpenses = expenses.filter((expense) =>
    isSameLocalMonth(new Date(expense.occurredAt), referenceDate),
  )
  const spentSen = monthlyExpenses.reduce((total, expense) => total + expense.amountSen, 0)
  const spentTodaySen = monthlyExpenses
    .filter((expense) => isSameLocalDay(new Date(expense.occurredAt), referenceDate))
    .reduce((total, expense) => total + expense.amountSen, 0)

  const weekStart = startOfWeek(referenceDate)
  const nextWeek = new Date(weekStart)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const weeklyExercise = exerciseRecords
    .filter((record) => {
      const occurredAt = new Date(record.occurredAt)
      return occurredAt >= weekStart && occurredAt < nextWeek
    })
    .sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt),
    )
  const latestExercise = weeklyExercise[0]
  const hour = referenceDate.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return {
    greeting,
    displayDate: formatDashboardDate(referenceDate),
    monthlySpending: {
      month: monthFormatter.format(referenceDate),
      spentSen,
      spentTodaySen,
    },
    exercise: {
      completedSessions: weeklyExercise.length,
      latestActivity: latestExercise
        ? {
            name: latestExercise.activity,
            distanceMetres: latestExercise.distanceMetres,
            durationSeconds: latestExercise.durationSeconds,
          }
        : null,
    },
    recentActivity: selectRecentActivity(expenses, exerciseRecords, referenceDate),
  }
}
