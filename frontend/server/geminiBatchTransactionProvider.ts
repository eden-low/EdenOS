import { GoogleGenAI, Type } from '@google/genai'
import type { ReceiptExtractionInput } from './receiptExtraction'

const nullableString = { anyOf: [{ type: Type.STRING }, { type: Type.NULL }] }
const instruction = `Read one mobile wallet or bank transaction-history screenshot and return every visible financial transaction row, up to 100 rows. This is a MULTI-ROW activity list, not a receipt. Ignore phone status bars, navigation, tabs, date controls, balances, reward summaries, and other UI chrome. Reward/points lines such as "+14 points" are not currency transactions: mark them as reward with amountSen null. For each real row, preserve the visible monetary sign separately as positive, negative, unsigned, or unknown and return the absolute currency amount as a positive integer in the currency's minor unit (RM 14.00 is 1400 sen). Never return a negative amountSen. Return currency only when visible or reliably established by the screen. Prefer each row's date/time. Resolve a missing year only when a visible month/year or date-range context makes it reliable, and then set dateInferred true. Otherwise use null. Use YYYY-MM-DD and 24-hour HH:mm. Recognize English, Chinese, and mixed text. Classify GO+ cash in, reload, own-wallet movement, balance transfer, 转账, 余额, and 转出 as transfer or reload, not economic income. Received funds, salary, and earnings may be income; merchant purchases and payments may be payment. Classification is only a suggestion for later review. Keep short original visible row text in sourceText. Mark uncertain true and add a concise issue when any field is ambiguous. Set partial true when some visible transaction rows could not be read. Do not invent rows or values. Return structured JSON only.`

const rowSchema = {
  type: Type.OBJECT,
  properties: {
    date: nullableString,
    time: nullableString,
    description: nullableString,
    amountSen: { anyOf: [{ type: Type.INTEGER }, { type: Type.NULL }] },
    amountSign: { type: Type.STRING, enum: ['positive', 'negative', 'unsigned', 'unknown'] },
    currency: nullableString,
    sourceText: nullableString,
    transactionKind: { type: Type.STRING, enum: ['payment', 'income', 'earnings', 'transfer', 'reload', 'reward', 'unknown'] },
    dateInferred: { type: Type.BOOLEAN },
    uncertain: { type: Type.BOOLEAN },
    issues: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['date', 'time', 'description', 'amountSen', 'amountSign', 'currency', 'sourceText',
    'transactionKind', 'dateInferred', 'uncertain', 'issues'],
}

const schema = {
  type: Type.OBJECT,
  properties: {
    rows: { type: Type.ARRAY, items: rowSchema },
    totalVisibleRows: { type: Type.INTEGER },
    partial: { type: Type.BOOLEAN },
    issues: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['rows', 'totalVisibleRows', 'partial', 'issues'],
}

export function createGeminiBatchTransactionProvider(apiKey: string) {
  const client = new GoogleGenAI({ apiKey })
  return async (input: ReceiptExtractionInput, model: string): Promise<unknown> => {
    const response = await client.models.generateContent({
      model,
      contents: [
        { inlineData: { mimeType: input.mimeType, data: Buffer.from(input.image).toString('base64') } },
        { text: instruction },
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        httpOptions: { timeout: 15000, retryOptions: { attempts: 1 } },
      },
    })
    try { return response.text ? JSON.parse(response.text) as unknown : null } catch { return null }
  }
}
