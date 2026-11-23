import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { resolveAvatar, type AvatarId } from './avatarRegistry'

it.each([
  ['tarot', '2d93cfc7908634d2038a2208a8c49e1fab87940763c880a3b19c25de5382f4ac'],
  ['iching', 'e9a9f418aee8f7ca3df170aa822c3a93c8f14d6c10938bffe9276c8647a5b22e'],
  ['bazi', '9979837b82bb03252d653c2769d509fd352fb8ec5157ea17bf957eae017b246e'],
  ['astrology', 'd0b5284ac28446d99d8a7455b73199cf4f006d1d2ea30feaa05bb5a5d9445976'],
  ['ziwei', 'e358a95a779cf68556f43c82c2dca7f2de3a9fa560bc4075aeb8f31d006b3d4e'],
  ['ai-explorer', '79738508213cbcd1db5ff268998c63e3f6aa913d39f93087c210c5c632f5efb5'],
])('retains the approved %s identity and complete alpha bounds in a transparent 88x164 frame', async (system, sourceSha) => {
  const root = path.resolve('src/components/avatar/assets')
  const manifest = JSON.parse(await readFile(path.join(root, `eden-${system}-static.json`), 'utf8'))
  const bytes = await readFile(path.join(root, manifest.runtime.file))
  const meta = await sharp(bytes, { failOn: 'warning' }).metadata()
  expect(meta.format).toBe('webp'); expect(meta.hasAlpha).toBe(true)
  expect([meta.width, meta.height]).toEqual([352, 656])
  expect(bytes.length).toBe(manifest.runtime.bytes)
  expect(bytes.length).toBeLessThan(120_000)
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.runtime.sha256)
  expect(manifest.source).toMatchObject({ width: 1024, height: 1536, sha256: sourceSha, verifiedIdentity: system })
  expect(manifest.derivation).toMatchObject({ padding: 8, mirror: false, alphaCleanup: { maximumClearedAlpha: 3 } })
  const visual = resolveAvatar(`eden-${system}` as AvatarId)
  if (visual.kind !== 'static-image') throw new Error('Cosmos static resource missing')
  expect(visual.prototype).toBe('4D-static')
  expect(visual.asset.cssFrame).toEqual({ width: 88, height: 164 })
  expect(visual.asset.width / visual.asset.height).toBe(88 / 164)
  expect(visual.asset.footAnchor).toEqual({ x: 0.5, y: 1 })
  expect(manifest.capabilities).toEqual({ static: true, blink: false, dedicatedActionFrames: false, capturePerch: false })
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let transparent = 0, left = info.width, right = -1, top = info.height, bottom = -1
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3]
    if (!alpha) transparent++
    if (alpha >= 8) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
  }
  expect(transparent).toBeGreaterThan(info.width * info.height * 0.4)
  expect(top / 4).toBeGreaterThan(25)
  expect(top / 4).toBeLessThan(32)
  expect(bottom / 4).toBeGreaterThan(161)
  expect(bottom / 4).toBeLessThan(164)
  expect(left).toBeGreaterThan(0); expect(right).toBeLessThan(info.width - 1)
})
