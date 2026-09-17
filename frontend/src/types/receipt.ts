export interface ReceiptExtractionResponse {
  merchant: string | null
  amountSen: number | null
  receiptDate: string | null
  amountIssue: 'missing' | 'ambiguous' | null
  fallbackUsed: boolean
}

export interface ReceiptCandidate {
  title: string
  amountSen?: number
  occurredAt?: string
  amountIssue?: 'missing' | 'ambiguous'
}
