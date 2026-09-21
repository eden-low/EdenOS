import { candidateIssues, type BatchTransactionCandidate } from '../domain/batchTransactions'
import { combineLocalDateTime } from '../lib/date'
import type { ExpenseCategory, ExpenseData, IncomeCategory, IncomeData } from '../types/records'

export type BatchWriteStatus = 'success' | 'failed'

export interface BatchWriteResult {
  tempId: string
  status: BatchWriteStatus
  message?: string
}

export interface BatchTransactionWriters {
  createExpense: (data: ExpenseData) => Promise<void>
  createIncome: (data: IncomeData) => Promise<void>
}

function safeMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message : 'This transaction could not be saved.'
}

function occurredAt(candidate: BatchTransactionCandidate): string {
  const value = combineLocalDateTime(candidate.date, '12:00')
  if (!value) throw new Error('Choose a valid date before confirming.')
  return value
}

export async function confirmBatchTransactions(
  candidates: BatchTransactionCandidate[],
  writers: BatchTransactionWriters,
  alreadySuccessful = new Set<string>(),
): Promise<BatchWriteResult[]> {
  const results: BatchWriteResult[] = []
  for (const candidate of candidates) {
    if (alreadySuccessful.has(candidate.tempId)) continue
    const issues = candidateIssues(candidate)
    if (issues.length > 0 || candidate.amountSen === null || candidate.direction === null) {
      results.push({ tempId: candidate.tempId, status: 'failed', message: issues[0] ?? 'Resolve this row before confirming.' })
      continue
    }
    try {
      if (candidate.direction === 'income') {
        await writers.createIncome({
          amountSen: candidate.amountSen,
          category: candidate.category as IncomeCategory,
          description: candidate.description.trim(),
          note: candidate.note.trim() || undefined,
          occurredAt: occurredAt(candidate),
        })
      } else {
        await writers.createExpense({
          amountSen: candidate.amountSen,
          category: candidate.category as ExpenseCategory,
          title: candidate.description.trim(),
          note: candidate.note.trim() || undefined,
          occurredAt: occurredAt(candidate),
          source: 'manual',
        })
      }
      results.push({ tempId: candidate.tempId, status: 'success' })
    } catch (error) {
      results.push({ tempId: candidate.tempId, status: 'failed', message: safeMessage(error) })
    }
  }
  return results
}
