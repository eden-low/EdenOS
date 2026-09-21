import { isValidExternalId } from '../../src/domain/anime'
import { animeContentGroupTargets, animeContentTargets } from './contentPolicy'
import type { AnimeProviderConfig, SyncOptions } from './types'

const defaultTimeoutMs = 10_000
const defaultRetries = 2
export const defaultMaxFirestoreWrites = 12_000
export const defaultMaxFirestoreReads = 30_000
export const defaultOperationSafetyMargin = 100

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number(value) : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function providerEnvKey(id: string, suffix: string): string {
  return `ANIME_PROVIDER_${id.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}_${suffix}`
}

function configuredUrl(value: string | undefined, name: string): URL {
  if (!value?.trim()) throw new Error(`${name} is required`)
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`${name} must use HTTP or HTTPS`)
  if (url.username || url.password) throw new Error(`${name} must not contain embedded credentials`)
  return url
}

export function loadProviderConfigs(env: NodeJS.ProcessEnv = process.env): AnimeProviderConfig[] {
  if (env.ANIME_SYNC_PROVIDER_CONFIG_JSON?.trim()) {
    const parsed: unknown = JSON.parse(env.ANIME_SYNC_PROVIDER_CONFIG_JSON)
    if (!Array.isArray(parsed)) throw new Error('ANIME_SYNC_PROVIDER_CONFIG_JSON must be an array')
    return parsed.map((item, index) => {
      if (!item || typeof item !== 'object') throw new Error('Invalid provider registry entry')
      const value = item as Record<string, unknown>
      if (typeof value.id !== 'string' || !isValidExternalId(value.id) || typeof value.baseUrl !== 'string') throw new Error('Provider registry entries require safe id and baseUrl')
      return {
        id: value.id,
        displayName: typeof value.displayName === 'string' && value.displayName.trim() ? value.displayName.trim() : value.id,
        baseUrl: configuredUrl(value.baseUrl, `provider ${value.id} baseUrl`),
        priority: typeof value.priority === 'number' && Number.isInteger(value.priority) && value.priority > 0 ? value.priority : index + 1,
        timeoutMs: typeof value.timeoutMs === 'number' && Number.isInteger(value.timeoutMs) && value.timeoutMs > 0 ? value.timeoutMs : defaultTimeoutMs,
        maxRetries: typeof value.maxRetries === 'number' && Number.isInteger(value.maxRetries) && value.maxRetries >= 0 ? Math.min(5, value.maxRetries) : defaultRetries,
      }
    }).sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))
  }
  const ids = (env.ANIME_SYNC_PROVIDERS ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  const unique = [...new Set(ids)]
  return unique.map((id, index) => {
    if (!isValidExternalId(id)) throw new Error(`Invalid provider id: ${id}`)
    const prefix = (suffix: string) => providerEnvKey(id, suffix)
    return {
      id,
      displayName: env[prefix('DISPLAY_NAME')]?.trim() || id,
      baseUrl: configuredUrl(env[prefix('BASE_URL')], prefix('BASE_URL')),
      priority: positiveInteger(env[prefix('PRIORITY')], index + 1),
      timeoutMs: positiveInteger(env[prefix('TIMEOUT_MS')], defaultTimeoutMs),
      maxRetries: Math.min(5, positiveInteger(env[prefix('MAX_RETRIES')], defaultRetries)),
    }
  }).sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))
}

function valueAfterEquals(argument: string): string | undefined {
  const index = argument.indexOf('=')
  return index < 0 ? undefined : argument.slice(index + 1)
}

