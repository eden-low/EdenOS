import { createReceiptOcrHandler } from '../../server/receiptOcrHandler'
import { createReceiptOcrRuntime } from '../../server/receiptOcrRuntime'

export const config = { nodeVersion: '24' }

export default createReceiptOcrHandler(createReceiptOcrRuntime())
