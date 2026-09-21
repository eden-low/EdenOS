import { normalizeBatchScreenshotExtraction, type BatchScreenshotExtraction } from '../src/domain/batchScreenshotTransactions'
import { createGeminiBatchTransactionProvider } from './geminiBatchTransactionProvider'
import { createReceiptOcrRuntime } from './receiptOcrRuntime'
import { receiptModelConfig, type ReceiptExtractionInput } from './receiptExtraction'
import type { ReceiptOcrDependencies } from './receiptOcrHandler'

export function createBatchTransactionOcrRuntime(): ReceiptOcrDependencies<BatchScreenshotExtraction> {
  const receiptRuntime = createReceiptOcrRuntime()
  const key = process.env.GEMINI_API_KEY?.trim()
  const provider = key ? createGeminiBatchTransactionProvider(key) : null
  const models = receiptModelConfig(process.env)
  const primaryModel = 'gemini-3.1-flash-lite'
  return {
    verifyToken: receiptRuntime.verifyToken,
    isConfigured: () => receiptRuntime.isConfigured() && provider !== null,
    async extract(input: ReceiptExtractionInput) {
      if (!provider) throw new Error('Batch screenshot extraction is not configured')
      let lastUsable: BatchScreenshotExtraction | null = null
      for (const [role, model] of [['primary', primaryModel], ['fallback', models.primary]] as const) {
        try {
          const result = normalizeBatchScreenshotExtraction(await provider(input, model))
          if (result) {
            lastUsable = result
            if (result.rows.length > 0) return result
          }
          console.warn('Batch transaction screenshot response had no usable rows', { role })
        } catch (error) {
          const status = error && typeof error === 'object' && 'status' in error &&
            typeof error.status === 'number' ? error.status : undefined
          const code = error && typeof error === 'object' && 'code' in error &&
            typeof error.code === 'string' && /^[A-Z_]{1,40}$/.test(error.code) ? error.code : undefined
          console.warn('Batch transaction screenshot provider failed', { role, status, code })
        }
      }
      if (lastUsable) return lastUsable
      throw new Error('Batch transaction screenshot extraction unavailable after bounded attempts')
    },
  }
}
