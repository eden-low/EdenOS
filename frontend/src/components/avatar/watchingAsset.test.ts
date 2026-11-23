import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { resolveAvatar } from './avatarRegistry'

it('ships a transparent Watching cutout, not the board, uniformly fitted to a lower resting plane', async () => {
  const root = path.resolve('src/components/avatar/assets')
  const manifest = JSON.parse(await readFile(path.join(root, 'eden-watching-prone-static.json'), 'utf8'))
  const bytes = await readFile(path.join(root, manifest.runtime.file))
  const meta = await sharp(bytes, { failOn: 'warning' }).metadata()
  expect(meta.format).toBe('webp'); expect(meta.hasAlpha).toBe(true)
  expect([meta.width, meta.height]).toEqual([352, 656])
  expect(bytes.length).toBe(manifest.runtime.bytes)
  expect(bytes.length).toBeLessThan(50_000)
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.runtime.sha256)
  expect(manifest.source).toMatchObject({ file: 'EdenOS趴姿追番角色设计表.png', width: 1536, height: 1024, use: 'left-main-illustration-only', sha256: '7599d68ee83f4d0f4f0a5ceeb2d748d9d046fe5b21c19ca685b5a71fd7033939' })
  expect(manifest.extraction.method).toBe('built-in-image-edit-background-extraction')
  expect(manifest.extraction.sha256).toBe('5e34ed5a52337dc228027c028a4b6715c7e05d8c390c2fc3a0f892e8275796f5')
  const scale = manifest.derivation.scaled
  expect(scale.width / scale.height).toBeCloseTo(manifest.extraction.width / manifest.extraction.height, 2)
  expect(manifest.derivation.mirror).toBe(false)
  const visual = resolveAvatar('eden-watching')
  if (visual.kind !== 'static-image') throw new Error('Watching prototype missing')
  expect(visual.posture).toBe('prone')
  expect(visual.asset.cssFrame).toEqual({ width: 88, height: 164 })
  expect(visual.asset.width / visual.asset.height).toBe(88 / 164)
  expect(visual.asset.footAnchor).toEqual({ x: 0.5, y: 1 })
  expect(manifest.runtime.anchorMeaning).toBe('lower-resting-plane-of-tablet-and-cushion')
  expect(manifest.capabilities).toEqual({ static: true, blink: false, gaze: false, yawn: false, capturePerch: false })
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = 0, upperAlpha = 0, left = info.width, right = -1, top = info.height, bottom = -1
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3]
    if (!alpha) transparent++
    if (y < 370) upperAlpha += alpha
    if (alpha >= 8) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
  }
  expect(transparent).toBeGreaterThan(info.width * info.height * 0.7)
  expect(upperAlpha).toBe(0) // no board heading, panels or background above the pose
  expect(top / 4).toBeGreaterThan(94)
  expect(top / 4).toBeLessThan(100)
  expect(bottom / 4).toBeGreaterThan(157)
  expect(bottom / 4).toBeLessThan(162)
  expect(left / 4).toBeGreaterThan(1)
  expect(right / 4).toBeLessThan(87)
})
