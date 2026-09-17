import { createReceiptOcrHandler } from '../../server/receiptOcrHandler'
import { createReceiptOcrRuntime } from '../../server/receiptOcrRuntime'

export default createReceiptOcrHandler(createReceiptOcrRuntime())
