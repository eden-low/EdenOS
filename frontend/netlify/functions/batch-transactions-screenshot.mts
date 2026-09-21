import { createBatchTransactionOcrRuntime } from '../../server/batchTransactionOcrRuntime'
import { createReceiptOcrHandler } from '../../server/receiptOcrHandler'

export const config = { nodeVersion: '24' }

export default createReceiptOcrHandler(createBatchTransactionOcrRuntime())
