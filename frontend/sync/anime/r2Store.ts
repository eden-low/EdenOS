import { createHash, createHmac } from 'node:crypto'
import { parseAnimeDetail } from '../../src/domain/anime'
import type { AnimeDetail } from '../../src/types/anime'
import { stableJson } from './stableJson'

export interface AnimeDetailStore {
  get(externalId: string): Promise<AnimeDetail | null>
  exists(externalId: string): Promise<boolean>
  put(detail: AnimeDetail): Promise<void>
  remove(externalId: string): Promise<void>
}

export interface R2Configuration {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

interface R2StoreOptions {
  fetcher?: typeof fetch
  now?: () => Date
}

export function readR2Configuration(env: NodeJS.ProcessEnv = process.env): R2Configuration | null {
  const accountId = env.R2_ACCOUNT_ID?.trim()
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim()
  const bucket = env.R2_BUCKET?.trim()
  return accountId && accessKeyId && secretAccessKey && bucket ? { accountId, accessKeyId, secretAccessKey, bucket } : null
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest()
}

function encodedPath(config: R2Configuration, externalId: string): string {
  const key = `anime-details/${externalId}.json`
  return `/${[config.bucket, ...key.split('/')].map(encodeURIComponent).join('/')}`
}

function signedHeaders(config: R2Configuration, method: 'GET' | 'HEAD' | 'PUT' | 'DELETE', externalId: string, body: string, now: Date): { url: URL; headers: Headers } {
  const host = `${config.accountId}.r2.cloudflarestorage.com`
  const url = new URL(`https://${host}${encodedPath(config, externalId)}`)
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256(body)
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const names = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = [method, url.pathname, '', canonicalHeaders, names, payloadHash].join('\n')
  const scope = `${dateStamp}/auto/s3/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n')
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp)
  const regionKey = hmac(dateKey, 'auto')
  const serviceKey = hmac(regionKey, 's3')
  const signingKey = hmac(serviceKey, 'aws4_request')
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')
  const headers = new Headers({
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${names}, Signature=${signature}`,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  })
  return { url, headers }
}

export function createR2AnimeDetailStore(config: R2Configuration, options: R2StoreOptions = {}): AnimeDetailStore {
  const fetcher = options.fetcher ?? fetch
  const now = options.now ?? (() => new Date())
  async function request(method: 'GET' | 'HEAD' | 'PUT' | 'DELETE', externalId: string, body = ''): Promise<Response> {
    const signed = signedHeaders(config, method, externalId, body, now())
    if (method === 'PUT') {
      signed.headers.set('Content-Type', 'application/json; charset=utf-8')
      signed.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')
    }
    return fetcher(signed.url, { method, headers: signed.headers, ...(method === 'PUT' ? { body } : {}), signal: AbortSignal.timeout(15_000) })
  }
  return {
    async get(externalId) {
      const response = await request('GET', externalId)
      if (response.status === 404) return null
      if (!response.ok) throw new Error(`R2 GET returned HTTP ${response.status}`)
      try { return parseAnimeDetail(await response.json(), externalId) }
      catch { throw new Error('R2 detail object is malformed') }
    },
    async exists(externalId) {
      const response = await request('HEAD', externalId)
      if (response.status === 404) return false
      if (!response.ok) throw new Error(`R2 HEAD returned HTTP ${response.status}`)
      return true
    },
    async put(detail) {
      const response = await request('PUT', detail.externalId, `${stableJson(detail)}\n`)
      if (!response.ok) throw new Error(`R2 PUT returned HTTP ${response.status}`)
    },
    async remove(externalId) {
      const response = await request('DELETE', externalId)
      if (!response.ok && response.status !== 404) throw new Error(`R2 DELETE returned HTTP ${response.status}`)
    },
  }
}
