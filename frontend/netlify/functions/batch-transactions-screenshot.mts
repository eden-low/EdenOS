import { createBatchTransactionOcrRuntime } from '../../server/batchTransactionOcrRuntime'
import { createReceiptOcrHandler } from '../../server/receiptOcrHandler'
import { createNetlifyLegacyHandler } from '../../server/netlifyLegacyAdapter'

export const handler = createNetlifyLegacyHandler(createReceiptOcrHandler(createBatchTransactionOcrRuntime()))