export function parseSyncOptions(arguments_: string[], env: NodeJS.ProcessEnv = process.env): SyncOptions {
  const modeArgument = arguments_.find((item) => item.startsWith('--mode='))
  const modeValue = modeArgument ? valueAfterEquals(modeArgument) : 'incremental'
  if (modeValue !== 'full' && modeValue !== 'incremental') throw new Error('--mode must be full or incremental')
  const providersArgument = arguments_.find((item) => item.startsWith('--providers='))
  const limitArgument = arguments_.find((item) => item.startsWith('--limit='))
  const concurrencyArgument = arguments_.find((item) => item.startsWith('--concurrency='))
  const limit = limitArgument ? Number(valueAfterEquals(limitArgument)) : undefined
  const concurrency = concurrencyArgument ? Number(valueAfterEquals(concurrencyArgument)) : 4
  const targetsArgument = arguments_.find((item) => item.startsWith('--content-targets='))
  const groupTargetsArgument = arguments_.find((item) => item.startsWith('--content-groups='))
  const cleanupArgument = arguments_.find((item) => item.startsWith('--cleanup='))
  const maxTitlesArgument = arguments_.find((item) => item.startsWith('--max-titles='))
  const maxReadsArgument = arguments_.find((item) => item.startsWith('--max-firestore-reads='))
  const maxWritesArgument = arguments_.find((item) => item.startsWith('--max-firestore-writes='))
  const safetyMarginArgument = arguments_.find((item) => item.startsWith('--operation-safety-margin='))
  const checkpointArgument = arguments_.find((item) => item.startsWith('--checkpoint-id='))
  const cleanup = cleanupArgument ? valueAfterEquals(cleanupArgument) : 'none'
  const maxTitles = maxTitlesArgument ? Number(valueAfterEquals(maxTitlesArgument)) : undefined
  const maxFirestoreReads = Number(maxReadsArgument ? valueAfterEquals(maxReadsArgument) : env.MAX_FIRESTORE_READS ?? defaultMaxFirestoreReads)
  const maxFirestoreWrites = Number(maxWritesArgument ? valueAfterEquals(maxWritesArgument) : env.MAX_FIRESTORE_WRITES ?? defaultMaxFirestoreWrites)
  const operationSafetyMargin = Number(safetyMarginArgument ? valueAfterEquals(safetyMarginArgument) : env.ANIME_SYNC_OPERATION_SAFETY_MARGIN ?? defaultOperationSafetyMargin)
  if (targetsArgument && groupTargetsArgument) throw new Error('Use either --content-targets or --content-groups, not both')
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) throw new Error('--limit must be a positive integer')
  if (maxTitles !== undefined && (!Number.isInteger(maxTitles) || maxTitles <= 0)) throw new Error('--max-titles must be a positive integer')
  if (!Number.isInteger(maxFirestoreReads) || maxFirestoreReads < 1) throw new Error('--max-firestore-reads must be a positive integer')
  if (!Number.isInteger(maxFirestoreWrites) || maxFirestoreWrites < 1) throw new Error('--max-firestore-writes must be a positive integer')
  if (!Number.isInteger(operationSafetyMargin) || operationSafetyMargin < 0 || operationSafetyMargin >= Math.min(maxFirestoreReads, maxFirestoreWrites)) throw new Error('--operation-safety-margin must be smaller than both operation budgets')
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10) throw new Error('--concurrency must be between 1 and 10')
  if (cleanup !== 'none' && cleanup !== 'plan' && cleanup !== 'apply') throw new Error('--cleanup must be none, plan, or apply')
  return {
    mode: modeValue,
    dryRun: arguments_.includes('--dry-run'),
    providerIds: providersArgument ? valueAfterEquals(providersArgument)?.split(',').map((item) => item.trim()).filter(Boolean) : undefined,
    ...(limit !== undefined ? { limit } : {}),
    fromCache: arguments_.find((item) => item.startsWith('--from-cache=')) ? valueAfterEquals(arguments_.find((item) => item.startsWith('--from-cache='))!) : undefined,
    retryFailed: arguments_.find((item) => item.startsWith('--retry-failed=')) ? valueAfterEquals(arguments_.find((item) => item.startsWith('--retry-failed='))!) : undefined,
    probeOnly: arguments_.includes('--probe'),
    probeMedia: arguments_.includes('--probe-media'),
    concurrency,
    ...(targetsArgument ? { contentTargets: animeContentTargets(valueAfterEquals(targetsArgument)) } : {}),
    ...(groupTargetsArgument ? { contentGroupTargets: animeContentGroupTargets(valueAfterEquals(groupTargetsArgument)) } : {}),
    cleanup,
    controlled: arguments_.includes('--controlled'),
    ...(maxTitles !== undefined ? { maxTitles } : {}),
    maxFirestoreReads,
    maxFirestoreWrites,
    operationSafetyMargin,
    checkpointId: checkpointArgument ? valueAfterEquals(checkpointArgument) : env.ANIME_SYNC_CHECKPOINT_ID ?? 'controlled-v1',
    catalogueStats: arguments_.includes('--catalogue-stats'),
    verifyIdempotency: arguments_.includes('--verify-idempotency'),
  }
}

export function selectProviderConfigs(configs: AnimeProviderConfig[], requested?: string[]): AnimeProviderConfig[] {
  if (!requested?.length) return configs
  const selected = configs.filter((config) => requested.includes(config.id))
  const missing = requested.filter((id) => !configs.some((config) => config.id === id))
  if (missing.length) throw new Error(`Providers are not configured: ${missing.join(', ')}`)
  return selected
}
