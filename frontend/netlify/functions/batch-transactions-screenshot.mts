import { createBatchTransactionOcrRuntime } from '../../server/batchTransactionOcrRuntime'
import { createReceiptOcrHandler } from '../../server/receiptOcrHandler'

export default createReceiptOcrHandler(createBatchTransactionOcrRuntime())
