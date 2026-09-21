import { createReceiptOcrHandler } from '../../server/receiptOcrHandler'
import { createFitnessOcrRuntime } from '../../server/fitnessOcrRuntime'
import { createNetlifyLegacyHandler } from '../../server/netlifyLegacyAdapter'

export const handler = createNetlifyLegacyHandler(createReceiptOcrHandler(createFitnessOcrRuntime()))
