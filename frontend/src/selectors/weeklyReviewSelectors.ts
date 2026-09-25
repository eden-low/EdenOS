import { addLocalWeeks, startOfLocalWeek } from '../lib/date'
import { expenseCategories, type ExpenseCategory, type ExpenseRecord, type ExerciseRecord, type IncomeRecord } from '../types/records'
import type { AnimeProgress } from '../types/anime'

export interface WeeklyReviewSummary {
  expenses: {
    count: number
    spentSen: number
    categories: Array<{ category: ExpenseCategory; count: number; spentSen: number }>
  }
  exercise: {
    count: number
    durationSeconds: number
    sessions: ExerciseRecord[]
    distanceMetres: number
    durationChangePercent: number | null
  }
  finance: { incomeSen: number; spentSen: number; netSen: number; spendingChangePercent: number | null }
  anime: { progressed: AnimeProgress[]; completed: AnimeProgress[] }
}

export function selectWeeklyReview(
  expenses: ExpenseRecord[],
  exerciseRecords: ExerciseRecord[],
  selectedDate: Date,
  incomes: IncomeRecord[] = [],
  animeProgress: AnimeProgress[] = [],
): WeeklyReviewSummary {
  const weekStart = startOfLocalWeek(selectedDate)
  const nextWeek = addLocalWeeks(weekStart, 1)
  const previousWeek = addLocalWeeks(weekStart, -1)
  const isInWeek = (occurredAt: string) => {
    const date = new Date(occurredAt)
    return date >= weekStart && date < nextWeek
  }
  const weeklyExpenses = expenses.filter((expense) => isInWeek(expense.occurredAt))
  const weeklyExercise = exerciseRecords
    .filter((exercise) => isInWeek(exercise.occurredAt))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
  const previousExpenses = expenses.filter((expense) => { const date = new Date(expense.occurredAt); return date >= previousWeek && date < weekStart })
  const previousExercise = exerciseRecords.filter((exercise) => { const date = new Date(exercise.occurredAt); return date >= previousWeek && date < weekStart })
  const weeklyIncomes = incomes.filter((income) => isInWeek(income.occurredAt))
  const weeklyAnime = animeProgress.filter((item) => { const updated = new Date(item.updatedAt); return updated >= weekStart && updated < nextWeek })

  const categories = expenseCategories
    .map((category) => {
      const records = weeklyExpenses.filter((expense) => expense.category === category)
      return {
        category,
        count: records.length,
        spentSen: records.reduce((total, expense) => total + expense.amountSen, 0),
      }
    })
    .filter((category) => category.count > 0)
    .sort((left, right) => right.spentSen - left.spentSen)

  const spentSen = weeklyExpenses.reduce((total, expense) => total + expense.amountSen, 0)
  const incomeSen = weeklyIncomes.reduce((total, income) => total + income.amountSen, 0)
  const previousSpentSen = previousExpenses.reduce((total, expense) => total + expense.amountSen, 0)
  const durationSeconds = weeklyExercise.reduce((total, exercise) => total + exercise.durationSeconds, 0)
  const previousDurationSeconds = previousExercise.reduce((total, exercise) => total + exercise.durationSeconds, 0)
  return {
    expenses: {
      count: weeklyExpenses.length,
      spentSen,
      categories,
    },
    exercise: {
      count: weeklyExercise.length,
      durationSeconds,
      sessions: weeklyExercise,
      distanceMetres: weeklyExercise.reduce((total, exercise) => total + (exercise.distanceMetres ?? 0), 0),
      durationChangePercent: previousDurationSeconds > 0 ? Math.round((durationSeconds - previousDurationSeconds) / previousDurationSeconds * 100) : null,
    },
    finance: { incomeSen, spentSen, netSen: incomeSen - spentSen, spendingChangePercent: previousSpentSen > 0 ? Math.round((spentSen - previousSpentSen) / previousSpentSen * 100) : null },
    anime: { progressed: weeklyAnime, completed: weeklyAnime.filter((item) => item.trackingStatus === 'completed') },
  }
}
