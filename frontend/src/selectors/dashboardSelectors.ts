import { expenseCategoryLabels } from '../domain/expense'
import {
  addLocalWeeks,
  formatDashboardDate,
  isSameLocalDay,
  isSameLocalMonth,
  relativeDayLabel,
  startOfLocalWeek,
} from '../lib/date'
import type { DashboardSummary, RecentActivityItem } from '../types/dashboard'
import type { ExpenseRecord, ExerciseRecord, IncomeRecord } from '../types/records'

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' })

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
        intensity: exercise.intensity,
        distanceMetres: exercise.distanceMetres,
        durationSeconds: exercise.durationSeconds,
        reportedActiveCaloriesKcal: exercise.reportedActiveCaloriesKcal,
        reportedTotalCaloriesKcal: exercise.reportedTotalCaloriesKcal,
        metricsSource: exercise.metricsSource,
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
  incomes: IncomeRecord[] = [],
): DashboardSummary {
  const monthlyExpenses = expenses.filter((expense) =>
    isSameLocalMonth(new Date(expense.occurredAt), referenceDate),
  )
  const spentSen = monthlyExpenses.reduce((total, expense) => total + expense.amountSen, 0)
  const spentTodaySen = monthlyExpenses
    .filter((expense) => isSameLocalDay(new Date(expense.occurredAt), referenceDate))
    .reduce((total, expense) => total + expense.amountSen, 0)
  const incomeSen = incomes
    .filter((income) => isSameLocalMonth(new Date(income.occurredAt), referenceDate))
    .reduce((total, income) => total + income.amountSen, 0)

  const weekStart = startOfLocalWeek(referenceDate)
  const nextWeek = addLocalWeeks(weekStart, 1)
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
    monthlyFinance: {
      incomeSen,
      expenseSen: spentSen,
      netCashflowSen: incomeSen - spentSen,
    },
    exercise: {
      completedSessions: weeklyExercise.length,
      durationSeconds: weeklyExercise.reduce((total, item) => total + item.durationSeconds, 0),
      distanceMetres: weeklyExercise.reduce((total, item) => total + (item.distanceMetres ?? 0), 0),
      latestActivity: latestExercise
        ? {
            name: latestExercise.activity,
            intensity: latestExercise.intensity,
            distanceMetres: latestExercise.distanceMetres,
            durationSeconds: latestExercise.durationSeconds,
            reportedActiveCaloriesKcal: latestExercise.reportedActiveCaloriesKcal,
            reportedTotalCaloriesKcal: latestExercise.reportedTotalCaloriesKcal,
            metricsSource: latestExercise.metricsSource,
          }
        : null,
    },
    recentActivity: selectRecentActivity(expenses, exerciseRecords, referenceDate),
  }
}
