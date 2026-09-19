import { classifyPlaybackUrl } from './normalize'

export interface MediaProbeResult {
  ok: boolean
  message: string
}

export async function probeMediaUrl(url: string, fetcher: typeof fetch = fetch, timeoutMs = 8_000): Promise<MediaProbeResult> {
  const format = classifyPlaybackUrl(url)
  if (!format) return { ok: false, message: 'Unsupported media URL' }
  try {
    const response = await fetcher(url, {
      headers: format === 'hls' ? { Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, text/plain' } : { Range: 'bytes=0-1023' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok && response.status !== 206) return { ok: false, message: `Media returned HTTP ${response.status}` }
    const contentType = response.headers.get('content-type')?.toLocaleLowerCase() ?? ''
    if (format === 'hls') {
      const body = (await response.text()).slice(0, 4096)
      if (!body.includes('#EXTM3U') || contentType.includes('text/html')) return { ok: false, message: 'Response is not an HLS playlist' }
    }
    if (format === 'mp4' && contentType.includes('text/html')) return { ok: false, message: 'Response is an HTML page' }
    return { ok: true, message: `${format.toUpperCase()} source responded` }
  } catch { return { ok: false, message: 'Media probe failed' } }
}
