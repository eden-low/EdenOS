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
const treasurerFile = main.match(/eden-treasurer-abacus-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(treasurerFile, 'Treasurer runtime material must be referenced by the global renderer')
const treasurerResponse = await fetch(origin + '/assets/' + treasurerFile); assert.equal(treasurerResponse.status,200)
const treasurerBytes = Buffer.from(await treasurerResponse.arrayBuffer())
const treasurerLocal = await readFile('src/components/avatar/assets/eden-treasurer-abacus-static.webp')
assert.equal(createHash('sha256').update(treasurerBytes).digest('hex'),createHash('sha256').update(treasurerLocal).digest('hex'))
const motionFile = main.match(/eden-treasurer-abacus-motion-v1-[A-Za-z0-9_-]+\.webp/)?.[0]
const motionChunk = main.match(/AvatarMotionLayer-[A-Za-z0-9_-]+\.js/)?.[0]
assert(motionFile && motionChunk, 'Treasurer motion art and lazy renderer must be referenced')
const motionResponse = await fetch(origin + '/assets/' + motionFile);assert.equal(motionResponse.status,200)
const motionBytes = Buffer.from(await motionResponse.arrayBuffer())
const motionLocal = await readFile('src/components/avatar/assets/eden-treasurer-abacus-motion-v1.webp')
assert.equal(createHash('sha256').update(motionBytes).digest('hex'),createHash('sha256').update(motionLocal).digest('hex'))
assert.equal((await fetch(origin + '/assets/' + motionChunk)).status,200)
const archivistFile = main.match(/eden-archivist-clipboard-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(archivistFile, 'Archivist runtime material must be referenced by the global renderer')
const archivistResponse = await fetch(origin + '/assets/' + archivistFile); assert.equal(archivistResponse.status,200)
const archivistBytes = Buffer.from(await archivistResponse.arrayBuffer())
const archivistLocal = await readFile('src/components/avatar/assets/eden-archivist-clipboard-static.webp')
assert.equal(createHash('sha256').update(archivistBytes).digest('hex'),createHash('sha256').update(archivistLocal).digest('hex'))
const reflectorFile = main.match(/eden-reflector-journal-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(reflectorFile, 'Reflector runtime material must be referenced by the global renderer')
const reflectorResponse = await fetch(origin + '/assets/' + reflectorFile); assert.equal(reflectorResponse.status,200)
const reflectorBytes = Buffer.from(await reflectorResponse.arrayBuffer())
const reflectorLocal = await readFile('src/components/avatar/assets/eden-reflector-journal-static.webp')
assert.equal(createHash('sha256').update(reflectorBytes).digest('hex'),createHash('sha256').update(reflectorLocal).digest('hex'))
const watchingFile = main.match(/eden-watching-prone-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(watchingFile, 'Watching runtime material must be referenced by the global renderer')
const watchingResponse = await fetch(origin + '/assets/' + watchingFile); assert.equal(watchingResponse.status,200)
const watchingBytes = Buffer.from(await watchingResponse.arrayBuffer())
const watchingLocal = await readFile('src/components/avatar/assets/eden-watching-prone-static.webp')
assert.equal(createHash('sha256').update(watchingBytes).digest('hex'),createHash('sha256').update(watchingLocal).digest('hex'))
const swimFile = main.match(/eden-swim-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(swimFile, 'Swim runtime material must be referenced by the global renderer')
const swimResponse = await fetch(origin + '/assets/' + swimFile); assert.equal(swimResponse.status,200)
const swimBytes = Buffer.from(await swimResponse.arrayBuffer())
const swimLocal = await readFile('src/components/avatar/assets/eden-swim-static.webp')
assert.equal(createHash('sha256').update(swimBytes).digest('hex'),createHash('sha256').update(swimLocal).digest('hex'))
const boxingFile = main.match(/eden-boxing-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(boxingFile, 'Boxing runtime material must be referenced by the global renderer')
const boxingResponse = await fetch(origin + '/assets/' + boxingFile); assert.equal(boxingResponse.status,200)
const boxingBytes = Buffer.from(await boxingResponse.arrayBuffer())
const boxingLocal = await readFile('src/components/avatar/assets/eden-boxing-static.webp')
assert.equal(createHash('sha256').update(boxingBytes).digest('hex'),createHash('sha256').update(boxingLocal).digest('hex'))
const tarotFile = main.match(/eden-tarot-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(tarotFile, 'Tarot runtime material must be referenced by the global renderer')
const tarotResponse = await fetch(origin + '/assets/' + tarotFile); assert.equal(tarotResponse.status,200)
const tarotBytes = Buffer.from(await tarotResponse.arrayBuffer())
const tarotLocal = await readFile('src/components/avatar/assets/eden-tarot-static.webp')
assert.equal(createHash('sha256').update(tarotBytes).digest('hex'),createHash('sha256').update(tarotLocal).digest('hex'))
const ichingFile = main.match(/eden-iching-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(ichingFile, 'Iching runtime material must be referenced by the global renderer')
const ichingResponse = await fetch(origin + '/assets/' + ichingFile); assert.equal(ichingResponse.status,200)
const ichingBytes = Buffer.from(await ichingResponse.arrayBuffer())
const ichingLocal = await readFile('src/components/avatar/assets/eden-iching-static.webp')
assert.equal(createHash('sha256').update(ichingBytes).digest('hex'),createHash('sha256').update(ichingLocal).digest('hex'))
const baziFile = main.match(/eden-bazi-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(baziFile, 'Bazi runtime material must be referenced by the global renderer')
const baziResponse = await fetch(origin + '/assets/' + baziFile); assert.equal(baziResponse.status,200)
const baziBytes = Buffer.from(await baziResponse.arrayBuffer())
const baziLocal = await readFile('src/components/avatar/assets/eden-bazi-static.webp')
assert.equal(createHash('sha256').update(baziBytes).digest('hex'),createHash('sha256').update(baziLocal).digest('hex'))
const astrologyFile = main.match(/eden-astrology-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(astrologyFile, 'Astrology runtime material must be referenced by the global renderer')
const astrologyResponse = await fetch(origin + '/assets/' + astrologyFile); assert.equal(astrologyResponse.status,200)
const astrologyBytes = Buffer.from(await astrologyResponse.arrayBuffer())
const astrologyLocal = await readFile('src/components/avatar/assets/eden-astrology-static.webp')
assert.equal(createHash('sha256').update(astrologyBytes).digest('hex'),createHash('sha256').update(astrologyLocal).digest('hex'))
const ziweiFile = main.match(/eden-ziwei-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(ziweiFile, 'Ziwei runtime material must be referenced by the global renderer')
const ziweiResponse = await fetch(origin + '/assets/' + ziweiFile); assert.equal(ziweiResponse.status,200)
const ziweiBytes = Buffer.from(await ziweiResponse.arrayBuffer())
const ziweiLocal = await readFile('src/components/avatar/assets/eden-ziwei-static.webp')
assert.equal(createHash('sha256').update(ziweiBytes).digest('hex'),createHash('sha256').update(ziweiLocal).digest('hex'))
const aiExplorerFile = main.match(/eden-ai-explorer-static-[A-Za-z0-9_-]+\.webp/)?.[0]
assert(aiExplorerFile, 'Ai-Explorer runtime material must be referenced by the global renderer')
const aiExplorerResponse = await fetch(origin + '/assets/' + aiExplorerFile); assert.equal(aiExplorerResponse.status,200)
const aiExplorerBytes = Buffer.from(await aiExplorerResponse.arrayBuffer())
const aiExplorerLocal = await readFile('src/components/avatar/assets/eden-ai-explorer-static.webp')
assert.equal(createHash('sha256').update(aiExplorerBytes).digest('hex'),createHash('sha256').update(aiExplorerLocal).digest('hex'))
const aboutChunk = main.match(/AboutPage-[A-Za-z0-9_-]+\.js/)?.[0]
assert(aboutChunk, 'About must be a lazy chunk')
const aboutResponse = await fetch(origin + '/assets/' + aboutChunk); assert.equal(aboutResponse.status, 200)
const aboutJs = await aboutResponse.text()
assert(aboutJs.includes('About Eden'))
assert(aboutJs.includes('eden-wardrobe')&&aboutJs.includes('我的 13 种小宇宙')&&aboutJs.includes('查看下一套服装'),'Deployed lazy About includes the wardrobe')
const art = await Promise.all(['hero', 'gestures', 'wave-v2'].map(async (name) => {
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
assert(workerJs.includes(treasurerFile),'Treasurer must be precached for offline Expenses')
assert(workerJs.includes(motionFile)&&workerJs.includes(motionChunk),'Motion art and lazy renderer must work offline')
assert(workerJs.includes(archivistFile),'Archivist must be precached for offline Records')
assert(workerJs.includes(reflectorFile),'Reflector must be precached for offline Review')
assert(workerJs.includes(watchingFile),'Watching must be precached for offline Anime')
assert(workerJs.includes(swimFile)&&workerJs.includes(boxingFile),'Both Exercise forms must be precached')
for(const file of [tarotFile,ichingFile,baziFile,astrologyFile,ziweiFile,aiExplorerFile])assert(workerJs.includes(file),'All six Cosmos forms must be precached')
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
  await send('Page.navigate', { url: origin + '/about#eden-wardrobe' })
  await waitFor(`document.body.innerText.includes('Open your workspace')`, 'About auth boundary')
  assert.equal(await evaluate('Boolean(document.querySelector(".about-page"))'), false)
  assert.equal(await evaluate('Boolean(document.querySelector(".genesis-boot-screen"))'), false)
  assert.equal(await evaluate('Boolean(document.querySelector(".eden-avatar"))'), false)
  let pwa
  for (let i = 0; i < 55; i++) {
    pwa = await evaluate(`(async()=>{const r=await navigator.serviceWorker.getRegistrations(), names=await caches.keys();const requests=(await Promise.all(names.map(async name=>(await (await caches.open(name)).keys()).map(r=>r.url)))).flat();return {active:r.some(r=>r.active?.state==='activated'),aboutChunk:requests.some(url=>url.includes('AboutPage-')&&url.includes('.js')),hero:requests.some(url=>url.includes('eden-about-hero-')),gestures:requests.some(url=>url.includes('eden-about-gestures-')),wave:requests.some(url=>url.includes('eden-about-wave-v2-')),entries:requests.length}})()`)
    if (pwa.active && pwa.aboutChunk && pwa.hero && pwa.gestures && pwa.wave) break
    await delay(1000)
  }
  assert(pwa.active && pwa.aboutChunk && pwa.hero && pwa.gestures && pwa.wave)
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
  const report = { sha: expectedSha, routes: routes.map(({ route, status }) => ({ route, status })), entryAssets: entryAssets.length, aboutChunk, art,treasurerMotion:{file:motionFile,bytes:motionBytes.length,hashMatched:true,precached:true,lazyChunk:motionChunk},treasurer:{file:treasurerFile,bytes:treasurerBytes.length,hashMatched:true,precached:true},archivist:{file:archivistFile,bytes:archivistBytes.length,hashMatched:true,precached:true},reflector:{file:reflectorFile,bytes:reflectorBytes.length,hashMatched:true,precached:true},watching:{file:watchingFile,bytes:watchingBytes.length,hashMatched:true,precached:true},swim:{file:swimFile,bytes:swimBytes.length,hashMatched:true,precached:true},boxing:{file:boxingFile,bytes:boxingBytes.length,hashMatched:true,precached:true},cosmos:[{file:tarotFile,bytes:tarotBytes.length,hashMatched:true,precached:true},{file:ichingFile,bytes:ichingBytes.length,hashMatched:true,precached:true},{file:baziFile,bytes:baziBytes.length,hashMatched:true,precached:true},{file:astrologyFile,bytes:astrologyBytes.length,hashMatched:true,precached:true},{file:ziweiFile,bytes:ziweiBytes.length,hashMatched:true,precached:true},{file:aiExplorerFile,bytes:aiExplorerBytes.length,hashMatched:true,precached:true}], manifestIcons: manifest.icons.length, functions, pwa, offlineAboutShellProtected: true, liveAuthenticationNotPerformed: true, errors: session.errors }
  await writeFile(path.join(output, 'staging-results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await session.close() }
