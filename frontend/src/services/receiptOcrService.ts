import { firebaseInitialization } from '../lib/firebase'
import type { ReceiptOcrResult } from '../types/receipt'

export type ReceiptOcrErrorCode =
  | 'auth' | 'unsupported' | 'too-large' | 'invalid' | 'not-configured'
  | 'empty' | 'provider' | 'network'

export class ReceiptOcrError extends Error {
  readonly code: ReceiptOcrErrorCode

  constructor(code: ReceiptOcrErrorCode) {
    super(code)
    this.code = code
  }
}

const serverCodes = new Set<ReceiptOcrErrorCode>([
  'auth', 'unsupported', 'too-large', 'invalid', 'not-configured', 'empty', 'provider',
])

export async function readReceiptImage(image: Blob, signal?: AbortSignal): Promise<ReceiptOcrResult> {
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
  if (!result || typeof result !== 'object' || !('rawText' in result) ||
      typeof result.rawText !== 'string' || !result.rawText.trim()) {
    throw new ReceiptOcrError('empty')
  }
  return { rawText: result.rawText }
}
