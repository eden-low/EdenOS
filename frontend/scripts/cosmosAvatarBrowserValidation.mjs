// Actual Cosmos and all local engines, synthetic identity/repositories only.
// Run avatarRouteBrowserValidation.mjs first; reuse its immutable fixture to avoid HMR.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createBrowserSession, delay } from './browserSession.mjs'
import { syntheticRepositorySource } from './avatarSyntheticRepositories.mjs'

const origin = 'http://127.0.0.1:5181'
const output = path.resolve('artifacts/browser-validation/avatar-part4d-systems')
await mkdir(output, { recursive: true })
const html = await (await fetch(origin + '/artifacts/browser-validation/avatar-part4d-cosmos/index.html')).text()
assert(html.includes('avatar-part4d-cosmos/harness.tsx'))
const session = await createBrowserSession()
const { send, evaluate, waitFor, click } = session
const systems = [['tarot','eden-tarot'],['iching','eden-iching'],['bazi','eden-bazi'],['astrology','eden-astrology'],['ziwei','eden-ziwei'],['ai','eden-ai-explorer']]
const avatar = `document.querySelector('.eden-avatar')`
const appearance = `${avatar}?.querySelector('.eden-avatar-appearance')`
const exerciseKey = 'edenos:exercise-avatar:v1'
const imageRequests = [], paused = [], layout = []
let failId = null, hold = false
const audit = `(()=>{const a=${avatar},p=${appearance},r=a.getBoundingClientRect(),i=a.querySelector('img');return {id:p?.dataset.avatarId,requested:p?.dataset.avatarRequested,asset:p?.dataset.assetState,visible:a.dataset.visible,state:a.dataset.state,sheet:a.hasAttribute('data-sheet'),frame:[r.width,r.height],left:r.left,top:r.top,inert:a.inert,ariaHidden:a.getAttribute('aria-hidden'),pointer:getComputedStyle(a).pointerEvents,overflow:document.documentElement.scrollWidth>innerWidth,natural:i?[i.naturalWidth,i.naturalHeight]:null}})()`
async function selected(system, asset = 'ready') {
  const id = systems.find(([s]) => s === system)[1]
  await waitFor(`document.querySelector('#cosmos-${system}-tab')?.getAttribute('aria-selected')==='true'&&${appearance}?.dataset.avatarRequested===${JSON.stringify(id)}&&${appearance}?.dataset.assetState===${JSON.stringify(asset)}`, 'Cosmos ' + system + ' ' + asset)
  assert.equal((await evaluate(audit)).id, asset === 'ready' ? id : 'eden-default')
}
async function choose(system, asset = 'ready') { await click('#cosmos-' + system + '-tab'); await selected(system, asset) }
async function textButton(text) { await evaluate(`(()=>{const b=[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Missing '+${JSON.stringify(text)});b.click()})()`) }
async function input(selector, value) { await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`) }
async function zone(root) {
  await input(root + ' .astrology-timezone-picker input', 'Asia/Kuala_Lumpur')
  await waitFor(`Array.from(document.querySelectorAll(${JSON.stringify(root + ' [role="option"]')})).some(b=>b.textContent.includes('Asia/Kuala_Lumpur'))`, 'local timezone option')
  await evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(root + ' [role="option"]')})).find(b=>b.textContent.includes('Asia/Kuala_Lumpur')).click()`)
}
async function navigate(label, pathname) {
  await click('[aria-label="Open apps"]'); await waitFor(`document.querySelector('[aria-label="App drawer"]')`, 'Apps')
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`)
  await waitFor(`location.pathname===${JSON.stringify(pathname)}&&!document.querySelector('[role="dialog"][data-state="open"]')&&document.body.style.pointerEvents!=='none'`, 'route ' + label)
  await delay(120)
}
async function release(request) { try { await send('Fetch.continueRequest',{requestId:request.requestId}) } catch(error) { assert.match(error.message,/invalid|request|interception|cancel/i) } }
try {
  session.onIntercept = async ({requestId,request,resourceType}) => {
    const url = new URL(request.url)
    if(resourceType === 'Image') {
      imageRequests.push(request.url)
      if(failId && url.pathname.includes(failId)) return send('Fetch.failRequest',{requestId,errorReason:'Failed'})
      if(hold) { paused.push({requestId,url:request.url}); return }
      return send('Fetch.continueRequest',{requestId})
    }
    const document = resourceType === 'Document', body = document ? html : syntheticRepositorySource(url.pathname)
    assert(body,'Only explicit synthetic modules may be intercepted')
    await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:document?'text/html':'application/javascript'}],body:Buffer.from(body).toString('base64')})
  }
  await send('Fetch.enable',{patterns:[{urlPattern:origin+'/*',resourceType:'Document'},...['firestoreAnimeRepository','firestoreWeeklyReviewRepository','animeDetailService','useGoalAllocations'].map(name=>({urlPattern:'*src/*/'+name+'.ts*'})),...systems.map(([,id])=>({urlPattern:'*'+id+'-static.webp*',resourceType:'Image'}))]})
  await send('Emulation.setFocusEmulationEnabled',{enabled:true})
  await send('Browser.setPermission',{permission:{name:'fullscreen',allowWithoutGesture:true},setting:'granted',origin})
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await send('Page.navigate',{url:origin+'/cosmos'}); await delay(150)
  await selected('tarot')
  assert(imageRequests.length > 0 && imageRequests.every(url=>url.includes('eden-tarot-static')),'initial load must not decode all six forms')
  assert.equal(await evaluate(`sessionStorage.getItem(${JSON.stringify(exerciseKey)})`),null)
  for(const system of ['ai','iching','ziwei','bazi','astrology','tarot']) {
    await choose(system)
    const state = await evaluate(audit)
    assert.deepEqual(state.frame,[88,164]); assert.deepEqual(state.natural,[352,656])
    assert.equal(state.inert,true);assert.equal(state.ariaHidden,'true');assert.equal(state.pointer,'none');assert.equal(state.state,'idle');assert.equal(state.sheet,false)
    await evaluate('document.activeElement?.blur();window.scrollTo(0,0)'); await delay(60)
    await session.shot(path.join(output,system+'-390.png'))
  }
  for(const [key,expected] of [['End','ai'],['ArrowLeft','ziwei'],['Home','tarot'],['ArrowRight','iching']]) {
    await evaluate(`document.querySelector('[role="tab"][aria-selected="true"]').focus()`)
    await send('Input.dispatchKeyEvent',{type:'keyDown',key}); await send('Input.dispatchKeyEvent',{type:'keyUp',key})
    await selected(expected)
    assert.equal(await evaluate('document.activeElement.id'),'cosmos-'+expected+'-tab')
  }
  for(let index=0;index<5;index++) {
    await choose('ai');await waitFor(`document.querySelectorAll('.ask-source-grid article').length===5`,'Ask source choices')
    await click(`.ask-source-grid article:nth-child(${index+1}) button`)
    await selected(systems[index][0])
  }
  await choose('tarot');await textButton('洗牌 / Shuffle');await input('#cosmos-tarot-panel input','17')
  await evaluate(`void(window.tarotInputBefore=document.querySelector('#cosmos-tarot-panel input'));void(window.tarotImageBefore=${avatar}.querySelector('img'))`)
  const beforeResults = imageRequests.length
  await textButton('揭示牌面 / Reveal');await waitFor(`document.querySelector('.cosmos-revealed-card')`,'local Tarot reveal')
  const tarotResult = await evaluate(`document.querySelector('.cosmos-revealed-card').textContent`)
  assert.equal(imageRequests.length,beforeResults,'a calculation must not reload art')
  assert(await evaluate(`window.tarotImageBefore===${avatar}.querySelector('img')`))
  await choose('bazi');await choose('tarot')
  assert.equal(await evaluate(`document.querySelector('.cosmos-revealed-card').textContent`),tarotResult)
  await choose('iching');await textButton('开始起卦 / Start Reading')
  for(let toss=0;toss<6;toss++)await textButton('掷铜钱 / Toss Coins')
  await waitFor(`document.querySelector('.iching-result')`,'six local coin tosses')
  await selected('iching')
  await choose('bazi');await waitFor(`document.querySelector('.bazi-form')`,'local BaZi form')
  await input('.bazi-form input[type="date"]','2000-01-01');await input('.bazi-form input[type="time"]','12:00')
  await evaluate(`document.querySelector('.bazi-form').requestSubmit()`);await waitFor(`document.querySelector('.bazi-results')`,'local calendar result')
  await selected('bazi')
  await choose('astrology');await waitFor(`document.querySelector('.astrology-form')`,'local astronomy form')
  await input('.astrology-form input[type="date"]','2000-01-01');await input('.astrology-form input[type="time"]','12:00');await zone('.astrology-form')
  await evaluate(`document.querySelector('.astrology-form').requestSubmit()`);await waitFor(`document.querySelector('.astrology-results')`,'local astronomical result')
  await selected('astrology')
  await choose('ziwei');await waitFor(`document.querySelector('.ziwei-form')`,'local Zi Wei form')
  await input('.ziwei-form input[type="date"]','2000-01-01');await input('.ziwei-form input[type="time"]','12:00');await zone('.ziwei-form')
  await click('.ziwei-form input[name="ziwei-gender"]')
  await evaluate(`document.querySelector('.ziwei-form').requestSubmit()`);await waitFor(`document.querySelectorAll('.ziwei-palace-cell').length===12`,'local twelve-palace chart')
  await selected('ziwei')
  for(const [system] of systems) {
    await choose(system);await evaluate('document.activeElement?.blur();window.scrollTo(0,0)');await delay(50)
    const first = await evaluate(audit), bottom = await evaluate('document.documentElement.scrollHeight-innerHeight')
    for(const fraction of [0,0.25,0.5,0.75,1]) {
      await evaluate(`window.scrollTo(0,${Math.max(0,bottom)*fraction})`)
      await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
      const sample=await evaluate(audit)
      assert.equal(sample.id,first.id);assert.equal(sample.visible,'true');assert.equal(sample.left,first.left);assert.equal(sample.top,first.top);assert.equal(sample.overflow,false)
    }
    layout.push({system,frame:first.frame,scrollStable:true})
  }
  await evaluate(`(()=>{const a=${avatar},r=a.getBoundingClientRect(),b=document.createElement('button');b.id='behind-cosmos-avatar';b.textContent='Synthetic action';Object.assign(b.style,{position:'absolute',left:(r.left+scrollX)+'px',top:(r.top+scrollY)+'px',width:r.width+'px',height:r.height+'px'});window.behindClicks=0;b.onclick=()=>window.behindClicks++;document.body.append(b)})()`)
  const point=await evaluate(`(()=>{const b=document.querySelector('#behind-cosmos-avatar'),r=b.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,hit:b.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))}})()`)
  assert(point.hit)
  for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,x:point.x,y:point.y,button:'left',clickCount:1})
  assert.equal(await evaluate('window.behindClicks'),1);await evaluate(`document.querySelector('#behind-cosmos-avatar').remove()`)
  await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Network.clearBrowserCache')
  hold=true
  await send('Page.navigate',{url:origin+'/cosmos'});await delay(150);await selected('tarot','loading')
  for(const system of ['iching','bazi','ai','ziwei'])await choose(system,'loading')
  for(let i=0;i<100&&paused.length<5;i++)await delay(50)
  assert(paused.length>=5,'all delayed requests observed')
  hold=false
  for(const request of paused.filter(r=>r.url.includes('eden-ziwei')))await release(request)
  await selected('ziwei')
  for(const request of paused.filter(r=>!r.url.includes('eden-ziwei')))await release(request)
  await delay(100);await selected('ziwei')
  for(const [system,id] of systems) {
    // A fresh document avoids testing Chrome's same-document decoded-image
    // cache instead of a real failed request. Recovery itself never reloads.
    failId=id
    await send('Page.navigate',{url:origin+'/cosmos'});await delay(150)
    if(system==='tarot')await selected('tarot','error')
    else {await selected('tarot');await choose(system,'error')}
    await delay(60)
    failId=null;await evaluate(`dispatchEvent(new Event('online'))`);await selected(system)
  }
  await choose('tarot');await textButton('洗牌 / Shuffle');await input('#cosmos-tarot-panel input','12')
  await evaluate(`window.preservedInput=document.querySelector('#cosmos-tarot-panel input');window.preservedHeader=document.querySelector('main h1');${avatar}.querySelector('img').dispatchEvent(new Event('error'))`)
  await selected('tarot','error');await delay(60);await evaluate(`dispatchEvent(new Event('online'))`);await selected('tarot')
  assert(await evaluate(`window.preservedInput===document.querySelector('#cosmos-tarot-panel input')&&window.preservedInput.value==='12'&&window.preservedHeader===document.querySelector('main h1')`))
  await choose('ziwei')
  await evaluate(`void(window.cosmosImageBefore=${avatar}.querySelector('img'))`)
  for(const locked of [true,false,true,false]) {await evaluate(`window.aboutHarness.setLocked(${locked})`);await delay(50);await selected('ziwei');assert(await evaluate(`window.cosmosImageBefore===${avatar}.querySelector('img')`))}
  await evaluate(`(()=>{const d=document.createElement('div');d.id='synthetic-pin';d.setAttribute('role','dialog');d.dataset.state='open';d.setAttribute('aria-label','Synthetic PIN modal');document.body.append(d)})()`)
  await waitFor(`${avatar}.dataset.visible==='false'`,'PIN-like modal protects decoration')
  await evaluate(`document.querySelector('#synthetic-pin').remove()`);await waitFor(`${avatar}.dataset.visible==='true'`,'modal closed')
  await evaluate('window.aboutBoot.replay()');await waitFor(`document.querySelector('.genesis-boot-screen')&&${avatar}.dataset.visible==='false'`,'real Genesis replay')
  await click('.genesis-skip');await waitFor(`!document.querySelector('.genesis-boot-screen')`,'Genesis skip');await selected('ziwei')
  await evaluate('document.documentElement.requestFullscreen()');await waitFor(`Boolean(document.fullscreenElement)&&${avatar}.dataset.visible==='false'`,'fullscreen protection')
  await evaluate('document.exitFullscreen()');await waitFor(`${avatar}.dataset.visible==='true'`,'fullscreen restoration');await selected('ziwei')
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  for(const [width,height] of [[320,844],[844,390],[1440,1000]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1024});await delay(100)
    await choose('ai');const state=await evaluate(audit);assert.deepEqual(state.frame,[88,164]);assert.equal(state.overflow,false)
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:235,deviceScaleFactor:1,mobile:true})
  await waitFor(`${avatar}.dataset.visible==='false'`,'keyboard-sized viewport')
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await selected('ai')
  await navigate('Records','/records');await navigate('Cosmos','/cosmos');await selected('tarot')
  await choose('ai');await navigate('Records','/records');await evaluate('history.back()');await selected('tarot')
  assert.equal(await evaluate(`sessionStorage.getItem(${JSON.stringify(exerciseKey)})`),null,'Cosmos has never consumed an Exercise entry')
  await navigate('Exercise','/exercise');await waitFor(`${appearance}?.dataset.avatarId==='eden-swim'`,'first Exercise still Swim')
  const saved=await evaluate(`sessionStorage.getItem(${JSON.stringify(exerciseKey)})`)
  await navigate('Cosmos','/cosmos');for(const [system]of systems)await choose(system)
  assert.equal(await evaluate(`sessionStorage.getItem(${JSON.stringify(exerciseKey)})`),saved)
  await navigate('Exercise','/exercise');await waitFor(`${appearance}?.dataset.avatarId==='eden-boxing'`,'second Exercise still Boxing')
  assert.equal(session.requests.some(url=>url.includes('/.netlify/functions/')),false,'No paid/record endpoint may be invoked')
  assert.deepEqual(session.errors,[])
  const report={sixNativeMappings:true,selectedOnlyInitialImageRequests:true,keyboardArrowHomeEnd:true,askInternalJumps:true,localTarotAndRetainedReading:true,localIChingSixTosses:true,localBaZiCalendar:true,localAstrologyCalculation:true,localZiWeiTwelvePalaces:true,layout,clickThrough:true,rapidStaleLoadsIgnored:true,allSixFailuresAndOnlineRecovery:true,recoveryPreservesPageAndInput:true,financeLockInvariant:true,modalGenesisFullscreenSafe:true,reducedMotionAndLandscape:true,keyboardViewportSafe:true,routeReentryAndHistoryTarot:true,exerciseParityUnaffected:true,noPaidCallsOrRealWrites:true,errors:session.errors}
  await writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
} catch(error) {console.error(JSON.stringify({page:await evaluate('document.body.innerText'),avatar:await evaluate(audit),errors:session.errors}));throw error}
finally {await session.close()}
