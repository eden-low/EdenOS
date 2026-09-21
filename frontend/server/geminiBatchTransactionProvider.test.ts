// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const { generateContent } = vi.hoisted(() => ({
  generateContent: vi.fn(async (_request: unknown) => ({ text: JSON.stringify({ rows: [], totalVisibleRows: 0, partial: false, issues: [] }) })),
}))
vi.mock('@google/genai', () => ({
  GoogleGenAI: class { models = { generateContent } },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NULL: 'NULL', INTEGER: 'INTEGER', BOOLEAN: 'BOOLEAN', ARRAY: 'ARRAY' },
}))

import { createGeminiBatchTransactionProvider } from './geminiBatchTransactionProvider'

describe('Gemini batch transaction screenshot adapter', () => {
  it('uses inline server-side image extraction with a structured multi-row schema', async () => {
    generateContent.mockClear()
    const provider = createGeminiBatchTransactionProvider('server-only-key')
    await provider({ image: new Uint8Array([1, 2, 3]), mimeType: 'image/png' }, 'model-test')
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'model-test',
      contents: expect.arrayContaining([expect.objectContaining({ inlineData: { mimeType: 'image/png', data: 'AQID' } })]),
      config: expect.objectContaining({ responseMimeType: 'application/json',
        responseJsonSchema: expect.objectContaining({ type: 'OBJECT', properties: expect.objectContaining({ rows: expect.objectContaining({ type: 'ARRAY' }) }) }) }),
    }))
    const call = generateContent.mock.calls[0]?.[0] as { contents: Array<{ text?: string }> }
    const instruction = call.contents[1]?.text ?? ''
    expect(instruction).toMatch(/points/i)
    expect(instruction).toMatch(/MULTI-ROW/)
    expect(instruction).toContain('转账')
  })
})
