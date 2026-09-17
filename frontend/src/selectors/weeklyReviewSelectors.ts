import { addLocalWeeks, startOfLocalWeek } from '../lib/date'
import { expenseCategories, type ExpenseCategory, type ExpenseRecord, type ExerciseRecord } from '../types/records'

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
  }
}

export function selectWeeklyReview(
  expenses: ExpenseRecord[],
  exerciseRecords: ExerciseRecord[],
  selectedDate: Date,
): WeeklyReviewSummary {
  const weekStart = startOfLocalWeek(selectedDate)
  const nextWeek = addLocalWeeks(weekStart, 1)
  const isInWeek = (occurredAt: string) => {
    const date = new Date(occurredAt)
    return date >= weekStart && date < nextWeek
  }
  const weeklyExpenses = expenses.filter((expense) => isInWeek(expense.occurredAt))
  const weeklyExercise = exerciseRecords
    .filter((exercise) => isInWeek(exercise.occurredAt))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))

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

  return {
    expenses: {
      count: weeklyExpenses.length,
      spentSen: weeklyExpenses.reduce((total, expense) => total + expense.amountSen, 0),
      categories,
    },
    exercise: {
      count: weeklyExercise.length,
      durationSeconds: weeklyExercise.reduce((total, exercise) => total + exercise.durationSeconds, 0),
      sessions: weeklyExercise,
    },
  }
}
