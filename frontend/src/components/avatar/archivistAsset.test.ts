import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { resolveAvatar } from './avatarRegistry'

it('ships complete transparent Archivist artwork from the reviewed motion rest cell at a stable 3x foot-anchored frame', async () => {
  const root = path.resolve('src/components/avatar/assets')
  const manifest = JSON.parse(await readFile(path.join(root, 'eden-archivist-clipboard-static.json'), 'utf8'))
  const bytes = await readFile(path.join(root, manifest.runtime.file))
  const meta = await sharp(bytes, { failOn: 'warning' }).metadata()
  expect(meta.format).toBe('webp'); expect(meta.hasAlpha).toBe(true)
  expect([meta.width, meta.height]).toEqual([264, 492])
  expect(bytes.length).toBe(manifest.runtime.bytes)
  expect(bytes.length).toBeLessThan(110_000)
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.runtime.sha256)
  expect(manifest.source.file).toBe('eden-archivist-clipboard-motion-v1.webp')
  expect(manifest.source.sha256).toBe('44ec07f5377cc7487e2fdc0706e35d0be03e569ff62b44821d0b9b5e625efb3f')
  expect(manifest.source.width).toBeGreaterThan(meta.width!)
  expect(manifest.source.height).toBeGreaterThan(meta.height!)
  const visual = resolveAvatar('eden-archivist')
  if (visual.kind !== 'static-image') throw new Error('Archivist prototype missing')
  expect(visual.asset.cssFrame).toEqual({ width: 88, height: 164 })
  expect(visual.asset.width / visual.asset.height).toBe(88 / 164)
  expect(visual.asset.footAnchor).toEqual({ x: 0.5, y: 1 })
  expect(manifest.runtime.footAnchor).toEqual(visual.asset.footAnchor)
  expect(manifest.capabilities).toEqual({ static: true, blink: false, clipboardReading: false, pageTurn: false, nod: false })
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = 0, left = info.width, right = -1, top = info.height, bottom = -1
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3]
    if (!alpha) transparent++
    if (alpha >= 8) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
  }
  expect(transparent).toBeGreaterThan(50_000)
  // Same visible bounds as the approved preview: head at top, feet at bottom,
  // roughly 70 of 88 CSS pixels wide, with transparent side clearance.
  expect(top / 3).toBeLessThan(3)
  expect(bottom / 3).toBeGreaterThan(162)
  expect(left / 3).toBeGreaterThanOrEqual(8)
  expect(right / 3).toBeLessThanOrEqual(79)
})
