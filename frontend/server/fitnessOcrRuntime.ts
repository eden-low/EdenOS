import { normalizeFitnessExtractionResponse, type FitnessExtractionResponse } from '../src/domain/fitnessScreenshot'
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
      let providerFailed = false
      // Use Receipt's working primary model first. A second bounded attempt
      // remains available for a transient provider failure or unusable response.
      for (const [role, model] of [['primary', models.primary], ['fallback', models.fallback]] as const) {
        try {
          const result = normalizeFitnessExtractionResponse(await provider(input, model))
          if (result) {
            if (result.discardedFields.length) {
              console.warn('Fitness extraction discarded ambiguous fields',
                { role, fields: result.discardedFields })
            }
            return result.response
          }
          console.warn('Fitness extraction response unusable', { role })
        } catch (error) {
          providerFailed = true
          const status = error && typeof error === 'object' && 'status' in error &&
            typeof error.status === 'number' ? error.status : undefined
          const code = error && typeof error === 'object' && 'code' in error &&
            typeof error.code === 'string' && /^[A-Z_]{1,40}$/.test(error.code) ? error.code : undefined
          console.warn('Fitness extraction provider failed', { role, status, code })
        }
      }
      throw new Error(providerFailed ? 'Fitness extraction unavailable after bounded attempts' :
        'Malformed fitness extraction')
    },
  }
}
