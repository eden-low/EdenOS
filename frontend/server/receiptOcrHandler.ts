import type { ReceiptExtractionInput, ReceiptExtractionResult } from './receiptExtraction'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

export interface ReceiptOcrDependencies<T = ReceiptExtractionResult> {
  verifyToken: (token: string) => Promise<boolean>
  isConfigured: () => boolean
  extract: (input: ReceiptExtractionInput) => Promise<T>
}

function json<T>(status: number, value: T | { code: string }): Response {
  return new Response(JSON.stringify(value), { status, headers: responseHeaders })
}

function imageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)) return 'image/png'
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}

export function createReceiptOcrHandler<T = ReceiptExtractionResult>(dependencies: ReceiptOcrDependencies<T>) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return json(405, { code: 'method' })

    const match = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)
    if (!match) return json(401, { code: 'auth' })
    try {
      if (!await dependencies.verifyToken(match[1])) return json(401, { code: 'auth' })
    } catch {
      return json(401, { code: 'auth' })
    }
    if (!dependencies.isConfigured()) return json(503, { code: 'not-configured' })

    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data')) {
      return json(415, { code: 'unsupported' })
    }
    const contentLength = Number(request.headers.get('Content-Length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES + 8192) {
      return json(413, { code: 'too-large' })
    }

    let image: FormDataEntryValue | null
    try {
      image = (await request.formData()).get('image')
    } catch {
      return json(400, { code: 'invalid' })
    }
    if (!(image instanceof Blob) || image.size === 0) return json(400, { code: 'invalid' })
    if (image.size > MAX_IMAGE_BYTES) return json(413, { code: 'too-large' })
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
      return json(415, { code: 'unsupported' })
    }

    const bytes = new Uint8Array(await image.arrayBuffer())
    if (imageType(bytes) !== image.type) return json(400, { code: 'invalid' })

    try {
      return json(200, await dependencies.extract({ image: bytes, mimeType: image.type as ReceiptExtractionInput['mimeType'] }))
    } catch {
      return json(503, { code: 'provider' })
    }
  }
}
