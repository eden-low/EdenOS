import { ImageAnnotatorClient } from '@google-cloud/vision'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import type { ReceiptOcrDependencies } from './receiptOcrHandler'

interface ServiceAccountConfig {
  project_id: string
  client_email: string
  private_key: string
}

function readServiceAccount(): ServiceAccountConfig | null {
  const value = process.env.EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' ||
        !('project_id' in parsed) || typeof parsed.project_id !== 'string' ||
        !('client_email' in parsed) || typeof parsed.client_email !== 'string' ||
        !('private_key' in parsed) || typeof parsed.private_key !== 'string' ||
        !parsed.project_id.trim() || !parsed.client_email.trim() || !parsed.private_key.trim()) return null
    return parsed as ServiceAccountConfig
  } catch {
    return null
  }
}

let visionClient: ImageAnnotatorClient | null = null

export function createReceiptOcrRuntime(): ReceiptOcrDependencies {
  const serviceAccount = readServiceAccount()
  return {
    isConfigured: () => serviceAccount !== null,
    async verifyToken(token) {
      if (!serviceAccount) return false
      const app = getApps().find((item) => item.name === 'edenos-receipt-ocr') ?? initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        }),
      }, 'edenos-receipt-ocr')
      const decoded = await getAuth(app).verifyIdToken(token)
      return Boolean(decoded.uid)
    },
    async readText(image) {
      if (!serviceAccount) throw new Error('OCR provider is not configured')
      visionClient ??= new ImageAnnotatorClient({
        projectId: serviceAccount.project_id,
        credentials: {
          client_email: serviceAccount.client_email,
          private_key: serviceAccount.private_key,
        },
      })
      const [result] = await visionClient.documentTextDetection({ image: { content: Buffer.from(image) } })
      if (result.error?.message) throw new Error('OCR provider failed')
      return result.fullTextAnnotation?.text ?? ''
    },
  }
}
