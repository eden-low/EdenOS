import {
  normalizeBatchScreenshotExtraction,
  screenshotExtractionToCandidates,
  type BatchScreenshotCandidateResult,
} from '../domain/batchScreenshotTransactions'
import { MAX_BATCH_TRANSACTIONS } from '../domain/batchTransactions'
import { firebaseInitialization } from '../lib/firebase'
import type { ReceiptOcrErrorCode } from './receiptOcrService'

export type BatchScreenshotErrorCode = ReceiptOcrErrorCode | 'no-rows' | 'too-many'

export class BatchScreenshotError extends Error {
  readonly code: BatchScreenshotErrorCode

  constructor(code: BatchScreenshotErrorCode) {
    super(code)
    this.code = code
  }
}

const serverCodes = new Set<BatchScreenshotErrorCode>([
  'auth', 'unsupported', 'too-large', 'invalid', 'not-configured', 'provider',
])

export async function readBatchTransactionScreenshot(
  image: Blob,
  signal?: AbortSignal,
): Promise<BatchScreenshotCandidateResult> {
  if (firebaseInitialization.status !== 'ready') throw new BatchScreenshotError('auth')
  const user = firebaseInitialization.services.auth.currentUser
  if (!user) throw new BatchScreenshotError('auth')
  const body = new FormData()
  body.append('image', image, 'transaction-history-screenshot')
  let response: Response
  try {
    response = await fetch('/.netlify/functions/batch-transactions-screenshot', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      body,
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new BatchScreenshotError('network')
  }
  const value: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = value && typeof value === 'object' && 'code' in value ? value.code : null
    throw new BatchScreenshotError(typeof code === 'string' && serverCodes.has(code as BatchScreenshotErrorCode)
      ? code as BatchScreenshotErrorCode : 'provider')
  }
  const extraction = normalizeBatchScreenshotExtraction(value)
  if (!extraction) throw new BatchScreenshotError('provider')
  if (extraction.totalVisibleRows > MAX_BATCH_TRANSACTIONS || extraction.rows.length > MAX_BATCH_TRANSACTIONS) {
    throw new BatchScreenshotError('too-many')
  }
  if (extraction.rows.length === 0) throw new BatchScreenshotError('no-rows')
  try {
    return screenshotExtractionToCandidates(extraction)
  } catch (error) {
    if (error instanceof Error && error.message === 'too-many') throw new BatchScreenshotError('too-many')
    throw new BatchScreenshotError('provider')
  }
}
