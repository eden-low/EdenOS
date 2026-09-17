import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createGeminiReceiptProvider } from './geminiReceiptProvider'
import { extractReceipt, receiptModelConfig } from './receiptExtraction'
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

export function createReceiptOcrRuntime(): ReceiptOcrDependencies {
  const serviceAccount = readServiceAccount()
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  const providerName = process.env.RECEIPT_AI_PROVIDER?.trim() || 'gemini'
  const provider = apiKey && providerName === 'gemini' ? createGeminiReceiptProvider(apiKey) : null
  const models = receiptModelConfig(process.env)
  return {
    isConfigured: () => serviceAccount !== null && provider !== null,
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
    async extract(input) {
      if (!provider) throw new Error('Receipt provider is not configured')
      return extractReceipt(provider, input, models)
    },
  }
}
