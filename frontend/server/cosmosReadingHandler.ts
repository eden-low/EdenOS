import { validateCosmosAiRequest, validateCosmosAiResponse } from '../src/cosmos/cosmosAiValidation'
import type { CosmosAiRequest, CosmosAiResponse } from '../src/cosmos/cosmosAiTypes'
import { CosmosResponseParsingError, createCosmosDiagnosticRequest, geminiErrorMetadata, type CosmosFailureStage } from './cosmosDiagnostics'

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

type GeminiProviderErrorCode =
  | 'gemini-request-prerequisite' | 'gemini-authentication' | 'gemini-billing'
  | 'gemini-permission' | 'gemini-model-unavailable' | 'quota' | 'timeout' | 'provider'

function providerErrorCode(error: unknown): GeminiProviderErrorCode {
  const { upstreamStatus: status, timedOut } = geminiErrorMetadata(error)
  if (timedOut) return 'timeout'
  if (status === 400) return 'gemini-request-prerequisite'
  if (status === 401) return 'gemini-authentication'
  if (status === 402) return 'gemini-billing'
  if (status === 403) return 'gemini-permission'
  if (status === 404) return 'gemini-model-unavailable'
  if (status === 429) return 'quota'
  if (status === 408 || status === 504) return 'timeout'
  return 'provider'
}

function providerResponseStatus(code: GeminiProviderErrorCode): number {
  if (code === 'quota') return 429
  if (code === 'timeout') return 504
  if (code.startsWith('gemini-')) return 502
  return 503
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
    const diagnostic = createCosmosDiagnosticRequest()
    function reply(status: number, value: CosmosAiResponse | { code: string }, stage: CosmosFailureStage,
      upstreamStatus: number | null = null, timedOut = false): Response {
      const code = 'code' in value ? value.code : 'ok'
      diagnostic.finish(stage, code, status, upstreamStatus, timedOut)
      const id = diagnostic.diagnosticId
      return new Response(JSON.stringify(id && 'code' in value ? { ...value, diagnosticId: id } : value), {
        status, headers: { ...responseHeaders, ...(id ? { 'X-Cosmos-Diagnostic-Id': id } : {}) },
      })
    }
    if (request.method !== 'POST') return reply(405, { code: 'method' }, 'request-validation')
    const match = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)
    if (!match) return reply(401, { code: 'auth' }, 'token-verification')
    try {
      if (await dependencies.authorize(match[1]) !== 'authorized') return reply(403, { code: 'forbidden' }, 'owner-authorization')
    } catch {
      return reply(401, { code: 'auth' }, 'token-verification')
    }
    if (!dependencies.isConfigured()) return reply(503, { code: 'not-configured' }, 'configuration')
    if (request.headers.get('Content-Type')?.toLowerCase().split(';', 1)[0].trim() !== 'application/json') {
      return reply(415, { code: 'unsupported' }, 'request-validation')
    }
    const contentLength = Number(request.headers.get('Content-Length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return reply(413, { code: 'too-large' }, 'request-validation')
    let text: string
    try { text = await request.text() } catch { return reply(400, { code: 'invalid' }, 'request-validation') }
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return reply(413, { code: 'too-large' }, 'request-validation')
    let raw: unknown
    try { raw = JSON.parse(text) as unknown } catch { return reply(400, { code: 'invalid' }, 'request-validation') }
    const input = validateCosmosAiRequest(raw)
    if (!input) return reply(400, { code: 'invalid' }, 'request-validation')
    let stage: CosmosFailureStage = 'gemini-request'
    try {
      const output = await dependencies.interpret(input)
      stage = 'response-parsing'
      const result = validateCosmosAiResponse(output)
      return result && responseMatchesRequest(input, result)
        ? reply(200, result, 'complete') : reply(502, { code: 'malformed-response' }, stage)
    } catch (error) {
      if (error instanceof CosmosResponseParsingError || stage === 'response-parsing') {
        return reply(502, { code: 'malformed-response' }, 'response-parsing')
      }
      const code = providerErrorCode(error)
      const { upstreamStatus, timedOut } = geminiErrorMetadata(error)
      return reply(providerResponseStatus(code), { code }, stage, upstreamStatus, timedOut)
    }
  }
}
