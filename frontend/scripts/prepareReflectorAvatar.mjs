// Deterministic encoding only, from the owner's final approved right-facing PNG.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const sourcePath = process.argv[2]
assert(sourcePath, 'Usage: node scripts/prepareReflectorAvatar.mjs <approved-final.png>')
const input = await readFile(sourcePath)
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sourceSha = 'c9aa5e052b165961f1c54eb7352eb98f284cc70c7a01aae21a6559c1ac0dad1a'
assert.equal(sha256(input), sourceSha, 'Only the final approved Reflector PNG is accepted')
const source = await sharp(input, { failOn: 'warning' }).metadata()
assert(source.format === 'png' && source.width === 817 && source.height === 1925 && source.hasAlpha)
// Preserve the whole source canvas and its antialiased edge. The source's faint
// export speckles are alpha <=3/255; clear only those nearly invisible pixels.
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
let clearedPixels = 0
for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0 && data[i + 3] <= 3) {
  data[i + 3] = 0; clearedPixels++
}
const canvas = { width: 352, height: 656 }
const webp = { quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true }
const bytes = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .resize(canvas.width, canvas.height, { fit: 'contain', position: 'centre', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
  .webp(webp).toBuffer()
const decoded = await sharp(bytes).metadata()
assert(decoded.hasAlpha && decoded.width === canvas.width && decoded.height === canvas.height)
const output = fileURLToPath(new URL('../src/components/avatar/assets/', import.meta.url))
const file = 'eden-reflector-journal-static.webp'
await writeFile(path.join(output, file), bytes)
const metadata = {
  id: 'eden-reflector', version: '4B-static-v1',
  source: { file: '思考中的少年与飞翼书册.png', width: source.width, height: source.height, bytes: input.length, sha256: sourceSha },
  derivation: { crop: null, fit: 'contain', position: 'centre', mirror: false, alphaCleanup: { maximumClearedAlpha: 3, clearedPixels }, webp },
  runtime: { file, ...canvas, bytes: bytes.length, sha256: sha256(bytes), hasAlpha: true, nativeFacing: 'right', cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
  capabilities: { static: true, blink: false, pageTurn: false, writing: false, lookUp: false },
}
await writeFile(path.join(output, 'eden-reflector-journal-static.json'), JSON.stringify(metadata, null, 2) + '\n')
console.log(JSON.stringify(metadata, null, 2))
