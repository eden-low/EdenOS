import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { resolveAvatar } from './avatarRegistry'

it('ships the approved right-facing Reflector complete, transparent and unmirrored at native 3x', async () => {
  const root = path.resolve('src/components/avatar/assets')
  const manifest = JSON.parse(await readFile(path.join(root, 'eden-reflector-journal-static.json'), 'utf8'))
  const bytes = await readFile(path.join(root, manifest.runtime.file))
  const meta = await sharp(bytes, { failOn: 'warning' }).metadata()
  expect(meta.format).toBe('webp'); expect(meta.hasAlpha).toBe(true)
  expect([meta.width, meta.height]).toEqual([264, 492])
  expect(bytes.length).toBe(manifest.runtime.bytes)
  expect(bytes.length).toBeLessThan(100_000)
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.runtime.sha256)
  expect(manifest.source).toMatchObject({ file: 'eden-reflector-journal-motion-v1.webp', width: 792, height: 984, frame: 1, sha256: '13b69909347234b5c5c4bf3e2b6bf6ceb1a3ca53f4cdfa1bee394a16e00af849' })
  expect(manifest.derivation).toMatchObject({ resize: null, mirror: false, alphaValuesChanged: false, encoding: { lossless: true } })
  const visual = resolveAvatar('eden-reflector')
  if (visual.kind !== 'static-image') throw new Error('Reflector prototype missing')
  expect(visual.nativeFacing).toBe('right')
  expect(visual.asset.cssFrame).toEqual({ width: 88, height: 164 })
  expect(visual.asset.width / visual.asset.height).toBe(88 / 164)
  expect(visual.asset.footAnchor).toEqual({ x: 0.5, y: 1 })
  expect(manifest.runtime.footAnchor).toEqual(visual.asset.footAnchor)
  expect(manifest.capabilities).toEqual({ static: true, blink: false, pageTurn: false, writing: false, lookUp: false })
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = 0, left = info.width, right = -1, top = info.height, bottom = -1
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3]
    if (!alpha) transparent++
    if (alpha >= 8) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
  }
  expect(transparent).toBeGreaterThan(50_000)
  expect(top / 3).toBeGreaterThanOrEqual(0.5)
  expect(top / 3).toBeLessThan(3)
  expect(bottom / 3).toBeGreaterThan(161)
  expect(bottom / 3).toBeLessThan(164)
  expect(left / 3).toBeGreaterThan(8)
  expect(right / 3).toBeLessThan(88)
})
