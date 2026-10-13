// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { CosmosAiRequest, CosmosAiResponse } from '../src/cosmos/cosmosAiTypes'
import { createCosmosReadingHandler, type CosmosReadingDependencies } from './cosmosReadingHandler'

const requestBody: CosmosAiRequest = {
  version: 1, promptVersion: 'cosmos-v1', mode: 'single', question: '请提供整体反思。', birthCompatibility: 'not-applicable',
  combinationWarningAcknowledged: true, consent: true,
  sources: [{ system: 'tarot', completeness: 'exact', conventions: ['Synthetic'], uncertainty: [], facts: {
    spread: 'single', cards: [{ position: 'Single', deckPosition: 1, cardId: 'major-00', name: '测试牌', englishName: 'Test Card', orientation: 'upright' }],
  } }],
}
const modelResponse: CosmosAiResponse = {
  overallReflection: '整体反思。', observations: [{ source: 'tarot', title: '牌面', reflection: '象征性观察。' }],
  alternatives: ['另一种理解。'], reflectiveQuestions: ['问题一？', '问题二？', '问题三？'], limitations: '仅供反思。',
}

function makeRequest(body: unknown = requestBody, init: { token?: string | null; method?: string; contentType?: string; contentLength?: string } = {}): Request {
  const token = init.token === undefined ? 'valid' : init.token
  const headers: Record<string, string> = { 'Content-Type': init.contentType ?? 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (init.contentLength) headers['Content-Length'] = init.contentLength
  return new Request('https://example.test/.netlify/functions/cosmos-reading', { method: init.method ?? 'POST', headers,
    body: init.method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
}

function dependencies(): CosmosReadingDependencies {
  return { authorize: vi.fn(async (token) => token === 'valid' ? 'authorized' : 'unauthorized'), isConfigured: () => true,
    interpret: vi.fn(async () => modelResponse) }
}

describe('Cosmos reading endpoint', () => {
  it('returns validated JSON with no-store and submits only structured context', async () => {
    const deps = dependencies()
    const response = await createCosmosReadingHandler(deps)(makeRequest())
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual(modelResponse)
    expect(deps.interpret).toHaveBeenCalledWith(requestBody)
  })

  it('rejects missing, invalid, and authenticated-but-unauthorized identities', async () => {
    const deps = dependencies()
    const handler = createCosmosReadingHandler(deps)
    expect((await handler(makeRequest(requestBody, { token: null }))).status).toBe(401)
    deps.authorize = vi.fn(async () => { throw new Error('invalid token detail') })
    expect((await handler(makeRequest())).status).toBe(401)
    deps.authorize = vi.fn(async () => 'unauthorized' as const)
    expect((await handler(makeRequest())).status).toBe(403)
    expect(deps.interpret).not.toHaveBeenCalled()
  })

  it('rejects methods, content types, oversized bodies, and malformed JSON', async () => {
    const deps = dependencies()
    const handler = createCosmosReadingHandler(deps)
    expect((await handler(makeRequest(requestBody, { method: 'GET' }))).status).toBe(405)
    expect((await handler(makeRequest(requestBody, { contentType: 'text/plain' }))).status).toBe(415)
    expect((await handler(makeRequest(requestBody, { contentLength: String(49 * 1024) }))).status).toBe(413)
    expect((await handler(makeRequest('{bad'))).status).toBe(400)
    expect(deps.interpret).not.toHaveBeenCalled()
  })

  it('fails closed when configuration is missing and does not leak provider details', async () => {
    const deps = dependencies()
    deps.isConfigured = () => false
    expect(await (await createCosmosReadingHandler(deps)(makeRequest())).json()).toEqual({ code: 'not-configured' })
    deps.isConfigured = () => true
    deps.interpret = vi.fn(async () => { throw Object.assign(new Error('secret provider detail'), { status: 429 }) })
    const response = await createCosmosReadingHandler(deps)(makeRequest())
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ code: 'quota' })
  })

  it('does not log questions, chart context, UIDs, or provider output on failure', async () => {
    const spies = [vi.spyOn(console, 'log').mockImplementation(() => undefined), vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined), vi.spyOn(console, 'error').mockImplementation(() => undefined)]
    const deps = dependencies()
    deps.interpret = vi.fn(async () => { throw new Error('private provider response') })
    await createCosmosReadingHandler(deps)(makeRequest())
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    }
  })

  it('classifies timeouts, provider failures, and malformed or ungrounded output', async () => {
    const deps = dependencies()
    deps.interpret = vi.fn(async () => { throw Object.assign(new Error('timed out'), { code: 'DEADLINE_EXCEEDED' }) })
    expect((await createCosmosReadingHandler(deps)(makeRequest())).status).toBe(504)
    deps.interpret = vi.fn(async () => { throw new Error('network internals') })
    expect((await createCosmosReadingHandler(deps)(makeRequest())).status).toBe(503)
    deps.interpret = vi.fn(async () => ({ ...modelResponse, observations: [{ source: 'bazi', title: 'wrong', reflection: 'wrong' }] }))
    expect((await createCosmosReadingHandler(deps)(makeRequest())).status).toBe(502)
  })
})
