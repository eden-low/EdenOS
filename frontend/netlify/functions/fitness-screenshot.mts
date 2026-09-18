import { createReceiptOcrHandler } from '../../server/receiptOcrHandler'
import { createFitnessOcrRuntime } from '../../server/fitnessOcrRuntime'

export default createReceiptOcrHandler(createFitnessOcrRuntime())
