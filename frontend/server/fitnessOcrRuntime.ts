import { isFitnessExtractionResponse, type FitnessExtractionResponse } from '../src/domain/fitnessScreenshot'
import { createGeminiFitnessProvider } from './geminiFitnessProvider'
import { createReceiptOcrRuntime } from './receiptOcrRuntime'
import { receiptModelConfig, type ReceiptExtractionInput } from './receiptExtraction'
import type { ReceiptOcrDependencies } from './receiptOcrHandler'

export function createFitnessOcrRuntime(): ReceiptOcrDependencies<FitnessExtractionResponse> {
  const receiptRuntime = createReceiptOcrRuntime()
  const key = process.env.GEMINI_API_KEY?.trim()
  const provider = key ? createGeminiFitnessProvider(key) : null
  const models = receiptModelConfig(process.env)
  return {
    verifyToken: receiptRuntime.verifyToken,
    isConfigured: () => receiptRuntime.isConfigured() && provider !== null,
    async extract(input: ReceiptExtractionInput) {
      if (!provider) throw new Error('Fitness extraction is not configured')
      let value: unknown
      try { value = await provider(input, models.primary) } catch { /* One fallback attempt. */ }
      if (isFitnessExtractionResponse(value)) return value
      value = await provider(input, models.fallback)
      if (!isFitnessExtractionResponse(value)) throw new Error('Malformed fitness extraction')
      return value
    },
  }
}
