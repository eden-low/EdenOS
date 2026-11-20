// Local production-mode PWA with an in-memory signed-in context. Never deployed.
// Run avatarRouteBrowserValidation.mjs first to create the guarded synthetic harness.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { build, loadConfigFromFile, mergeConfig, preview } from 'vite'
import { createBrowserSession, delay } from './browserSession.mjs'
import { syntheticRepositorySource } from './avatarSyntheticRepositories.mjs'

const frontend = process.cwd()
const output = path.resolve('artifacts/browser-validation/avatar-part4b-watching-pwa')
const root = path.join(output, 'pwa-source')
const outDir = path.join(output, 'pwa-dist-' + Date.now())
assert(outDir.startsWith(path.join(frontend, 'artifacts/browser-validation') + path.sep))
await mkdir(root, { recursive: true })
let harness = await readFile('artifacts/browser-validation/avatar-part4b-watching/harness.tsx', 'utf8')
const oldImport = "import {PwaContext} from '/src/pwa/pwaContextDefinition'"
const oldProvider = '<PwaContext.Provider value={{updateAvailable:false,applyUpdate:forbidden,dismissUpdate:forbidden}}>'
assert(harness.includes(oldImport) && harness.includes(oldProvider) && harness.includes('isAnonymous:false'))
harness = harness.replace(oldImport, "import {PwaProvider} from '/src/pwa/PwaProvider'")
  .replace(oldProvider, '<PwaProvider>').replace('</PwaContext.Provider>', '</PwaProvider>')
