export const RECEIPT_UPLOAD_MAX_BYTES = 4 * 1024 * 1024
const RECEIPT_INPUT_MAX_BYTES = 20 * 1024 * 1024
const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type ReceiptImageError = 'unsupported' | 'too-large' | 'invalid'

export class ReceiptImageInputError extends Error {
  readonly reason: ReceiptImageError

  constructor(reason: ReceiptImageError) {
    super(reason)
    this.reason = reason
  }
}

export function validateReceiptImage(image: Blob): void {
  if (!supportedTypes.has(image.type)) throw new ReceiptImageInputError('unsupported')
  if (!image.size) throw new ReceiptImageInputError('invalid')
  if (image.size > RECEIPT_INPUT_MAX_BYTES) throw new ReceiptImageInputError('too-large')
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new ReceiptImageInputError('invalid')), 'image/jpeg', quality)
  })
}

export async function prepareReceiptImage(image: Blob): Promise<Blob> {
  validateReceiptImage(image)
  if (image.size <= RECEIPT_UPLOAD_MAX_BYTES) return image

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(image)
  } catch {
    throw new ReceiptImageInputError('invalid')
  }

  try {
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new ReceiptImageInputError('invalid')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    for (const quality of [0.88, 0.76, 0.64]) {
      const compressed = await encodeCanvas(canvas, quality)
      if (compressed.size <= RECEIPT_UPLOAD_MAX_BYTES) return compressed
    }
    throw new ReceiptImageInputError('too-large')
  } finally {
    bitmap.close()
  }
}
