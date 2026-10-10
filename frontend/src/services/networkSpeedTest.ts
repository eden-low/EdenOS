export type SpeedPhase = 'latency' | 'download' | 'upload'
export type SpeedResults = { latencyMs?: number; downloadMbps?: number; uploadMbps?: number }

const endpoint = 'https://speed.cloudflare.com'
const downloadBytes = 5_000_000
const uploadBytes = 2_000_000
const requestTimeoutMs = 20_000

// Two samples in each direction, plus three empty latency requests.
export const speedTestDataUsageMb = (downloadBytes * 2 + uploadBytes * 2) / 1_000_000

export class SpeedTestError extends Error {
  readonly reason: 'offline' | 'timeout' | 'endpoint'
  readonly phase: SpeedPhase
  constructor(reason: 'offline' | 'timeout' | 'endpoint', phase: SpeedPhase) {
    super(reason === 'offline' ? 'You appear to be offline.' : reason === 'timeout' ? 'The speed test timed out.' : 'The speed test endpoint is unavailable.')
    this.reason = reason
    this.phase = phase
  }
}

async function timedRequest(url: string, options: RequestInit, signal: AbortSignal, phase: SpeedPhase, validate: (response: Response) => Promise<void>) {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
  const controller = new AbortController()
  let timedOut = false
  const cancel = () => controller.abort()
  signal.addEventListener('abort', cancel, { once: true })
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, requestTimeoutMs)
  const started = performance.now()
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok) throw new SpeedTestError('endpoint', phase)
    await validate(response)
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    if (timedOut) throw new SpeedTestError('timeout', phase)
    return performance.now() - started
  } catch (error) {
    if (signal.aborted) throw error
    if (timedOut) throw new SpeedTestError('timeout', phase)
    if (error instanceof SpeedTestError) throw error
    throw new SpeedTestError(navigator.onLine ? 'endpoint' : 'offline', phase)
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', cancel)
  }
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export async function runNetworkSpeedTest(signal: AbortSignal, onResult: (phase: SpeedPhase, value: number) => void): Promise<void> {
  if (!navigator.onLine) throw new SpeedTestError('offline', 'latency')
  const latency: number[] = []
  for (let index = 0; index < 3; index += 1) {
    latency.push(await timedRequest(`${endpoint}/__down?bytes=0`, {}, signal, 'latency', async (response) => { await response.arrayBuffer() }))
  }
  onResult('latency', median(latency))

  const download: number[] = []
  for (let index = 0; index < 2; index += 1) {
    const elapsed = await timedRequest(`${endpoint}/__down?bytes=${downloadBytes}`, {}, signal, 'download', async (response) => {
      const body = await response.arrayBuffer()
      if (body.byteLength !== downloadBytes) throw new SpeedTestError('endpoint', 'download')
    })
    download.push(downloadBytes * 8 / (elapsed * 1000))
  }
  onResult('download', median(download))

  const payload = new Uint8Array(uploadBytes)
  const upload: number[] = []
  for (let index = 0; index < 2; index += 1) {
    const elapsed = await timedRequest(`${endpoint}/__up`, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/octet-stream' } }, signal, 'upload', async (response) => {
      await response.arrayBuffer()
      if (response.headers.get('cf-meta-upload-bytes') !== String(uploadBytes)) throw new SpeedTestError('endpoint', 'upload')
    })
    upload.push(uploadBytes * 8 / (elapsed * 1000))
  }
  onResult('upload', median(upload))
}
