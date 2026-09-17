// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const { generateContent } = vi.hoisted(() => ({
  generateContent: vi.fn(async () => ({ text: JSON.stringify({
    merchant: 'SHOP', amountSen: 123, receiptDate: null,
    amountEvidence: 'TOTAL RM 1.23', dateEvidence: null, ambiguousAmount: false,
  }) })),
}))
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NULL: 'NULL', INTEGER: 'INTEGER', BOOLEAN: 'BOOLEAN' },
}))

import { createGeminiReceiptProvider } from './geminiReceiptProvider'

describe('Gemini receipt adapter', () => {
  it('sends the image inline with a structured schema and returns only parsed fields', async () => {
    generateContent.mockClear()
    const provider = createGeminiReceiptProvider('server-only-key')
    const result = await provider.extract({ image: new Uint8Array([1, 2, 3]), mimeType: 'image/png' }, 'model-test')
    expect(result).toMatchObject({ merchant: 'SHOP', amountSen: 123 })
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'model-test',
      contents: expect.arrayContaining([expect.objectContaining({
        inlineData: { mimeType: 'image/png', data: 'AQID' },
      })]),
      config: expect.objectContaining({ responseMimeType: 'application/json',
        responseJsonSchema: expect.objectContaining({ type: 'OBJECT' }) }),
    }))
  })

  it('treats malformed structured text as an unusable result for fallback', async () => {
    generateContent.mockResolvedValueOnce({ text: '{bad' })
    const provider = createGeminiReceiptProvider('server-only-key')
    expect(await provider.extract({ image: new Uint8Array([1]), mimeType: 'image/jpeg' }, 'model-test'))
      .toBeNull()
  })
})
