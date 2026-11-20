import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { resolveAvatar } from './avatarRegistry'

describe('approved Treasurer runtime resource', () => {
  it('is a transparent 4x frame derived from the approved high-resolution source', async () => {
    const root = path.resolve('src/components/avatar/assets')
    const manifest = JSON.parse(await readFile(path.join(root, 'eden-treasurer-abacus-static.json'), 'utf8'))
    const bytes = await readFile(path.join(root, manifest.runtime.file))
    const meta = await sharp(bytes, { failOn: 'warning' }).metadata()
    expect(meta.format).toBe('webp'); expect(meta.hasAlpha).toBe(true)
    expect([meta.width,meta.height]).toEqual([352,656])
    expect(bytes.length).toBe(manifest.runtime.bytes)
    expect(bytes.length).toBeLessThan(manifest.source.bytes / 10)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.runtime.sha256)
    expect(manifest.source.file).toBe('treasurer-eden-abacus-source.png')
    expect(manifest.source.sha256).toBe('beeeac4d3a2b8a96119f6d8a84e83492f105fef7db01e1d26bda7b0e8450cf42')
    const visual = resolveAvatar('eden-treasurer')
    if (visual.kind !== 'static-image') throw new Error('Static prototype missing')
    expect(visual.asset.width / visual.asset.height).toBe(visual.asset.cssFrame.width / visual.asset.cssFrame.height)
    expect(visual.asset.footAnchor).toEqual({ x: 0.5, y: 1 })
    expect(manifest.runtime.cssFrame).toEqual(visual.asset.cssFrame)
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let transparent = 0, top = info.height, bottom = -1
    for (let y=0;y<info.height;y++) for (let x=0;x<info.width;x++) {
      const alpha = data[(y*info.width+x)*4+3]
      if (!alpha) transparent++
      if (alpha>=8) { top=Math.min(top,y); bottom=Math.max(bottom,y) }
    }
    expect(transparent).toBeGreaterThan(info.width * info.height / 2)
    expect(top / 4).toBeGreaterThanOrEqual(1)
    expect(top / 4).toBeLessThanOrEqual(5)
    expect(bottom / 4).toBeGreaterThanOrEqual(159)
    expect(bottom / 4).toBeLessThan(164)
  })
})
