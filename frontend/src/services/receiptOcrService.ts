import { firebaseInitialization } from '../lib/firebase'
import { combineLocalDateTime, toLocalTimeInput } from '../lib/date'
import type { ReceiptCandidate, ReceiptExtractionResponse } from '../types/receipt'

export type ReceiptOcrErrorCode =
  | 'auth' | 'unsupported' | 'too-large' | 'invalid' | 'not-configured'
  | 'provider' | 'network'

export class ReceiptOcrError extends Error {
  readonly code: ReceiptOcrErrorCode

  constructor(code: ReceiptOcrErrorCode) {
    super(code)
    this.code = code
  }
}

const serverCodes = new Set<ReceiptOcrErrorCode>([
  'auth', 'unsupported', 'too-large', 'invalid', 'not-configured', 'provider',
])

export async function readReceiptImage(image: Blob, signal?: AbortSignal): Promise<ReceiptCandidate> {
  if (firebaseInitialization.status !== 'ready') throw new ReceiptOcrError('auth')
  const user = firebaseInitialization.services.auth.currentUser
  if (!user) throw new ReceiptOcrError('auth')

  const token = await user.getIdToken()
  const body = new FormData()
  body.append('image', image, 'receipt-image')

  let response: Response
  try {
    response = await fetch('/.netlify/functions/receipt-ocr', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ReceiptOcrError('network')
  }

  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = result && typeof result === 'object' && 'code' in result ? result.code : null
    throw new ReceiptOcrError(typeof code === 'string' && serverCodes.has(code as ReceiptOcrErrorCode)
      ? code as ReceiptOcrErrorCode
      : 'provider')
  }
  if (!result || typeof result !== 'object' ||
      !('merchant' in result) || !('amountSen' in result) ||
      !('receiptDate' in result) || !('amountIssue' in result) ||
      (result.merchant !== null && typeof result.merchant !== 'string') ||
      (result.amountSen !== null && (!Number.isSafeInteger(result.amountSen) ||
        typeof result.amountSen !== 'number' || result.amountSen <= 0)) ||
      (result.receiptDate !== null && typeof result.receiptDate !== 'string') ||
      ![null, 'missing', 'ambiguous'].includes(result.amountIssue as null)) {
    throw new ReceiptOcrError('provider')
  }
  const extracted = result as ReceiptExtractionResponse
  const occurredAt = extracted.receiptDate
    ? combineLocalDateTime(extracted.receiptDate, toLocalTimeInput(new Date()))
    : null
  return {
    title: extracted.merchant ?? '',
    amountSen: extracted.amountSen ?? undefined,
    occurredAt: occurredAt ?? undefined,
    amountIssue: extracted.amountIssue ?? undefined,
  }
}
