import { GoogleGenAI, Type } from '@google/genai'
import type { ReceiptExtractionInput, ReceiptExtractionProvider } from './receiptExtraction'

const instruction = `Read this purchase receipt image. Return only the merchant, final amount actually due or paid in integer Malaysian sen, and receipt date (YYYY-MM-DD). RM 12.70 is 1270 sen. Do not use subtotal, tax, cash tendered, change, or discount as the total. Do not extract line items, card numbers, or receipt IDs. If a field cannot be determined reliably, return null. If multiple final totals cannot be distinguished, set ambiguousAmount true and amountSen null. Give only short image text for amountEvidence and dateEvidence; no explanation.`

const nullableString = { anyOf: [{ type: Type.STRING }, { type: Type.NULL }] }
const schema = {
  type: Type.OBJECT,
  properties: {
    merchant: nullableString,
    amountSen: { anyOf: [{ type: Type.INTEGER }, { type: Type.NULL }] },
    receiptDate: nullableString,
    amountEvidence: nullableString,
    dateEvidence: nullableString,
    ambiguousAmount: { type: Type.BOOLEAN },
  },
  required: ['merchant', 'amountSen', 'receiptDate', 'amountEvidence', 'dateEvidence', 'ambiguousAmount'],
  propertyOrdering: ['merchant', 'amountSen', 'receiptDate', 'amountEvidence', 'dateEvidence', 'ambiguousAmount'],
}

export function createGeminiReceiptProvider(apiKey: string): ReceiptExtractionProvider {
  const client = new GoogleGenAI({ apiKey })
  return {
    async extract(input: ReceiptExtractionInput, model: string): Promise<unknown> {
      const response = await client.models.generateContent({
        model,
        contents: [
          { inlineData: { mimeType: input.mimeType, data: Buffer.from(input.image).toString('base64') } },
          { text: instruction },
        ],
        config: { responseMimeType: 'application/json', responseJsonSchema: schema },
      })
      try {
        return response.text ? JSON.parse(response.text) as unknown : null
      } catch {
        return null
      }
    },
  }
}
