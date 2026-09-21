import { createReceiptOcrHandler } from '../../server/receiptOcrHandler'
import { createFitnessOcrRuntime } from '../../server/fitnessOcrRuntime'

export const config = { nodeVersion: '24' }

export default createReceiptOcrHandler(createFitnessOcrRuntime())
