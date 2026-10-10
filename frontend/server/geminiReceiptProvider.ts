import { GoogleGenAI, Type } from '@google/genai'
import type { ReceiptExtractionInput, ReceiptExtractionProvider } from './receiptExtraction'

const instruction = `Read this purchase receipt image. Return the merchant, final amount actually due or paid in integer Malaysian sen, receipt date (YYYY-MM-DD), and the best expense category. RM 12.70 is 1270 sen. Do not use subtotal, tax, cash tendered, change, or discount as the total. Do not extract card numbers or receipt IDs. Choose category only from food, transport, shopping, entertainment, housing, health, education, other. Use merchant, purchased items, services, and context: restaurants and groceries are food; petrol is transport; pharmacies are health; haircuts and barbershops are other. Return null category when the purchase type is unclear. Give a short purchaseContext describing the dominant items or service, and short image text for amountEvidence and dateEvidence; no explanation. If a field cannot be determined reliably, return null. If multiple final totals cannot be distinguished, set ambiguousAmount true and amountSen null.`

const nullableString = { anyOf: [{ type: Type.STRING }, { type: Type.NULL }] }
const schema = {
  type: Type.OBJECT,
  properties: {
    merchant: nullableString,
    amountSen: { anyOf: [{ type: Type.INTEGER }, { type: Type.NULL }] },
    receiptDate: nullableString,
    category: { anyOf: [{ type: Type.STRING, enum: ['food', 'transport', 'shopping', 'entertainment', 'housing', 'health', 'education', 'other'] }, { type: Type.NULL }] },
    purchaseContext: nullableString,
    amountEvidence: nullableString,
    dateEvidence: nullableString,
    ambiguousAmount: { type: Type.BOOLEAN },
  },
  required: ['merchant', 'amountSen', 'receiptDate', 'category', 'purchaseContext', 'amountEvidence', 'dateEvidence', 'ambiguousAmount'],
  propertyOrdering: ['merchant', 'amountSen', 'receiptDate', 'category', 'purchaseContext', 'amountEvidence', 'dateEvidence', 'ambiguousAmount'],
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
