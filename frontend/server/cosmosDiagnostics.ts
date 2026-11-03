import { randomUUID } from 'node:crypto'
import { cosmosStagingDiagnostics } from '../src/cosmos/cosmosDiagnosticsConfig'

export type CosmosFailureStage = 'request-validation' | 'token-verification' | 'owner-authorization'
  | 'configuration' | 'gemini-request' | 'response-parsing' | 'complete'

export interface CosmosDiagnosticRecord {
  diagnosticId: string
  stage: CosmosFailureStage
  code: string
  httpStatus: number
  upstreamStatus: number | null
  durationMs: number
  timedOut: boolean
}

// Keep only allowlisted metadata. Never attach the original error, request or response.
export class CosmosResponseParsingError extends Error {
  constructor() { super('malformed-response') }
}

export function geminiErrorMetadata(error: unknown): { upstreamStatus: number | null; timedOut: boolean } {
  const value = error && typeof error === 'object' ? error as { status?: unknown; name?: unknown } : null
  const upstreamStatus = typeof value?.status === 'number' && Number.isInteger(value.status) &&
    value.status >= 400 && value.status <= 599 ? value.status : null
  return { upstreamStatus, timedOut: upstreamStatus === 408 || upstreamStatus === 504 ||
    value?.name === 'AbortError' || value?.name === 'TimeoutError' ||
    value?.name === 'RequestTimeoutError' || value?.name === 'APIConnectionTimeoutError' }
}

export function createCosmosDiagnosticRequest(enabled = cosmosStagingDiagnostics) {
  const diagnosticId = randomUUID()
  const startedAt = performance.now()
  return {
    diagnosticId: enabled ? diagnosticId : undefined,
    finish(stage: CosmosFailureStage, code: string, httpStatus: number,
      upstreamStatus: number | null = null, timedOut = false): void {
      if (!enabled) return
      const record: CosmosDiagnosticRecord = {
        diagnosticId, stage, code, httpStatus, upstreamStatus,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)), timedOut,
      }
      console.info(JSON.stringify({ event: 'cosmos-diagnostic', ...record }))
    },
  }
}
