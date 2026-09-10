import { isExpenseCategory, isExpenseSource } from '../domain/expense'
import type { ExpenseRecord } from '../types/records'

export const expenseStorageKey = 'edenos.expenses.v1'

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
}

function isExpenseRecord(value: unknown): value is ExpenseRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<ExpenseRecord>

  return (
    typeof record.id === 'string' &&
    Number.isSafeInteger(record.amountSen) &&
    (record.amountSen ?? 0) > 0 &&
    isExpenseCategory(record.category) &&
    typeof record.title === 'string' &&
    record.title.trim().length > 0 &&
    (record.note === undefined || typeof record.note === 'string') &&
    isValidDate(record.occurredAt) &&
    isValidDate(record.createdAt) &&
    isValidDate(record.updatedAt) &&
    isExpenseSource(record.source)
  )
}

function cloneRecords(records: ExpenseRecord[]): ExpenseRecord[] {
  return records.map((record) => ({ ...record }))
}

export const recordStorage = {
  loadExpenses(fallback: ExpenseRecord[]): ExpenseRecord[] {
    if (typeof window === 'undefined') return cloneRecords(fallback)

    try {
      const stored = window.localStorage.getItem(expenseStorageKey)
      if (!stored) return cloneRecords(fallback)

      const parsed: unknown = JSON.parse(stored)
      return Array.isArray(parsed) && parsed.every(isExpenseRecord)
        ? parsed
        : cloneRecords(fallback)
    } catch {
      return cloneRecords(fallback)
    }
  },

  saveExpenses(records: ExpenseRecord[]): void {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(expenseStorageKey, JSON.stringify(records))
    } catch {
      // Persistence is a temporary convenience; in-memory state remains usable.
    }
  },
}
