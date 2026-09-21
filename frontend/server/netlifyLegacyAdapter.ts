export interface NetlifyLegacyEvent {
  httpMethod: string
  headers: Record<string, string | undefined>
  body: string | null
  isBase64Encoded?: boolean
  path?: string
  rawUrl?: string
}

export interface NetlifyLegacyResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
}

/** Keep the shared Fetch handler while using Netlify's esbuild-compatible Lambda entry format. */
export function createNetlifyLegacyHandler(handler: (request: Request) => Promise<Response>) {
  return async (event: NetlifyLegacyEvent): Promise<NetlifyLegacyResponse> => {
    const headers = new Headers()
    for (const [name, value] of Object.entries(event.headers)) {
      if (value !== undefined) headers.set(name, value)
    }
    const url = event.rawUrl ?? `https://${headers.get('host') ?? 'localhost'}${event.path ?? '/'}`
    const method = event.httpMethod.toUpperCase()
    const body = event.body === null || method === 'GET' || method === 'HEAD'
      ? undefined
      : event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body
    const response = await handler(new Request(url, { method, headers, body: body as BodyInit | undefined }))
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    }
  }
}
