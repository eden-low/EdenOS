// Read-only release smoke; fresh unauthenticated Chrome, no live account operations.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createBrowserSession, delay } from './browserSession.mjs'
const origin = 'https://staging--edenos.netlify.app'
const expectedSha = process.argv[2]
assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/)
const output = path.resolve('artifacts/browser-validation/about')
await mkdir(output, { recursive: true })
const metadata = await (await fetch(origin + '/staging-build.json', { cache: 'no-store' })).json()
assert.equal(metadata.sha, expectedSha)
const routes = await Promise.all(['/', '/about', '/expenses', '/exercise', '/records', '/weekly-review', '/anime', '/cosmos'].map(async (route) => {
  const response = await fetch(origin + route); assert.equal(response.status, 200)
  const html = await response.text(); assert(html.includes('id="root"'))
  return { route, status: response.status, html }
}))
const entryAssets = [...routes[0].html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1])
const entries = await Promise.all(entryAssets.map(async (asset) => {
  const response = await fetch(origin + asset); assert.equal(response.status, 200)
  return { asset, text: await response.text() }
}))
const main = entries.find((entry) => entry.asset.endsWith('.js')).text
const aboutChunk = main.match(/AboutPage-[A-Za-z0-9_-]+\.js/)?.[0]
assert(aboutChunk, 'About must be a lazy chunk')
const aboutResponse = await fetch(origin + '/assets/' + aboutChunk); assert.equal(aboutResponse.status, 200)
const aboutJs = await aboutResponse.text()
assert(aboutJs.includes('About Eden'))
const art = await Promise.all(['hero', 'gestures'].map(async (name) => {
  const file = aboutJs.match(new RegExp(`eden-about-${name}-[A-Za-z0-9_-]+\\.webp`))?.[0]
  assert(file, `${name} must be loaded by About rather than Today`)
  assert(!main.includes(file), 'About images must stay out of the Today entry')
  const response = await fetch(origin + '/assets/' + file); assert.equal(response.status, 200)
  const digest = (buffer) => createHash('sha256').update(buffer).digest('hex')
  assert.equal(digest(Buffer.from(await response.arrayBuffer())), digest(await readFile(`src/about/assets/eden-about-${name}.webp`)))
  return file
}))
const manifestResponse = await fetch(origin + '/manifest.webmanifest'); assert.equal(manifestResponse.status, 200)
const manifest = await manifestResponse.json()
await Promise.all(manifest.icons.map(async (icon) => assert.equal((await fetch(origin + icon.src)).status, 200)))
const worker = await fetch(origin + '/sw.js'); assert.equal(worker.status, 200)
const workerJs = await worker.text()
for (const asset of [...art, aboutChunk]) assert(workerJs.includes(asset), 'About resources must be precached')
// Workbox's AMD loader appends .js to the extensionless module in define().
const workerModule = workerJs.match(/workbox-[A-Za-z0-9_-]+/)?.[0]
assert(workerModule, 'Service worker must reference its Workbox runtime')
assert.equal((await fetch(origin + '/' + workerModule + '.js')).status, 200)
const functions = await Promise.all(['weather', 'receipt-ocr', 'fitness-screenshot', 'batch-transactions-screenshot', 'cosmos-reading'].map(async (name) => {
  const response = await fetch(origin + '/.netlify/functions/' + name, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  assert.equal(response.status, 401, 'Missing authentication must reject before upstream API calls')
  return { name, status: response.status }
}))
const session = await createBrowserSession()
const { send, evaluate, waitFor } = session
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await send('Page.navigate', { url: origin + '/about#interactive-eden' })
  await waitFor(`document.body.innerText.includes('Open your workspace')`, 'About auth boundary')
  assert.equal(await evaluate('Boolean(document.querySelector(".about-page"))'), false)
  assert.equal(await evaluate('Boolean(document.querySelector(".genesis-boot-screen"))'), false)
  assert.equal(await evaluate('Boolean(document.querySelector(".eden-avatar"))'), false)
  let pwa
  for (let i = 0; i < 55; i++) {
    pwa = await evaluate(`(async()=>{const r=await navigator.serviceWorker.getRegistrations(), names=await caches.keys();const requests=(await Promise.all(names.map(async name=>(await (await caches.open(name)).keys()).map(r=>r.url)))).flat();return {active:r.some(r=>r.active?.state==='activated'),aboutChunk:requests.some(url=>url.includes('AboutPage-')&&url.includes('.js')),hero:requests.some(url=>url.includes('eden-about-hero-')),gestures:requests.some(url=>url.includes('eden-about-gestures-')),entries:requests.length}})()`)
    if (pwa.active && pwa.aboutChunk && pwa.hero && pwa.gestures) break
    await delay(1000)
  }
  assert(pwa.active && pwa.aboutChunk && pwa.hero && pwa.gestures)
  await evaluate('window.aboutSmokeMarker=true'); await send('Page.reload')
  await waitFor('!window.aboutSmokeMarker', 'new controlled document')
  await waitFor(`document.body.innerText.includes('Open your workspace')`, 'auth after reload')
  assert(await evaluate('Boolean(navigator.serviceWorker.controller)'))
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  await evaluate('window.aboutSmokeMarker=true'); await send('Page.reload')
  await waitFor('!window.aboutSmokeMarker', 'new offline document')
  await waitFor(`document.body.innerText.includes('Open your workspace')`, 'offline /about shell stays protected')
  assert.equal(await evaluate('Boolean(document.querySelector(".about-page"))'), false)
  await session.shot(path.join(output, 'staging-about-auth-offline.png'))
  assert.deepEqual(session.errors, [])
  const report = { sha: expectedSha, routes: routes.map(({ route, status }) => ({ route, status })), entryAssets: entryAssets.length, aboutChunk, art, manifestIcons: manifest.icons.length, functions, pwa, offlineAboutShellProtected: true, liveAuthenticationNotPerformed: true, errors: session.errors }
  await writeFile(path.join(output, 'staging-results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await session.close() }
