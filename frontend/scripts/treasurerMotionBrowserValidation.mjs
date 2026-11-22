// Real App / real wall-clock motion, isolated synthetic providers only.
// Run aboutBrowserValidation.mjs and avatarRouteBrowserValidation.mjs first.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createBrowserSession, delay } from './browserSession.mjs'
import { syntheticRepositorySource } from './avatarSyntheticRepositories.mjs'

const origin = 'http://127.0.0.1:5181'
// --records runs the same real lifecycle/failure audit for Archivist without
// forking a competing fixture or injecting faster application timings.
const archivist=process.argv.includes('--records'),reflector=process.argv.includes('--review')
const role=reflector?'reflector':archivist?'archivist':'treasurer',pagePath=reflector?'/review':archivist?'/records':'/expenses'
const id='eden-'+role,action=archivist||reflector?'pageTurn':'abacus',baseWidth=archivist?264:352
const atlasToken=reflector?'journal-motion-v1.webp':archivist?'clipboard-motion-v1.webp':'abacus-motion-v1.webp'
const output = path.resolve('artifacts/browser-validation/'+(reflector?'avatar-part4g-b2':archivist?'avatar-part4g-b':'avatar-part4g-a'))
await mkdir(output, { recursive: true })
const html = await (await fetch(origin + '/artifacts/browser-validation/avatar-part4d-cosmos/index.html')).text()
assert(html.includes('avatar-part4d-cosmos/harness.tsx'))
assert((await readFile('artifacts/browser-validation/avatar-part4d-cosmos/harness.tsx','utf8')).includes('<React.StrictMode>'))
const session = await createBrowserSession()
const { send, evaluate, waitFor, click } = session
const layer = `document.querySelector('.eden-avatar-motion-layer')`
const avatar = `document.querySelector('.eden-avatar')`
const current = `(()=>{const a=${avatar},m=${layer},i=document.querySelector('.eden-avatar-static-image'),r=a?.getBoundingClientRect();return {id:document.querySelector('.eden-avatar-appearance')?.dataset.avatarId,visible:a?.dataset.visible,state:a?.dataset.state,active:m?.dataset.motionActive,asset:m?.dataset.motionAsset,action:m?.dataset.motionAction,frame:m?.dataset.motionFrame,viewBox:document.querySelector('.eden-avatar-motion-art')?.getAttribute('viewBox'),baseVisibility:i&&getComputedStyle(i).visibility,baseSize:i&&[i.naturalWidth,i.naturalHeight],rect:r&&[r.x,r.y,r.width,r.height],pointer:a&&getComputedStyle(a).pointerEvents,inert:a?.inert,hidden:a?.getAttribute('aria-hidden')}})()`
let failAtlas = false
const imageRequests = [], results = []
async function fresh(route = pagePath) {
  await evaluate('window.motionDocumentMarker=true')
  await send('Page.navigate', { url: origin + route })
  await waitFor(`!window.motionDocumentMarker&&location.pathname===${JSON.stringify(new URL(origin+route).pathname)}&&document.querySelector('main')`, 'fresh document '+route)
  if (route === pagePath) await waitFor(`document.querySelector('.eden-avatar-static-image')?.naturalWidth===${baseWidth}&&${avatar}?.dataset.visible==='true'`, 'approved base ready')
}
async function active() { await waitFor(`${layer}?.dataset.motionActive==='true'`, 'real atlas active') }
async function waitAction(action, ms = 30000) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await evaluate(`window.motionTrace?.some(e=>e.action===${JSON.stringify(action)})`)) return
    await delay(50)
  }
  throw Error('Missing real wall-clock action '+action)
}
async function trace() {
  await evaluate(`(()=>{window.motionTrace=[];const m=${layer};const record=()=>{const next={action:m.dataset.motionAction,frame:Number(m.dataset.motionFrame),time:performance.now()};const last=window.motionTrace.at(-1);if(!last||last.action!==next.action||last.frame!==next.frame)window.motionTrace.push(next)};window.motionObserver?.disconnect();window.motionObserver=new MutationObserver(record);window.motionObserver.observe(m,{attributes:true});record()})()`)
}
try {
  session.onIntercept = async ({ requestId, request, resourceType }) => {
    if (resourceType === 'Image') {
      imageRequests.push(request.url)
      return send(failAtlas ? 'Fetch.failRequest' : 'Fetch.continueRequest', failAtlas ? {requestId,errorReason:'Failed'} : {requestId})
    }
    const document = resourceType === 'Document'
    const body = document ? html : syntheticRepositorySource(new URL(request.url).pathname)
    assert(body, 'Only explicit synthetic repositories may be intercepted')
    await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:document?'text/html':'application/javascript'}],body:Buffer.from(body).toString('base64')})
  }
  await send('Fetch.enable',{patterns:[{urlPattern:origin+'/*',resourceType:'Document'},...['firestoreAnimeRepository','firestoreWeeklyReviewRepository','animeDetailService','useGoalAllocations'].map(name=>({urlPattern:'*src/*/'+name+'.ts*'})),{urlPattern:'*'+atlasToken+'*',resourceType:'Image'}]})
  await send('Network.setCacheDisabled',{cacheDisabled:true})
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const decode=HTMLImageElement.prototype.decode;window.motionDecodes=[];HTMLImageElement.prototype.decode=function(){window.motionDecodes.push(this.src);return decode.call(this)}})()`})
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await send('Emulation.setFocusEmulationEnabled',{enabled:true})
  await fresh(); await active(); await trace()
  const initial = await evaluate(current)
  assert.equal(initial.id,id);assert.equal(initial.state,'idle')
  assert.deepEqual(initial.rect.slice(2),[88,164]);assert.equal(initial.pointer,'none')
  assert.equal(initial.inert,true);assert.equal(initial.hidden,'true')
  assert.equal(initial.baseVisibility,'hidden');assert.deepEqual(initial.baseSize,[baseWidth,archivist?492:656])
  if(reflector){assert(initial.rect[0]<390/2,'Review stays on left');assert.equal(await evaluate(`getComputedStyle(document.querySelector('.eden-avatar-facing')).transform`),'none')}
  await evaluate('window.aboutHarness.setLocked(true)')
  await delay(100)
  assert.equal((await evaluate(current)).active,'true')
  await waitAction('blink',8500)
  await waitFor(`${layer}.dataset.motionFrame==='3'`,'closed blink frame')
  await session.shot(path.join(output,role+'-390-blink-closed.png'))
  await waitFor(`${layer}.dataset.motionAction==='idle'`,'blink done')
  await waitAction(action,25000)
  if(reflector){await waitFor(`${layer}.dataset.motionFrame==='4'`,'actual journal writing pose');await session.shot(path.join(output,'reflector-390-journal-write.png'))}
  await waitFor(`${layer}.dataset.motionFrame==='5'`,'actual abacus touch frame')
  await session.shot(path.join(output,role+'-390-secondary-action.png'))
  await waitFor(`${layer}.dataset.motionAction==='idle'`,'abacus returns idle')
  const frames = await evaluate('window.motionTrace')
  const firstBlink = frames.findIndex(e=>e.action==='blink'), firstAbacus = frames.findIndex(e=>e.action===action)
  assert.deepEqual(frames.slice(firstBlink,firstBlink+5).map(e=>[e.action,e.frame]),[['blink',1],['blink',2],['blink',3],['blink',2],['blink',1]])
  assert.deepEqual(frames.slice(firstAbacus,firstAbacus+5).map(e=>[e.action,e.frame]),[[action,1],[action,4],[action,5],[action,6],[action,1]])
  const duration = index => Math.round(frames[index+5].time-frames[index].time)
  assert(duration(firstBlink)>=350&&duration(firstBlink)<700)
  assert(duration(firstAbacus)>=(reflector?1750:archivist?1650:1550)&&duration(firstAbacus)<2200)
  assert.equal(await evaluate(`window.motionDecodes.filter(u=>u.includes('motion-v1.webp')).length`),1)
  results.push({realWallClockSequences:frames,blinkMs:duration(firstBlink),secondaryAction:action,secondaryMs:duration(firstAbacus),singleAtlasDecode:true,lockedMotionContinues:true})

  // Scroll does not restart or move the idle character.
  await evaluate('window.scrollTo(0,document.body.scrollHeight)');await delay(150)
  const scrolled=await evaluate(current)
  assert.deepEqual(scrolled.rect,initial.rect);assert.equal(scrolled.active,'true')
  if(reflector){
    assert(await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Save reflection');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))})()`),'Save stays hit-testable without saving')
    await evaluate(`document.querySelector('textarea').focus()`)
    await delay(100)
    assert(await evaluate(`(()=>{const a=${avatar},r=a.getBoundingClientRect(),b=document.activeElement.getBoundingClientRect();return a.dataset.visible==='false'||!(r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top)})()`),'Focused Review input keeps collision priority')
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:235,deviceScaleFactor:1,mobile:true})
    await waitFor(`${avatar}.dataset.visible==='false'&&${layer}.dataset.motionActive==='false'`,'Review keyboard-sized viewport pauses')
    await evaluate(`document.activeElement.blur();window.scrollTo(0,0)`)
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await active()
    await click('[aria-label="Open apps"]');await waitFor(`document.querySelector('[aria-label="App drawer"]')`,'Review history drawer')
    await evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent.trim()==='Records').click()`)
    await waitFor(`location.pathname==='/records'&&!document.querySelector('[role="dialog"][data-state="open"]')&&document.body.style.pointerEvents!=='none'`,'leave Review for real history entry')
    await evaluate('history.back()');await waitFor(`location.pathname==='/review'&&document.querySelector('main h1')?.textContent==='Weekly Review'`,'alias history return')
    await active();await evaluate('window.reviewReloadMarker=true');await send('Page.reload');await waitFor(`!window.reviewReloadMarker&&location.pathname==='/review'&&document.querySelector('main h1')?.textContent==='Weekly Review'`,'review alias reload');await active()
    results.push({reviewLeftCorner:true,nativeRightNoMirror:true,saveHitTestNoWrite:true,focusedInputSafeAndKeyboardPauses:true,aliasHistoryAndReload:true})
  }
  await click('[aria-label="Open apps"]')
  await waitFor(`${avatar}.dataset.visible==='false'&&${layer}.dataset.motionActive==='false'`,'real drawer pauses motion')
  await delay(450)
  assert.equal((await evaluate(current)).frame,'1')
  await click('[aria-label="Close dialog"]')
  await waitFor(`!document.querySelector('[role="dialog"][data-state="open"]')&&document.body.style.pointerEvents!=='none'`,'drawer cleanup')
  await active()
  // Genuine Genesis replay still takes precedence. This is a disposable identity.
  await evaluate('window.aboutHarness.setLocked(false)');await delay(50)
  await evaluate('window.aboutBoot.replay()')
  await waitFor(`document.querySelector('.genesis-boot-screen')&&${avatar}.dataset.visible==='false'`,'Genesis hides and pauses')
  assert.equal((await evaluate(current)).active,'false')
  await click('.genesis-skip');await active()

  for(const event of ['pagehide','freeze']) {
    await evaluate(event==='pagehide'?`dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}))`:`document.dispatchEvent(new Event('freeze'))`)
    await waitFor(`${layer}.dataset.motionActive==='false'`,'pause '+event)
    assert.equal((await evaluate(current)).baseVisibility,'visible')
    await delay(500)
    await evaluate(event==='pagehide'?`dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))`:`document.dispatchEvent(new Event('resume'))`)
    await active();await delay(300)
    assert.equal((await evaluate(current)).action,'idle')
  }
  await send('Page.setWebLifecycleState',{state:'frozen'});await delay(200)
  await send('Page.setWebLifecycleState',{state:'active'});await active()
  assert.equal((await evaluate(current)).frame,'1')
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:235,deviceScaleFactor:1,mobile:true})
  await waitFor(`${avatar}.dataset.visible==='false'&&${layer}.dataset.motionActive==='false'`,'keyboard-sized viewport safety pause')
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true})
  await delay(150)
  const landscape=await evaluate(current)
  assert.equal(landscape.state,'idle')
  if(landscape.visible==='false')assert.equal(landscape.active,'false')
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await active()
  results.push({scrollAnchorUnchanged:true,drawerAndGenesisPause:true,syntheticPagehideFreezeResumeNoCatchup:true,cdpFreezeResume:true,keyboardSizedViewportPauses:true,landscape})

  // Failed atlas never replaces the approved Treasurer fallback with Today.
  failAtlas=true;await fresh()
  await waitFor(`${layer}?.dataset.motionAsset==='error'`,'atlas deliberately fails')
  let failed=await evaluate(current)
  assert.equal(failed.id,id);assert.equal(failed.active,'false');assert.equal(failed.baseVisibility,'visible')
  if(reflector)assert.equal(await evaluate(`getComputedStyle(document.querySelector('.eden-avatar-facing')).transform`),'none','Failed atlas retains native right-facing Reflector')
  const failedRequests=imageRequests.length
  await delay(1200);assert.equal(imageRequests.length,failedRequests,'No polling retry loop')
  failAtlas=false;await evaluate(`dispatchEvent(new Event('online'))`);await active()
  assert.equal((await evaluate(current)).id,id)
  // SVG delivery errors use the same static fallback and bounded recovery path.
  await evaluate(`document.querySelector('.eden-avatar-motion-art image').dispatchEvent(new Event('error'))`)
  await waitFor(`${layer}.dataset.motionAsset==='error'`,'display error fallback')
  assert.equal((await evaluate(current)).baseVisibility,'visible')
  if(reflector)assert.equal(await evaluate(`getComputedStyle(document.querySelector('.eden-avatar-facing')).transform`),'none')
  await evaluate(`dispatchEvent(new Event('online'))`);await active()
  results.push({atlasFailureKeepsApprovedStaticRole:id,noPollingRetries:true,onlineRecovery:true,displayFailureRecovery:true})

  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  const beforeReduced=imageRequests.length
  await fresh();await delay(500)
  assert.equal(imageRequests.length,beforeReduced,'Cold Reduced Motion must not request the atlas')
  assert.equal(await evaluate(`Boolean(document.querySelector('.eden-avatar-motion-art'))`),false)
  assert.equal((await evaluate(current)).baseVisibility,'visible')
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await active()
  // Pending old controller cannot act on a new route or the static wardrobe.
  const beforeAbout=imageRequests.length
  await fresh('/about#eden-wardrobe')
  await waitFor(`document.querySelector('.about-wardrobe-preview')?.dataset.previewAvatar==='eden-default'`,'independent wardrobe')
  await click('[data-wardrobe-choice="'+id+'"]')
  await waitFor(`document.querySelector('.about-wardrobe-preview')?.dataset.previewAvatar===${JSON.stringify(id)}&&document.querySelector('.about-wardrobe-preview')?.dataset.assetState==='ready'`,'static wardrobe role')
  assert.equal(await evaluate(`Boolean(document.querySelector('.eden-avatar-motion-layer')||document.querySelector('.eden-avatar'))`),false)
  assert.equal(imageRequests.length,beforeAbout)
  await fresh();await active();await delay(400)
  assert.equal((await evaluate(current)).frame,'1')
  results.push({coldReducedMotionNoAtlasRequest:true,wardrobeStaticAndNoGlobalAvatar:true,reentryStartsIdle:true,strictModeFixture:html.includes('harness.tsx')})
  assert.deepEqual(session.errors,[])
  const report={role:id,syntheticIdentity:true,noDataWrites:true,noPaidCalls:true,realIphoneTest:false,results,atlasRequests:imageRequests.length,errors:session.errors}
  await writeFile(path.join(output,'motion-results.json'),JSON.stringify(report,null,2))
  console.log(JSON.stringify(report,null,2))
} finally {await session.close()}
