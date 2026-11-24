// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import { resolveAvatar } from './avatarRegistry'

it.each([
  ['eden-archivist', 'eden-archivist-clipboard', '44ec07f5377cc7487e2fdc0706e35d0be03e569ff62b44821d0b9b5e625efb3f'],
  ['eden-reflector', 'eden-reflector-journal', '13b69909347234b5c5c4bf3e2b6bf6ceb1a3ca53f4cdfa1bee394a16e00af849'],
] as const)('%s has exactly the same visible pixels and alpha in static / motion rest / final rest', async (id, stem, atlasHash) => {
  const root = new URL('./assets/', import.meta.url)
  const bytes = await readFile(new URL(`${stem}-static.webp`, root))
  const atlas = await readFile(new URL(`${stem}-motion-v1.webp`, root))
  expect(createHash('sha256').update(atlas).digest('hex')).toBe(atlasHash)
  const still = await sharp(bytes).ensureAlpha().raw().toBuffer()
  const rest = await sharp(atlas).extract({ left: 0, top: 0, width: 264, height: 492 }).ensureAlpha().raw().toBuffer()
  const alpha = (b: Buffer, x: number, y: number) => b[(y * 264 + x) * 4 + 3]
  if (id === 'eden-archivist') for (const [x, y] of [[90, 350], [110, 350], [90, 400]]) expect(alpha(still, x, y)).toBeGreaterThan(240)
  for (const b of [still, rest]) for (let i = 0; i < b.length; i += 4) if (b[i + 3] === 0) b.fill(0, i, i + 3)
  expect(still.equals(rest)).toBe(true) // Includes edges, trousers, glasses, jacket, book, body and feet.
  const visual = resolveAvatar(id)
  if (visual.kind !== 'static-image' || !visual.motion) throw Error('Missing motion identity')
  expect(visual.asset).toMatchObject({ width: 264, height: 492, cssFrame: { width: 88, height: 164 }, footAnchor: { x: .5, y: 1 } })
  expect(visual.motion.sequences.blink[0].frame).toBe(0)
  expect(visual.motion.sequences.blink.at(-1)?.frame).toBe(0)
  const secondary = visual.motion.secondaryAction === 'abacus' ? visual.motion.sequences.abacus : visual.motion.sequences.pageTurn
  expect(secondary[0].frame).toBe(0); expect(secondary.at(-1)?.frame).toBe(0)
})
