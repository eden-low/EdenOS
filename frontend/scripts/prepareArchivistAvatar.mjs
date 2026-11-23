// Approved draft only; the 88x164 preview is a comparison, never a pixel source.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const sourcePath = process.argv[2]
assert(sourcePath, 'Usage: node scripts/prepareArchivistAvatar.mjs <approved-visual-draft.png>')
const input = await readFile(sourcePath)
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sourceSha = 'ac632b474484cbdc7e2180530d5d7c681f109e7611fda83e122ceb999ccda47d'
assert.equal(sha256(input), sourceSha, 'Only the approved Archivist draft is accepted')
const source = await sharp(input, { failOn: 'warning' }).metadata()
assert(source.format === 'png' && source.width === 380 && source.height === 630 && source.hasAlpha)
// Complete nonzero-alpha bounds, including antialiasing. Uniform downsampling
// matches the approved preview's head/foot alignment without stretching art.
const crop = { left: 74, top: 7, width: 266, height: 623 }
const canvas = { width: 264, height: 492 }
const webp = { quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true }
const bytes = await sharp(input, { failOn: 'warning' }).extract(crop)
  .resize(canvas.width, canvas.height, { fit: 'contain', position: 'centre', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
  .webp(webp).toBuffer()
const decoded = await sharp(bytes).metadata()
assert(decoded.hasAlpha && decoded.width === canvas.width && decoded.height === canvas.height)
const output = fileURLToPath(new URL('../src/components/avatar/assets/', import.meta.url))
const file = 'eden-archivist-clipboard-static.webp'
await writeFile(path.join(output, file), bytes)
const metadata = {
  id: 'eden-archivist', version: '4B-static-v1',
  source: { file: 'Part4B_Archivist_Eden_visual_draft.png', width: source.width, height: source.height, bytes: input.length, sha256: sourceSha },
  derivation: { crop, fit: 'contain', position: 'centre', webp },
  runtime: { file, ...canvas, bytes: bytes.length, sha256: sha256(bytes), hasAlpha: true, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
  capabilities: { static: true, blink: false, clipboardReading: false, pageTurn: false, nod: false },
}
await writeFile(path.join(output, 'eden-archivist-clipboard-static.json'), JSON.stringify(metadata, null, 2) + '\n')
console.log(JSON.stringify(metadata, null, 2))
