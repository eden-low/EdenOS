import { expenseCategories, type ExpenseCategory, type ExpenseSource } from '../types/records'

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  food: 'Food',
  transport: 'Transport',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  housing: 'Housing',
  health: 'Health',
  education: 'Education',
  other: 'Other',
}

export const expenseCategoryOptions = expenseCategories.map((value) => ({
  value,
  label: expenseCategoryLabels[value],
}))

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && expenseCategories.includes(value as ExpenseCategory)
}

export function isExpenseSource(value: unknown): value is ExpenseSource {
  return value === 'manual' || value === 'text' || value === 'photo'
}
