export class ProviderHttpError extends Error {
  readonly code: string
  readonly status?: number

  constructor(code: string, message: string, status?: number) {
    super(message)
    this.name = 'ProviderHttpError'
    this.code = code
    this.status = status
  }
}

export interface ResilientFetchOptions {
  timeoutMs: number
  maxRetries: number
  fetcher?: typeof fetch
  sleep?: (milliseconds: number) => Promise<void>
  random?: () => number
  onAttempt?: (attempt: number) => void
  onRetry?: (nextAttempt: number) => void
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export async function fetchJson(url: URL, options: ResilientFetchOptions): Promise<unknown> {
  const fetcher = options.fetcher ?? fetch
  const sleep = options.sleep ?? defaultSleep
  const random = options.random ?? Math.random
  let lastError: unknown
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    options.onAttempt?.(attempt)
    try {
      const response = await fetcher(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(options.timeoutMs),
      })
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500
        if (!retryable || attempt === options.maxRetries) {
          throw new ProviderHttpError(`http-${response.status}`, `Provider returned HTTP ${response.status}`, response.status)
        }
        lastError = new ProviderHttpError(`http-${response.status}`, `Provider returned HTTP ${response.status}`, response.status)
      } else {
        const declaredLength = Number(response.headers.get('content-length') ?? 0)
        if (declaredLength > 10 * 1024 * 1024) throw new ProviderHttpError('response-too-large', 'Provider JSON exceeds 10 MiB')
        try {
          const body = await response.text()
          if (body.length > 10 * 1024 * 1024) throw new ProviderHttpError('response-too-large', 'Provider JSON exceeds 10 MiB')
          return JSON.parse(body) as unknown
        }
        catch (error) {
          if (error instanceof ProviderHttpError) throw error
          throw new ProviderHttpError('malformed-json', 'Provider returned malformed JSON')
        }
      }
    } catch (error) {
      if (error instanceof ProviderHttpError && (error.code === 'malformed-json' || error.code === 'response-too-large' || (error.status !== undefined && error.status !== 429 && error.status < 500))) throw error
      lastError = error
      if (attempt === options.maxRetries) break
    }
    const delay = 250 * (2 ** attempt) + Math.floor(random() * 125)
    options.onRetry?.(attempt + 1)
    await sleep(delay)
  }
  if (lastError instanceof ProviderHttpError) throw lastError
  throw new ProviderHttpError('network', 'Provider request failed')
}

export async function mapConcurrent<T, U>(items: T[], concurrency: number, worker: (item: T) => Promise<U>): Promise<Array<PromiseSettledResult<U>>> {
  const results: Array<PromiseSettledResult<U>> = new Array(items.length)
  let nextIndex = 0
  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      try { results[index] = { status: 'fulfilled', value: await worker(items[index]) } }
      catch (reason) { results[index] = { status: 'rejected', reason } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()))
  return results
}