await writeFile(path.join(root, 'harness.tsx'), harness)
await writeFile(path.join(root, 'index.html'), '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><div id="root"></div><script type="module" src="/harness.tsx"></script></body></html>')
const resolved = await loadConfigFromFile({ command: 'build', mode: 'production' }, path.join(frontend, 'vite.config.ts'))
assert(resolved)
await build(mergeConfig(resolved.config, {
  configFile: false, root, publicDir: path.join(frontend, 'public'),
  plugins: [{ name: 'synthetic-readonly-repositories', enforce: 'pre', load(id) { return syntheticRepositorySource(id) ?? null } }],
  resolve: { alias: { '/src': path.join(frontend, 'src') } },
  build: { outDir, emptyOutDir: false },
}))
const server = await preview({ configFile: false, root, build: { outDir }, preview: { host: '127.0.0.1', port: 5182, strictPort: true } })
const session = await createBrowserSession()
const { send, evaluate, waitFor } = session
const ready = `document.querySelector('h1')?.textContent==='About Eden'&&document.body.innerText.includes('个人介绍 · 待 Eden 补充')`
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await send('Page.navigate', { url: 'http://127.0.0.1:5182/about' })
  await waitFor(ready, 'synthetic signed-in production About')
  let cached
  for (let i = 0; i < 60; i++) {
    cached = await evaluate(`(async()=>{const regs=await navigator.serviceWorker.getRegistrations();const names=await caches.keys();const urls=(await Promise.all(names.map(async name=>(await (await caches.open(name)).keys()).map(r=>r.url)))).flat();return {active:regs.some(r=>r.active?.state==='activated'),wave:urls.some(url=>url.includes('eden-about-wave-v2-')),treasurer:urls.some(url=>url.includes('eden-treasurer-abacus-static-')),archivist:urls.some(url=>url.includes('eden-archivist-clipboard-static-')),reflector:urls.some(url=>url.includes('eden-reflector-journal-static-')),watching:urls.some(url=>url.includes('eden-watching-prone-static-')),entries:urls.length}})()`)
    if (cached.active && cached.wave && cached.treasurer && cached.archivist && cached.reflector && cached.watching) break
    await delay(1000)
  }
  assert(cached.active && cached.wave && cached.treasurer && cached.archivist && cached.reflector && cached.watching)
  await evaluate('window.pwaReloadMarker=true'); await send('Page.reload')
  await waitFor('!window.pwaReloadMarker', 'new controlled document')
  await waitFor(ready, 'synthetic session persists through reload')
  assert(await evaluate('Boolean(navigator.serviceWorker.controller)'))
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  await evaluate('window.pwaReloadMarker=true'); await send('Page.reload')
  await waitFor('!window.pwaReloadMarker', 'new offline document')
  await waitFor(ready, 'offline signed-in About shell')
  await evaluate('window.aboutHarness.setLocked(true)')
  await evaluate(`document.querySelector('#interactive-eden').scrollIntoView();Array.from(document.querySelectorAll('.about-gesture-button')).find(b=>b.textContent==='挥手').click()`)
  await waitFor(`document.querySelector('.about-avatar-stage').dataset.phase==='wave'`, 'offline compact waving frame from cache')
  await session.shot(path.join(output, 'offline-signed-in-wave.png'))
  await waitFor(`document.querySelector('.about-avatar-stage').dataset.action==='idle'`, 'offline wave returns idle')
  assert.equal(await evaluate('Boolean(document.querySelector(".eden-avatar"))'), false)
  for (const [label, heading, capture] of [['Records','Records','Capture'],['Exercise','Exercise','Capture workout']]) {
    await session.click('[aria-label="Open apps"]')
    await waitFor(`document.querySelector('[aria-label="App drawer"]')`, 'offline Apps drawer')
    await evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`)
    await waitFor(`document.querySelector('main h1')?.textContent===${JSON.stringify(heading)}&&!document.querySelector('[role="dialog"][data-state="open"]')`, 'offline '+label)
    assert.equal(await evaluate(`Boolean(document.querySelector('[data-global-capture]'))`),false)
    await waitFor(`document.querySelector('.eden-avatar')?.dataset.state==='idle'`, 'offline standing avatar')
    await evaluate(`Array.from(document.querySelectorAll('main button')).find(b=>b.textContent.trim()===${JSON.stringify(capture)}).click()`)
    await waitFor(`document.querySelector('[data-eden-capture]')&&document.querySelector('.eden-avatar').dataset.visible==='false'`, 'offline non-Today Capture hides avatar')
    assert.equal(await evaluate(`document.querySelector('.eden-avatar').dataset.state`),'idle')
    await session.click('[aria-label="Close dialog"]')
    await waitFor(`!document.querySelector('[data-eden-capture]')&&document.body.style.pointerEvents!=='none'`, 'offline Capture cleanup')
  }
  const routes = [
    ['/expenses','Finance','Expenses'],['/exercise','Exercise','Exercise'],['/records','Records','Records'],
    ['/weekly-review','Weekly Review','Review'],['/anime','Anime','Anime'],['/cosmos','Cosmos','Cosmos'],['/about','About Eden','About Eden'],
  ]
  for (const [route,heading,label] of routes) {
    // A new offline document exercises cold deep-link entry, then an actual reload.
    await send('Page.navigate',{url:'http://127.0.0.1:5182'+route});await delay(100)
    const routeReady=`location.pathname===${JSON.stringify(route)}&&document.querySelector('main h1')?.textContent.includes(${JSON.stringify(heading)})`
    await waitFor(routeReady,'offline cold deep link '+route)
    await evaluate('window.routeReloadMarker=true');await send('Page.reload');await delay(100)
    await waitFor(`!window.routeReloadMarker&&${routeReady}`,'offline reload '+route)
    if(route==='/expenses') {
      await waitFor(`document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-treasurer'&&document.querySelector('.eden-avatar-static-image')?.naturalWidth===352`,'offline Treasurer decoded from precache')
      assert.equal(await evaluate(`document.querySelector('.eden-avatar-appearance').dataset.avatarMode`),'static-prototype')
    }
    if(route==='/records') {
      await waitFor(`document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-archivist'&&document.querySelector('.eden-avatar-static-image')?.naturalWidth===264`,'offline Archivist decoded from precache')
      assert.equal(await evaluate(`document.querySelector('.eden-avatar-appearance').dataset.avatarMode`),'static-prototype')
    }
    if(route==='/weekly-review') {
      await waitFor(`document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-reflector'&&document.querySelector('.eden-avatar-static-image')?.naturalWidth===352`,'offline Reflector decoded from precache')
      assert.equal(await evaluate(`document.querySelector('.eden-avatar-facing').hasAttribute('data-mirrored')`),false)
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.eden-avatar-facing')).transform`),'none')
    }
    if(route==='/anime') {
      await waitFor(`document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-watching'&&document.querySelector('.eden-avatar-static-image')?.naturalWidth===352`,'offline Watching decoded from precache')
      assert.equal(await evaluate(`document.querySelector('.eden-avatar-appearance').dataset.avatarPosture`),'prone')
      assert.equal(await evaluate(`document.querySelector('.eden-avatar').dataset.state`),'idle')
      assert.equal(await evaluate(`document.querySelector('.eden-avatar').hasAttribute('data-sheet')`),false)
    }
    await session.click('[aria-label="Open apps"]')
    await waitFor(`document.querySelector('[aria-label="App drawer"]')`,'offline current page')
    assert.equal(await evaluate(`document.querySelector('[aria-label="App drawer"] [aria-current="page"]')?.textContent.trim()`),label)
    await session.click('[aria-label="Close dialog"]')
    await waitFor(`!document.querySelector('[role="dialog"][data-state="open"]')`,'offline drawer close')
  }
  assert.deepEqual(session.errors, [])
  const report = { syntheticSignedInContext: true, realAuthNotInvoked: true, productionPwaBuild: true, treasurerPrecachedAndOfflineDecoded:true,archivistPrecachedAndOfflineDecoded:true,reflectorPrecachedOfflineDecodedAndNotMirrored:true,watchingPrecachedOfflineDecodedStaticProne:true,offlineReloadChineseAbout: true, offlineLockedWaveRaiseWaveLower: true, offlineRecordsAndExerciseAvatarsAndCapture: true, offlineColdDeepLinksReloadAndHighlights: routes.map(([route])=>route), cache: cached, errors: session.errors }
  await writeFile(path.join(output, 'pwa-results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await session.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
