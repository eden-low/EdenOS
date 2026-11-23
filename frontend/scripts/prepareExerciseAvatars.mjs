// Approved final standalone PNGs only. No board extraction or image generation.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const [swimPath, boxingPath] = process.argv.slice(2)
assert(swimPath && boxingPath, 'Usage: node scripts/prepareExerciseAvatars.mjs <approved-swim.png> <approved-boxing.png>')
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sources = [
  { id: 'eden-swim', path: swimPath, file: '泳池训练少年与猫咪装备.png', hash: '8a2f2b298c44ae37d0a3fbe86ecf8e4f09d1a160e898e4ff30c2c21a652530f5' },
  { id: 'eden-boxing', path: boxingPath, file: '炫彩拳击少年伊甸.png', hash: 'f01340383fe59707c967627c45d953b7279453f3b55bac5318dfdf911b6f6863' },
]
for (const spec of sources) {
  const input = await readFile(spec.path)
  assert.equal(sha256(input), spec.hash, 'Only the approved final PNG is accepted')
  const source = await sharp(input, { failOn: 'warning' }).metadata()
  assert(source.format === 'png' && source.width === 1024 && source.height === 1536 && source.hasAlpha)
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let clearedPixels = 0
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0 && data[i + 3] <= 3) { data[i + 3] = 0; clearedPixels++ }
  // Shared calibration keeps head/foot positions consistent between forms.
  // Both images' complete alpha>=4 bounds fit inside this crop plus 8px margin.
  const crop = { left: 83, top: 23, width: 833, height: 1468 }
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (x < crop.left || x >= crop.left + crop.width || y < crop.top || y >= crop.top + crop.height)
      assert.equal(data[(y * info.width + x) * 4 + 3], 0, 'Crop must retain every nontransparent pixel after alpha cleanup')
  }
  const canvas = { width: 352, height: 656 }
  const webp = { quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true }
  const bytes = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(crop)
    .resize(canvas.width, canvas.height, { fit: 'contain', position: 'bottom', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .webp(webp).toBuffer()
  const decoded = await sharp(bytes).metadata()
  assert(decoded.hasAlpha && decoded.width === canvas.width && decoded.height === canvas.height)
  const output = fileURLToPath(new URL('../src/components/avatar/assets/', import.meta.url))
  const file = `${spec.id}-static.webp`
  await writeFile(path.join(output, file), bytes)
  const metadata = {
    id: spec.id, version: '4C-static-v1',
    source: { file: spec.file, width: source.width, height: source.height, bytes: input.length, sha256: spec.hash },
    derivation: { crop, fit: 'contain', position: 'bottom', mirror: false, alphaCleanup: { maximumClearedAlpha: 3, clearedPixels }, webp },
    runtime: { file, ...canvas, bytes: bytes.length, sha256: sha256(bytes), hasAlpha: true, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
    capabilities: { static: true, blink: false, dedicatedIdleFrames: false, capturePerch: false },
  }
  await writeFile(path.join(output, `${spec.id}-static.json`), JSON.stringify(metadata, null, 2) + '\n')
  console.log(JSON.stringify(metadata))
}
