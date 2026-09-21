import { createReceiptOcrHandler } from '../../server/receiptOcrHandler'
import { createReceiptOcrRuntime } from '../../server/receiptOcrRuntime'
import { createNetlifyLegacyHandler } from '../../server/netlifyLegacyAdapter'

export const handler = createNetlifyLegacyHandler(createReceiptOcrHandler(createReceiptOcrRuntime()))
