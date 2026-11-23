// Encode the reviewed transparent cutout derived solely from the approved board.
// Extraction is a built-in image edit, not a deterministic crop of the board.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const [boardPath, cutoutPath] = process.argv.slice(2)
assert(boardPath && cutoutPath, 'Usage: node scripts/prepareWatchingAvatar.mjs <approved-board.png> <reviewed-cutout.png>')
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const board = await readFile(boardPath), cutout = await readFile(cutoutPath)
const boardSha = '7599d68ee83f4d0f4f0a5ceeb2d748d9d046fe5b21c19ca685b5a71fd7033939'
const cutoutSha = '5e34ed5a52337dc228027c028a4b6715c7e05d8c390c2fc3a0f892e8275796f5'
assert.equal(sha256(board), boardSha, 'Only the approved Watching board is accepted')
assert.equal(sha256(cutout), cutoutSha, 'Only the inspected transparent extraction is accepted')
const source = await sharp(board, { failOn: 'warning' }).metadata()
const extracted = await sharp(cutout, { failOn: 'warning' }).metadata()
assert(source.format === 'png' && source.width === 1536 && source.height === 1024)
assert(extracted.format === 'png' && extracted.width === 1407 && extracted.height === 1118 && extracted.hasAlpha)
const canvas = { width: 352, height: 656 }
// Wide prone artwork occupies the lower frame at its native ratio. Transparent
// top space is intentional; never fill a portrait box by stretching the body.
const scaled = await sharp(cutout).resize({ width: 336, height: 640, fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' }).png().toBuffer({ resolveWithObject: true })
const webp = { quality: 92, alphaQuality: 100, effort: 6, smartSubsample: true }
const padding = { left: 8, right: 8, top: canvas.height - scaled.info.height - 8, bottom: 8 }
const bytes = await sharp(scaled.data).extend({ ...padding, background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp(webp).toBuffer()
const decoded = await sharp(bytes).metadata()
assert(decoded.hasAlpha && decoded.width === canvas.width && decoded.height === canvas.height)
const output = fileURLToPath(new URL('../src/components/avatar/assets/', import.meta.url))
const file = 'eden-watching-prone-static.webp'
await writeFile(path.join(output, file), bytes)
const metadata = {
  id: 'eden-watching', version: '4B-static-v1',
  source: { file: 'EdenOS趴姿追番角色设计表.png', width: source.width, height: source.height, bytes: board.length, sha256: boardSha, use: 'left-main-illustration-only' },
  extraction: { method: 'built-in-image-edit-background-extraction', file: 'watching-cutout.png', width: extracted.width, height: extracted.height, bytes: cutout.length, sha256: cutoutSha, removed: ['board-background', 'titles', 'measurement-guides', 'preview-panels', 'detail-cards', 'attention-rays', 'popcorn', 'drink', 'book-stack'] },
  derivation: { fit: 'inside', scaled: { width: scaled.info.width, height: scaled.info.height }, padding, mirror: false, webp },
  runtime: { file, ...canvas, bytes: bytes.length, sha256: sha256(bytes), hasAlpha: true, nativeFacing: 'left', posture: 'prone', cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 }, anchorMeaning: 'lower-resting-plane-of-tablet-and-cushion' },
  capabilities: { static: true, blink: false, gaze: false, yawn: false, capturePerch: false },
}
await writeFile(path.join(output, 'eden-watching-prone-static.json'), JSON.stringify(metadata, null, 2) + '\n')
console.log(JSON.stringify(metadata, null, 2))
