// Local production-mode PWA with an in-memory signed-in context. Never deployed.
// Run avatarRouteBrowserValidation.mjs first to create the guarded synthetic harness.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { build, loadConfigFromFile, mergeConfig, preview } from 'vite'
import { createBrowserSession, delay } from './browserSession.mjs'
import { syntheticRepositorySource } from './avatarSyntheticRepositories.mjs'

const frontend = process.cwd()
const output = path.resolve('artifacts/browser-validation/avatar-part4g-a-pwa')
const root = path.join(output, 'pwa-source')
const outDir = path.join(output, 'pwa-dist-' + Date.now())
assert(outDir.startsWith(path.join(frontend, 'artifacts/browser-validation') + path.sep))
await mkdir(root, { recursive: true })
let harness = await readFile('artifacts/browser-validation/avatar-part4d-cosmos/harness.tsx', 'utf8')
const oldImport = "import {PwaContext} from '/src/pwa/pwaContextDefinition'"
const oldProvider = '<PwaContext.Provider value={{updateAvailable:false,applyUpdate:forbidden,dismissUpdate:forbidden}}>'
assert(harness.includes(oldImport) && harness.includes(oldProvider) && harness.includes('isAnonymous:false'))
harness = harness.replace(oldImport, "import {PwaProvider} from '/src/pwa/PwaProvider'")
  .replace(oldProvider, '<PwaProvider>').replace('</PwaContext.Provider>', '</PwaProvider>')
