import type { ExpenseCategory } from './records'

export interface ReceiptExtractionResponse {
  currency?: string
  originalAmount?: string
  merchant: string | null
  amountSen: number | null
  receiptDate: string | null
  category: ExpenseCategory | null
  amountIssue: 'missing' | 'ambiguous' | null
  fallbackUsed: boolean
}

export interface ReceiptCandidate {
  currency?: string
  originalAmount?: string
  title: string
  category?: ExpenseCategory
  amountSen?: number
  occurredAt?: string
  amountIssue?: 'missing' | 'ambiguous'
}
