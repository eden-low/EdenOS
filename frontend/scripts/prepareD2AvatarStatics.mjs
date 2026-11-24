// Phase D2: package existing, visually reviewed rest cells as canonical statics.
// No drawing, AI generation, recolouring, resizing, alpha repair or new frames.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../src/components/avatar/assets/', import.meta.url))
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const check = process.argv.includes('--check')
const cell = { left: 0, top: 0, width: 264, height: 492 }
const encoding = { lossless: true, effort: 6, alphaQuality: 100 }
const roles = [
  { id: 'eden-archivist', stem: 'eden-archivist-clipboard', facing: 'left',
    atlasHash: '44ec07f5377cc7487e2fdc0706e35d0be03e569ff62b44821d0b9b5e625efb3f',
    previous: { version: '4B-static-v1', width: 264, height: 492, bytes: 48890, sha256: '75bef2ce7bfcd3e0175e7f7c5f367541084e45df391ac90ca0baefc9f88ebf83', sourceFile: 'Part4B_Archivist_Eden_visual_draft.png', sourceSha256: 'ac632b474484cbdc7e2180530d5d7c681f109e7611fda83e122ceb999ccda47d' },
    capabilities: { static: true, blink: false, clipboardReading: false, pageTurn: false, nod: false } },
  { id: 'eden-reflector', stem: 'eden-reflector-journal', facing: 'right',
    atlasHash: '13b69909347234b5c5c4bf3e2b6bf6ceb1a3ca53f4cdfa1bee394a16e00af849',
    previous: { version: '4B-static-v1', width: 352, height: 656, bytes: 63508, sha256: 'c19601cedd49beabf63ea3017eecc050010e5c3e3ed98684eee3e156d83b7ca3', sourceFile: '思考中的少年与飞翼书册.png', sourceSha256: 'c9aa5e052b165961f1c54eb7352eb98f284cc70c7a01aae21a6559c1ac0dad1a' },
    capabilities: { static: true, blink: false, pageTurn: false, writing: false, lookUp: false } },
]

for (const role of roles) {
  const atlasFile = `${role.stem}-motion-v1.webp`, file = `${role.stem}-static.webp`
  const atlas = await readFile(path.join(root, atlasFile))
  assert.equal(digest(atlas), role.atlasHash, 'Only the reviewed existing six-frame atlas is accepted')
  const meta = await sharp(atlas, { failOn: 'warning' }).metadata()
  assert(meta.width === 792 && meta.height === 984 && meta.hasAlpha)
  const raw = await sharp(atlas).extract(cell).ensureAlpha().raw().toBuffer()
  // Fully transparent RGB carries no displayed colour. Normalise just that
  // unused data so lossless encoder choices cannot affect the pixel comparison.
  for (let at = 0; at < raw.length; at += 4) if (raw[at + 3] === 0) raw.fill(0, at, at + 3)
  const bytes = await sharp(raw, { raw: { width: cell.width, height: cell.height, channels: 4 } }).webp(encoding).toBuffer()
  const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer()
  for (let at = 0; at < decoded.length; at += 4) if (decoded[at + 3] === 0) decoded.fill(0, at, at + 3)
  assert(decoded.equals(raw), 'The static must preserve every decoded RGBA pixel of rest cell 1')
  const manifest = {
    id: role.id, version: 'D2-static-v2', ownerAcceptance: 'Pending staging real-device acceptance',
    source: { file: atlasFile, sha256: role.atlasHash, width: 792, height: 984, frame: 1, role: 'Existing six-frame motion atlas; canonical rest design reviewed for D2' },
    previousStatic: role.previous,
    derivation: { script: 'scripts/prepareD2AvatarStatics.mjs', extract: cell, resize: null, mirror: false, alphaValuesChanged: false, transparentRGB: 'Zero RGB only where alpha is already zero', encoding, decodedRgbaSha256: digest(raw), sharpVersion: sharp.versions.sharp },
    runtime: { file, width: 264, height: 492, bytes: bytes.length, sha256: digest(bytes), hasAlpha: true, nativeFacing: role.facing, cssFrame: { width: 88, height: 164 }, footAnchor: { x: 0.5, y: 1 } },
    capabilities: role.capabilities,
  }
  const json = JSON.stringify(manifest, null, 2) + '\n'
  const motionPath = path.join(root, `${role.stem}-motion-v1.json`)
  const motionManifest = JSON.parse(await readFile(motionPath, 'utf8'))
  const canonicalStatic = { file, version: manifest.version, sha256: manifest.runtime.sha256, derivedFromRuntimeFrame: 1, sourceAtlasSha256: role.atlasHash, alignment: 'Same visible RGB and all alpha values as runtime rest cell; no resize or redraw' }
  const expectedMotionManifest = { ...motionManifest, canonicalStatic }
  if (role.id === 'eden-reflector') {
    expectedMotionManifest.historicalLimitations ??= motionManifest.limitations
    expectedMotionManifest.limitations = motionManifest.limitations.filter(note => !note.startsWith('Candidate lapel/collar/folds differ'))
  }
  if (check) {
    assert(bytes.equals(await readFile(path.join(root, file))), 'Committed WebP is not reproducible')
    assert.deepEqual(JSON.parse(await readFile(path.join(root, `${role.stem}-static.json`), 'utf8')), manifest)
    assert.deepEqual(motionManifest, expectedMotionManifest)
  } else {
    await writeFile(path.join(root, file), bytes)
    await writeFile(path.join(root, `${role.stem}-static.json`), json)
    await writeFile(motionPath, JSON.stringify(expectedMotionManifest, null, 2) + '\n')
  }
  console.log(JSON.stringify({ id: role.id, check, ...manifest.runtime, decodedRgbaSha256: digest(raw) }))
}
