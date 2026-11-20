// Approved standalone final PNGs only; no generative edits or alternate art.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const sourcePaths = process.argv.slice(2)
assert.equal(sourcePaths.length, 6, 'Usage: node scripts/prepareCosmosAvatars.mjs <tarot> <iching> <bazi> <astrology> <ziwei> <ai-explorer>')
const specs = [
  ['tarot', '2d93cfc7908634d2038a2208a8c49e1fab87940763c880a3b19c25de5382f4ac'],
  ['iching', 'e9a9f418aee8f7ca3df170aa822c3a93c8f14d6c10938bffe9276c8647a5b22e'],
  ['bazi', '9979837b82bb03252d653c2769d509fd352fb8ec5157ea17bf957eae017b246e'],
  ['astrology', 'd0b5284ac28446d99d8a7455b73199cf4f006d1d2ea30feaa05bb5a5d9445976'],
  ['ziwei', 'e358a95a779cf68556f43c82c2dca7f2de3a9fa560bc4075aeb8f31d006b3d4e'],
  ['ai-explorer', '79738508213cbcd1db5ff268998c63e3f6aa913d39f93087c210c5c632f5efb5'],
]
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
for (const [index, [system, sourceSha]] of specs.entries()) {
  const input = await readFile(sourcePaths[index])
  assert.equal(sha256(input), sourceSha, `Wrong approved identity/order for ${system}`)
  const source = await sharp(input, { failOn: 'warning' }).metadata()
  assert(source.format === 'png' && source.width === 1024 && source.height === 1536 && source.hasAlpha)
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let clearedPixels = 0
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0 && data[i + 3] <= 3) { data[i + 3] = 0; clearedPixels++ }
  // Common native scale/head/foot calibration, retaining every required prop,
  // ribbon and meaningful alpha pixel. Add margin for source art near the edge.
  const crop = { left: 24, top: 0, width: 987, height: 1536 }
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
    if (x < crop.left || x >= crop.left + crop.width) assert.equal(data[(y * info.width + x) * 4 + 3], 0, 'Crop must retain all nontransparent pixels')
  const canvas = { width: 352, height: 656 }
  const webp = { quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true }
  const padded = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(crop).extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()
  const bytes = await sharp(padded)
    .resize(canvas.width, canvas.height, { fit: 'contain', position: 'bottom', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .webp(webp).toBuffer()
  const decoded = await sharp(bytes).metadata()
  assert(decoded.hasAlpha && decoded.width === canvas.width && decoded.height === canvas.height)
  const output = fileURLToPath(new URL('../src/components/avatar/assets/', import.meta.url))
  const file = `eden-${system}-static.webp`
  await writeFile(path.join(output, file), bytes)
  const metadata = {
    id: `eden-${system}`, version: '4D-static-v1',
    source: { file: `eden-${system}-source.png`, suppliedFile: path.basename(sourcePaths[index]), width: source.width, height: source.height, bytes: input.length, sha256: sourceSha, verifiedIdentity: system },
    derivation: { crop, padding: 8, fit: 'contain', position: 'bottom', mirror: false, alphaCleanup: { maximumClearedAlpha: 3, clearedPixels }, webp },
    runtime: { file, ...canvas, bytes: bytes.length, sha256: sha256(bytes), hasAlpha: true, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
    capabilities: { static: true, blink: false, dedicatedActionFrames: false, capturePerch: false },
  }
  await writeFile(path.join(output, `eden-${system}-static.json`), JSON.stringify(metadata, null, 2) + '\n')
  console.log(JSON.stringify(metadata))
}