await writeFile(path.join(root, 'harness.tsx'), 'window.__pwaQaRevision=1;\n' + harness)
await writeFile(path.join(root, 'index.html'), '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><div id="root"></div><script type="module" src="/harness.tsx"></script></body></html>')
async function buildFixture(emptyOutDir = false) {
// The only recursive clean is Vite's generated QA output, verified below.
assert(outDir.startsWith(path.join(frontend, 'artifacts/browser-validation') + path.sep))
const resolved = await loadConfigFromFile({ command: 'build', mode: 'production' }, path.join(frontend, 'vite.config.ts'))
assert(resolved)
await build(mergeConfig(resolved.config, {
  configFile: false, root, publicDir: path.join(frontend, 'public'),
  plugins: [{ name: 'synthetic-readonly-repositories', enforce: 'pre', load(id) { return syntheticRepositorySource(id) ?? null } }],
  resolve: { alias: { '/src': path.join(frontend, 'src') } },
  build: { outDir, emptyOutDir },
}))
}
await buildFixture()
const server = await preview({ configFile: false, root, build: { outDir }, preview: { host: '127.0.0.1', port: 5182, strictPort: true } })
const session = await createBrowserSession()
const { send, evaluate, waitFor } = session
const ready = `document.querySelector('h1')?.textContent==='About Eden'&&document.body.innerText.includes('个人介绍 · 待 Eden 补充')`
try {
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const decode=HTMLImageElement.prototype.decode;window.pwaAvatarDecodes=[];HTMLImageElement.prototype.decode=function(){window.pwaAvatarDecodes.push(this.src);return decode.call(this)}})()`})
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await send('Page.navigate', { url: 'http://127.0.0.1:5182/about' })
  await waitFor(ready, 'synthetic signed-in production About')
  let cached
  for (let i = 0; i < 60; i++) {
    cached = await evaluate(`(async()=>{const regs=await navigator.serviceWorker.getRegistrations();const names=await caches.keys();const urls=(await Promise.all(names.map(async name=>(await (await caches.open(name)).keys()).map(r=>r.url)))).flat();return {active:regs.some(r=>r.active?.state==='activated'),wave:urls.some(url=>url.includes('eden-about-wave-v2-')),treasurer:urls.some(url=>url.includes('eden-treasurer-abacus-static-')),treasurerMotion:urls.some(url=>url.includes('eden-treasurer-abacus-motion-v1-')),motionChunk:urls.some(url=>url.includes('AvatarMotionLayer-')),archivist:urls.some(url=>url.includes('eden-archivist-clipboard-static-')),reflector:urls.some(url=>url.includes('eden-reflector-journal-static-')),watching:urls.some(url=>url.includes('eden-watching-prone-static-')),swim:urls.some(url=>url.includes('eden-swim-static-')),boxing:urls.some(url=>url.includes('eden-boxing-static-')),cosmos:['tarot','iching','bazi','astrology','ziwei','ai-explorer'].every(id=>urls.some(url=>url.includes('eden-'+id+'-static-'))),entries:urls.length}})()`)
    if (cached.active && cached.wave && cached.treasurer && cached.treasurerMotion && cached.motionChunk && cached.archivist && cached.reflector && cached.watching && cached.swim && cached.boxing && cached.cosmos) break
    await delay(1000)
  }
  assert(cached.active && cached.wave && cached.treasurer && cached.treasurerMotion && cached.motionChunk && cached.archivist && cached.reflector && cached.watching && cached.swim && cached.boxing && cached.cosmos)
  assert.equal(await evaluate(`window.pwaAvatarDecodes.filter(url=>url.includes('abacus-motion-v1-')).length`),0,'Precache must not decode Expenses animation on About')
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
  const wardrobeIds=['eden-default','eden-treasurer','eden-archivist','eden-reflector','eden-watching','eden-swim','eden-boxing','eden-tarot','eden-iching','eden-bazi','eden-astrology','eden-ziwei','eden-ai-explorer']
  const wardrobeOffline=[]
  for(const id of wardrobeIds) {
    await session.click('[data-wardrobe-choice="'+id+'"]')
    await waitFor(`document.querySelector('.about-wardrobe-preview')?.dataset.previewAvatar===${JSON.stringify(id)}&&document.querySelector('.about-wardrobe-preview')?.dataset.assetState==='ready'`,'offline wardrobe '+id)
    wardrobeOffline.push(id)
  }
  assert.equal(await evaluate(`Boolean(document.querySelector('.eden-avatar-motion-layer'))`),false,'Wardrobe remains static even with cached motion')
  assert.equal(await evaluate(`document.querySelector('.about-avatar-stage').dataset.action`),'idle','Wardrobe does not trigger the gesture laboratory')
  const offlineExerciseForms=[]
  for(const form of ['eden-swim','eden-boxing','eden-swim','eden-boxing']) {
    if(!offlineExerciseForms.length) await send('Page.navigate',{url:'http://127.0.0.1:5182/exercise'})
    else {await evaluate('window.exerciseReloadMarker=true');await send('Page.reload');await waitFor('!window.exerciseReloadMarker','new offline Exercise document')}
    await waitFor(`document.querySelector('main h1')?.textContent==='Exercise'&&document.querySelector('.eden-avatar-appearance')?.dataset.avatarId===${JSON.stringify(form)}&&document.querySelector('.eden-avatar-static-image')?.naturalWidth===352`,'offline deterministic Exercise '+form)
    offlineExerciseForms.push(form)
  }
  await send('Page.navigate',{url:'http://127.0.0.1:5182/about'});await waitFor(ready,'leave offline Exercise')
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
      await waitFor(`document.querySelector('.eden-avatar-motion-layer')?.dataset.motionActive==='true'`,'offline Treasurer motion decoded from precache')
      assert.equal(await evaluate(`document.querySelector('.eden-avatar-appearance').dataset.avatarMode`),'motion-prototype')
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
    if(route==='/cosmos') {
      await waitFor(`document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-tarot'`,'cached initial Tarot decoded')
      const initialDecoded=await evaluate(`window.pwaAvatarDecodes.filter(url=>/eden-(tarot|iching|bazi|astrology|ziwei|ai-explorer)-static/.test(url))`)
      assert.equal(initialDecoded.length,1,'Precache must not decode all six Cosmos forms')
      assert(initialDecoded[0].includes('eden-tarot-static'))
      for(const [system,id] of [['tarot','eden-tarot'],['ai','eden-ai-explorer'],['iching','eden-iching'],['ziwei','eden-ziwei'],['bazi','eden-bazi'],['astrology','eden-astrology']]) {
        await session.click('#cosmos-'+system+'-tab')
        await waitFor(`document.querySelector('#cosmos-${system}-tab').getAttribute('aria-selected')==='true'&&document.querySelector('.eden-avatar-appearance')?.dataset.avatarId===${JSON.stringify(id)}&&document.querySelector('.eden-avatar-static-image')?.naturalWidth===352`,'offline Cosmos '+system)
      }
    }
    await session.click('[aria-label="Open apps"]')
    await waitFor(`document.querySelector('[aria-label="App drawer"]')`,'offline current page')
    assert.equal(await evaluate(`document.querySelector('[aria-label="App drawer"] [aria-current="page"]')?.textContent.trim()`),label)
    await session.click('[aria-label="Close dialog"]')
    await waitFor(`!document.querySelector('[role="dialog"][data-state="open"]')`,'offline drawer close')
  }
  // Exercise the preserved original Capture in the production PWA too, rather
  // than relying solely on Vite development-mode routing/refresh behavior.
  const productionCapture=[]
  for(let index=0;index<8;index++) {
    await session.click('[aria-label="Open apps"]')
    await waitFor(`document.querySelector('[aria-label="App drawer"]')`,'PWA drawer before Today')
    await evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent.trim()==='Today').click()`)
    await waitFor(`document.querySelector('.today-dashboard')&&!document.querySelector('[role="dialog"][data-state="open"]')&&document.body.style.pointerEvents!=='none'`,'PWA Today')
    const trigger=index%2?'[aria-label="Capture something"]':'.dashboard-quick-capture'
    await session.click(trigger)
    await waitFor(`document.querySelector('.eden-avatar')?.dataset.state==='perched'`,'production PWA Capture '+index)
    await session.click('[role="dialog"][data-state="open"] [aria-label="Close dialog"]')
    await waitFor(`!document.querySelector('[data-eden-capture]')&&document.body.style.pointerEvents!=='none'`,'PWA Capture closed')
    await session.click('[aria-label="Open apps"]')
    await waitFor(`document.querySelector('[aria-label="App drawer"]')`,'PWA drawer leave Today')
    await evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent.trim()==='Anime').click()`)
    await waitFor(`document.querySelector('main h1')?.textContent==='Anime'&&!document.querySelector('[role="dialog"][data-state="open"]')&&document.body.style.pointerEvents!=='none'`,'PWA Anime')
    productionCapture.push({trigger,perched:true,routeDuringReturn:true})
  }
  // Real generated Workbox update, same origin and actual update prompt. No SW
  // unregister/cache deletion shortcut; only this disposable QA build changes.
  await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1})
  await send('Page.navigate',{url:'http://127.0.0.1:5182/cosmos'})
  await waitFor(`document.querySelector('#cosmos-ai-tab')&&document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-tarot'`,'online Cosmos before update')
  await session.click('#cosmos-ai-tab')
  await waitFor(`document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-ai-explorer'`,'AI before update')
  const cachedUrls=()=>evaluate(`(async()=>{const names=await caches.keys();return (await Promise.all(names.filter(n=>n.includes('precache')).map(async n=>(await (await caches.open(n)).keys()).map(r=>r.url)))).flat()})()`)
  const oldUrls=await cachedUrls()
  const previousDocument=await evaluate(`window.updateDocumentMarker='original';window.__pwaQaRevision`)
  assert.equal(previousDocument,1)
  await writeFile(path.join(root,'harness.tsx'),'window.__pwaQaRevision=2;\n'+harness)
  await buildFixture(true)
  await evaluate(`(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update()})()`)
  await waitFor(`document.body.innerText.includes('An EdenOS update is ready')`,'real waiting-worker prompt')
  assert.equal(await evaluate('window.updateDocumentMarker'),'original','Update must not reload automatically')
  assert.equal(await evaluate(`document.querySelector('.eden-avatar-appearance').dataset.avatarId`),'eden-ai-explorer')
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Update now').click()`)
  await waitFor(`window.__pwaQaRevision===2&&!window.updateDocumentMarker`,'explicit update activates and reloads new build')
  await waitFor(`document.querySelector('#cosmos-tarot-tab')?.getAttribute('aria-selected')==='true'&&document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-tarot'`,'new document and UI both reset Tarot')
  let newUrls=[],removedUrls=[]
  for(let i=0;i<60;i++) {
    newUrls=await cachedUrls();removedUrls=oldUrls.filter(url=>!newUrls.includes(url))
    if(removedUrls.some(url=>/\/assets\/.*\.js/.test(url)))break
    await delay(100)
  }
  assert(removedUrls.some(url=>/\/assets\/.*\.js/.test(url)),'Obsolete revisioned JavaScript must be removed on activation')
  assert.equal(newUrls.length,oldUrls.length,'Update must not accumulate obsolete precache entries')
  assert(['tarot','iching','bazi','astrology','ziwei','ai-explorer'].every(id=>newUrls.some(url=>url.includes('eden-'+id+'-static-'))))
  assert(newUrls.some(url=>url.includes('eden-treasurer-abacus-motion-v1-'))&&newUrls.some(url=>url.includes('AvatarMotionLayer-')))
  await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0})
  await send('Page.reload')
  await waitFor(`window.__pwaQaRevision===2&&document.querySelector('#cosmos-ai-tab')&&document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-tarot'`,'updated build survives offline cold reload')
  for(const [system,id]of [['ai','eden-ai-explorer'],['iching','eden-iching'],['ziwei','eden-ziwei'],['bazi','eden-bazi'],['astrology','eden-astrology']]) {
    await session.click('#cosmos-'+system+'-tab')
    await waitFor(`document.querySelector('.eden-avatar-appearance')?.dataset.avatarId===${JSON.stringify(id)}`,'post-update offline '+system)
  }
  await send('Page.navigate',{url:'http://127.0.0.1:5182/about#eden-wardrobe'})
  await waitFor(`window.__pwaQaRevision===2&&document.querySelector('.about-wardrobe-preview')?.dataset.previewAvatar==='eden-default'`,'updated offline wardrobe deep link')
  for(const id of wardrobeIds) {
    await session.click('[data-wardrobe-choice="'+id+'"]')
    await waitFor(`document.querySelector('.about-wardrobe-preview')?.dataset.previewAvatar===${JSON.stringify(id)}&&document.querySelector('.about-wardrobe-preview')?.dataset.assetState==='ready'`,'post-update offline wardrobe '+id)
  }
  await send('Page.navigate',{url:'http://127.0.0.1:5182/expenses'})
  await waitFor(`window.__pwaQaRevision===2&&document.querySelector('.eden-avatar-motion-layer')?.dataset.motionActive==='true'`,'updated offline atlas and lazy motion controller')
  await waitFor(`document.querySelector('.eden-avatar-motion-layer')?.dataset.motionAction==='blink'`,'real offline blink after explicit update')
  assert.deepEqual(session.errors, [])
  const report = { wardrobeOffline,all13WardrobeOfflineAfterUpdate:true,existingCacheConfigurationReused:true,treasurerMotionOfflineAndAfterUpdate:true,atlasNotDecodedOnAbout:true,wardrobeStillStatic:true,offlineExerciseForms, productionCapture, syntheticSignedInContext: true, realAuthNotInvoked: true, productionPwaBuild: true, treasurerPrecachedAndOfflineDecoded:true,archivistPrecachedOfflineDecoded:true,reflectorPrecachedOfflineDecodedAndNotMirrored:true,watchingPrecachedOfflineDecodedStaticProne:true,allSixCosmosOfflineDecoded:true,precacheDoesNotDecodeUnselectedCosmos:true,update:{realWaitingWorkerPrompt:true,noAutomaticReload:true,explicitApplyNewBuild:true,oldEntries:oldUrls.length,newEntries:newUrls.length,obsoleteRemoved:removedUrls,offlineSixFormsAfterUpdate:true},offlineReloadChineseAbout: true, offlineLockedWaveRaiseWaveLower: true, offlineRecordsAndExerciseAvatarsAndCapture: true, offlineColdDeepLinksReloadAndHighlights: routes.map(([route])=>route), cache: cached, errors: session.errors }
  await writeFile(path.join(output, 'pwa-results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  await session.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
