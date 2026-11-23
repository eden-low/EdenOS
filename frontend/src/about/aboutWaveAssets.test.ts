// @vitest-environment node
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function bounds(data: Uint8Array, cell: number, top = 0, bottom = 512) {
  const x0 = (cell % 4) * 512, y0 = Math.floor(cell / 4) * 512
  let left = 512, right = -1, up = 512, down = -1
  for (let y = top; y < bottom; y++) for (let x = 0; x < 512; x++) {
    if (data[((y + y0) * 2048 + x + x0) * 4 + 3] < 128) continue
    left = Math.min(left, x); right = Math.max(right, x)
    up = Math.min(up, y); down = Math.max(down, y)
  }
  return { left, right, up, down, cx: (left + right) / 2 }
}
describe('dedicated Wave art registration', () => {
  it('keeps every pose inside its SVG cell with transparent breathing room', async () => {
    const image = sharp(fileURLToPath(new URL('./assets/eden-about-wave-v2.webp', import.meta.url)))
    const metadata = await image.metadata()
    expect([metadata.width, metadata.height, metadata.hasAlpha]).toEqual([2048, 1024, true])
    const data = await image.ensureAlpha().raw().toBuffer()
    for (let cell = 0; cell < 8; cell++) {
      const box = bounds(data, cell)
      expect(box.left).toBeGreaterThanOrEqual(8); expect(box.up).toBeGreaterThanOrEqual(8)
      expect(box.right).toBeLessThan(504); expect(box.down).toBeLessThan(504)
    }
  })
  it('keeps the hair and feet anchored through raise, small wave and lower', async () => {
    const data = await sharp(fileURLToPath(new URL('./assets/eden-about-wave-v2.webp', import.meta.url))).ensureAlpha().raw().toBuffer()
    const heads = Array.from({ length: 8 }, (_, i) => bounds(data, i, 0, 120))
    const feet = Array.from({ length: 8 }, (_, i) => bounds(data, i, 450, 512))
    const spread = (values: number[]) => Math.max(...values) - Math.min(...values)
    expect(spread(heads.map((box) => box.cx))).toBeLessThanOrEqual(4)
    expect(spread(heads.map((box) => box.up))).toBeLessThanOrEqual(2)
    expect(spread(feet.map((box) => box.cx))).toBeLessThanOrEqual(4)
    expect(spread(feet.map((box) => box.down))).toBeLessThanOrEqual(2)
  })
})
