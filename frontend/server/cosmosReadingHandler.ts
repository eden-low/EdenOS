import { validateCosmosAiRequest, validateCosmosAiResponse } from '../src/cosmos/cosmosAiValidation'
import type { CosmosAiRequest, CosmosAiResponse } from '../src/cosmos/cosmosAiTypes'

const MAX_BODY_BYTES = 48 * 1024
const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

export type CosmosAuthorization = 'authorized' | 'unauthorized'
export interface CosmosReadingDependencies {
  authorize: (token: string) => Promise<CosmosAuthorization>
  isConfigured: () => boolean
  interpret: (request: CosmosAiRequest) => Promise<unknown>
}

function json(status: number, value: CosmosAiResponse | { code: string }): Response {
  return new Response(JSON.stringify(value), { status, headers: responseHeaders })
}

function providerErrorCode(error: unknown): 'quota' | 'timeout' | 'provider' {
  const details = error && typeof error === 'object' ? error as { status?: unknown; code?: unknown; message?: unknown } : {}
  if (Number(details.status) === 429 || details.code === 'RESOURCE_EXHAUSTED') return 'quota'
  if ([408, 504].includes(Number(details.status)) || details.code === 'DEADLINE_EXCEEDED' ||
      typeof details.message === 'string' && /timed? out|timeout/i.test(details.message)) return 'timeout'
  return 'provider'
}

function responseMatchesRequest(request: CosmosAiRequest, response: CosmosAiResponse): boolean {
  const allowed = new Set(request.mode === 'dream' ? ['dream'] : request.sources.map(({ system }) => system))
  if (response.observations.some(({ source }) => !allowed.has(source))) return false
  if ([...allowed].some((source) => !response.observations.some((observation) => observation.source === source))) return false
  if (request.mode === 'cross' ? !response.comparison : response.comparison !== undefined) return false
  if (request.mode === 'dream' ? !response.dreamThemes : response.dreamThemes !== undefined) return false
  return true
}

export function createCosmosReadingHandler(dependencies: CosmosReadingDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return json(405, { code: 'method' })
    const match = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)
    if (!match) return json(401, { code: 'auth' })
    try {
      if (await dependencies.authorize(match[1]) !== 'authorized') return json(403, { code: 'forbidden' })
    } catch {
      return json(401, { code: 'auth' })
    }
    if (!dependencies.isConfigured()) return json(503, { code: 'not-configured' })
    if (request.headers.get('Content-Type')?.toLowerCase().split(';', 1)[0].trim() !== 'application/json') {
      return json(415, { code: 'unsupported' })
    }
    const contentLength = Number(request.headers.get('Content-Length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return json(413, { code: 'too-large' })
    let text: string
    try { text = await request.text() } catch { return json(400, { code: 'invalid' }) }
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return json(413, { code: 'too-large' })
    let raw: unknown
    try { raw = JSON.parse(text) as unknown } catch { return json(400, { code: 'invalid' }) }
    const input = validateCosmosAiRequest(raw)
    if (!input) return json(400, { code: 'invalid' })
    try {
      const result = validateCosmosAiResponse(await dependencies.interpret(input))
      return result && responseMatchesRequest(input, result) ? json(200, result) : json(502, { code: 'malformed-response' })
    } catch (error) {
      const code = providerErrorCode(error)
      return json(code === 'timeout' ? 504 : code === 'quota' ? 429 : 503, { code })
    }
  }
}
