// @vitest-environment node
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { wardrobeLooks } from './aboutWardrobeContent'

it('Watching landscape preview removes only transparent top padding, retaining every visible pixel', async () => {
  const look = wardrobeLooks.find(item => item.id === 'eden-watching')!
  const window = look.window
  const bytes = await readFile(new URL('../components/avatar/assets/eden-watching-prone-static.webp', import.meta.url))
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  expect(info.width).toBe(352); expect(info.height).toBe(656)
  let visible = 0
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] === 0) continue
    visible++
    if (x < window.x || x >= window.x + window.width || y < window.y || y >= window.y + window.height) throw new Error(`Visible Watching pixel outside preview: ${x},${y}`)
  }
  expect(visible).toBeGreaterThan(10000)
})
