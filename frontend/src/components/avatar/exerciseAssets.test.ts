import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { resolveAvatar } from './avatarRegistry'

it.each([
  ['eden-swim', '泳池训练少年与猫咪装备.png', '8a2f2b298c44ae37d0a3fbe86ecf8e4f09d1a160e898e4ff30c2c21a652530f5'],
  ['eden-boxing', '炫彩拳击少年伊甸.png', 'f01340383fe59707c967627c45d953b7279453f3b55bac5318dfdf911b6f6863'],
] as const)('keeps complete approved %s artwork in a common transparent frame and baseline', async (id, sourceName, sourceSha) => {
  const root = path.resolve('src/components/avatar/assets')
  const manifest = JSON.parse(await readFile(path.join(root, `${id}-static.json`), 'utf8'))
  const bytes = await readFile(path.join(root, manifest.runtime.file))
  const meta = await sharp(bytes, { failOn: 'warning' }).metadata()
  expect(meta.format).toBe('webp'); expect(meta.hasAlpha).toBe(true)
  expect([meta.width, meta.height]).toEqual([352, 656])
  expect(bytes.length).toBe(manifest.runtime.bytes)
  expect(bytes.length).toBeLessThan(90_000)
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.runtime.sha256)
  expect(manifest.source).toMatchObject({ file: sourceName, width: 1024, height: 1536, sha256: sourceSha })
  expect(manifest.derivation).toMatchObject({ crop: { left: 83, top: 23, width: 833, height: 1468 }, mirror: false, alphaCleanup: { maximumClearedAlpha: 3 } })
  const visual = resolveAvatar(id)
  if (visual.kind !== 'static-image') throw new Error('Static Exercise resource missing')
  expect(visual.asset.cssFrame).toEqual({ width: 88, height: 164 })
  expect(visual.asset.width / visual.asset.height).toBe(88 / 164)
  expect(visual.asset.footAnchor).toEqual({ x: 0.5, y: 1 })
  expect(visual.blink).toBe(false); expect(visual.capturePerch).toBe(false)
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = 0, left = info.width, right = -1, top = info.height, bottom = -1
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const a = data[(y * info.width + x) * 4 + 3]
    if (!a) transparent++
    if (a >= 8) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
  }
  // These full-size outfits and bags occupy more of the common frame than
  // earlier silhouettes. A real cutout still leaves substantial transparency.
  expect(transparent).toBeGreaterThan(info.width * info.height * 0.4)
  for (const pixel of [0, info.width - 1, (info.height - 1) * info.width, info.width * info.height - 1])
    expect(data[pixel * 4 + 3]).toBe(0)
  expect(top / 4).toBeGreaterThan(8)
  expect(top / 4).toBeLessThan(13)
  expect(bottom / 4).toBeGreaterThan(161)
  expect(bottom / 4).toBeLessThan(164)
  expect(left).toBeGreaterThan(0)
  expect(right).toBeLessThan(info.width - 1)
})
