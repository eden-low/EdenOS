export interface ReceiptOcrResult {
  rawText: string
}

export interface ReceiptCandidate {
  title: string
  amountSen?: number
  occurredAt?: string
  amountIssue?: 'missing' | 'ambiguous'
}
