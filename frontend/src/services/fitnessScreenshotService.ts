import { fitnessExtractionToCandidate } from '../domain/fitnessScreenshot'
import { firebaseInitialization } from '../lib/firebase'
import type { FitnessScreenshotCandidate } from '../types/fitnessScreenshot'
import { ReceiptOcrError, type ReceiptOcrErrorCode } from './receiptOcrService'

const serverCodes = new Set<ReceiptOcrErrorCode>(['auth', 'unsupported', 'too-large', 'invalid', 'not-configured', 'provider'])

export async function readFitnessScreenshot(image: Blob, signal?: AbortSignal): Promise<FitnessScreenshotCandidate> {
  if (firebaseInitialization.status !== 'ready') throw new ReceiptOcrError('auth')
  const user = firebaseInitialization.services.auth.currentUser
  if (!user) throw new ReceiptOcrError('auth')
  const body = new FormData()
  body.append('image', image, 'fitness-screenshot')
  let response: Response
  try {
    response = await fetch('/.netlify/functions/fitness-screenshot', {
      method: 'POST', headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      body, cache: 'no-store', signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ReceiptOcrError('network')
  }
  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = result && typeof result === 'object' && 'code' in result ? result.code : null
    throw new ReceiptOcrError(typeof code === 'string' && serverCodes.has(code as ReceiptOcrErrorCode)
      ? code as ReceiptOcrErrorCode : 'provider')
  }
  const candidate = fitnessExtractionToCandidate(result)
  if (!candidate) throw new ReceiptOcrError('provider')
  return candidate
}
