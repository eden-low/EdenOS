import { incomeCategories, type IncomeCategory } from '../types/records'

export const incomeCategoryLabels: Record<IncomeCategory, string> = {
  salary: 'Salary',
  freelance: 'Freelance',
  business: 'Business',
  investment: 'Investment',
  gift: 'Gift',
  refund: 'Refund',
  other: 'Other',
}

export const incomeCategoryOptions = incomeCategories.map((value) => ({
  value,
  label: incomeCategoryLabels[value],
}))

export function isIncomeCategory(value: unknown): value is IncomeCategory {
  return typeof value === 'string' && incomeCategories.includes(value as IncomeCategory)
}
