// Deterministic encoding/alignment only. Never derives production art from the
// 88x164 preview or the review board; original references stay outside Git.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const sourcePath = process.argv[2]
assert(sourcePath, 'Usage: node scripts/prepareTreasurerAvatar.mjs <approved-source.png>')
const input = await readFile(sourcePath)
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sourceSha = 'beeeac4d3a2b8a96119f6d8a84e83492f105fef7db01e1d26bda7b0e8450cf42'
assert.equal(sha256(input), sourceSha, 'Only the approved high-resolution PNG is accepted')
const source = await sharp(input, { failOn: 'warning' }).metadata()
assert(source.format === 'png' && source.width === 992 && source.height === 1586 && source.hasAlpha)
// Frame calibration against the approved preview excludes 120px of left margin.
// All source pixels with alpha >=4 are inside x=203..796, so no character detail
// is cropped. The remaining crop is uniformly scaled into the transparent frame.
const crop = { left: 120, top: 0, width: 872, height: 1586 }
const canvas = { width: 352, height: 656 }
const bytes = await sharp(input, { failOn: 'warning' }).extract(crop)
  .resize(canvas.width, canvas.height, { fit: 'contain', position: 'centre', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
  .webp({ quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer()
const decoded = await sharp(bytes).metadata()
assert(decoded.hasAlpha && decoded.width === canvas.width && decoded.height === canvas.height)
const output = fileURLToPath(new URL('../src/components/avatar/assets/', import.meta.url))
await mkdir(output, { recursive: true })
const file = 'eden-treasurer-abacus-static.webp'
await writeFile(path.join(output, file), bytes)
const metadata = {
  id: 'eden-treasurer', version: '4A-static-v1',
  source: { file: 'treasurer-eden-abacus-source.png', width: source.width, height: source.height, bytes: input.length, sha256: sourceSha },
  derivation: { crop, fit: 'contain', position: 'centre', webp: { quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true } },
  runtime: { file, ...canvas, bytes: bytes.length, sha256: sha256(bytes), hasAlpha: true, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
  capabilities: { static: true, blink: false, abacusIdle: false },
}
await writeFile(path.join(output, 'eden-treasurer-abacus-static.json'), JSON.stringify(metadata, null, 2) + '\n')
console.log(JSON.stringify(metadata, null, 2))
