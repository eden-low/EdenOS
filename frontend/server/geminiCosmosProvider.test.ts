// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { CosmosAiRequest } from '../src/cosmos/cosmosAiTypes'

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }))
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent } } }))
import { createGeminiCosmosProvider } from './geminiCosmosProvider'

const request: CosmosAiRequest = {
  version: 1, promptVersion: 'cosmos-v1', mode: 'dream', question: '请反思梦境。', dreamText: '梦见一扇门。', sources: [],
  birthCompatibility: 'not-applicable', combinationWarningAcknowledged: true, consent: true,
}

describe('Gemini Cosmos provider', () => {
  it('uses structured JSON, bounded output, timeout, and no retries', async () => {
    generateContent.mockResolvedValueOnce({ text: '{"ok":true}' })
    expect(await createGeminiCosmosProvider('server-key').interpret(request, 'gemini-test')).toEqual({ ok: true })
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-test', contents: expect.stringContaining('梦见一扇门'),
      config: expect.objectContaining({ responseMimeType: 'application/json', maxOutputTokens: 3000,
        httpOptions: { timeout: 20000, retryOptions: { attempts: 1 } } }) }))
    expect(JSON.stringify(generateContent.mock.calls[0])).not.toContain('server-key')
  })

  it('returns null for malformed or excessive model output', async () => {
    generateContent.mockResolvedValueOnce({ text: '{bad' }).mockResolvedValueOnce({ text: 'x'.repeat(32_001) })
    const provider = createGeminiCosmosProvider('server-key')
    expect(await provider.interpret(request, 'gemini-test')).toBeNull()
    expect(await provider.interpret(request, 'gemini-test')).toBeNull()
  })
})
