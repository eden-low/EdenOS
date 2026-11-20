// Actual App/routes with in-memory identities/repositories; never live Auth or data.
// Run aboutBrowserValidation.mjs first to prepare the shared synthetic provider fixture.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createBrowserSession, delay } from './browserSession.mjs'
import { syntheticRepositorySource } from './avatarSyntheticRepositories.mjs'

const origin = 'http://127.0.0.1:5181'
const output = path.resolve('artifacts/browser-validation/avatar-part4a')
await mkdir(output, { recursive: true })
let harness = await readFile('artifacts/browser-validation/about/harness.tsx', 'utf8')
assert(harness.includes("import App from '/src/App'"))
harness = harness.replace('items:[],cloudError:null', 'items:[],cloudError:null,saveProgress:()=>{window.syntheticProgressEvents=(window.syntheticProgressEvents??0)+1},flushProgress:async()=>{}')
  .replace('discardExistingGoogleChoice:forbidden', 'discardExistingGoogleChoice:()=>{}')
  .replace("import App from '/src/App'", "import App from '/src/App'\nimport {FinanceRulesContext} from '/src/state/financeRulesContextDefinition'")
  .replace('<FinancePlanningContext.Provider', "<FinanceRulesContext.Provider value={{rules:[],status:'loaded',createRule:forbidden,setRuleEnabled:forbidden,deleteRule:forbidden}}><FinancePlanningContext.Provider")
  .replace('</FinancePlanningContext.Provider>', '</FinancePlanningContext.Provider></FinanceRulesContext.Provider>')
await writeFile(path.join(output, 'harness.tsx'), harness)
await writeFile(path.join(output, 'index.html'), '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><div id="root"></div><script type="module" src="/artifacts/browser-validation/avatar-part4a/harness.tsx"></script></body></html>')
await delay(250)
const html = await (await fetch(origin + '/artifacts/browser-validation/avatar-part4a/index.html')).text()
const session = await createBrowserSession()
const { send, evaluate, waitFor, click } = session
const results = []
const pages = [
  { path: '/', label: 'Today', heading: null },
  { path: '/expenses', label: 'Expenses', heading: 'Finance' },
  { path: '/exercise', label: 'Exercise', heading: 'Exercise' },
  { path: '/records', label: 'Records', heading: 'Records' },
  { path: '/weekly-review', label: 'Review', heading: 'Weekly Review' },
  { path: '/anime', label: 'Anime', heading: 'Anime' },
  { path: '/cosmos', label: 'Cosmos', heading: 'Cosmos' },
  { path: '/about', label: 'About Eden', heading: 'About Eden' },
]
const avatar = `document.querySelector('.eden-avatar')`
const overlap = `(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top`
const audit = `(()=>{const a=${avatar};if(!a)return null;const r=a.getBoundingClientRect();const art=a.querySelector('.eden-avatar-art'),image=a.querySelector('.eden-avatar-static-image'),appearance=a.querySelector('.eden-avatar-appearance');const intersects=${overlap};const important=e=>{if(e.closest('[data-avatar-priority]')||(e===document.activeElement&&e.matches('input,textarea,select,[contenteditable="true"]')))return true;for(let p=e;p&&p!==document.body;p=p.parentElement)if(['fixed','sticky'].includes(getComputedStyle(p).position))return true;return false};return {visible:a.dataset.visible,state:a.dataset.state,sheet:a.hasAttribute('data-sheet'),pose:art?(art.viewBox.baseVal.y===0?'standing':'perched'):image?'standing':'missing',avatarId:appearance?.dataset.avatarId,mode:appearance?.dataset.avatarMode,assetState:appearance?.dataset.assetState,left:r.left,top:r.top,width:r.width,height:r.height,pointer:getComputedStyle(a).pointerEvents,inert:a.inert,ariaHidden:a.getAttribute('aria-hidden'),mirrored:getComputedStyle(a.querySelector('.eden-avatar-facing')).transform==='matrix(-1, 0, 0, 1, 0, 0)',collision:a.dataset.visible==='true'&&[...document.querySelectorAll('button,a,input,select,textarea,summary,[role="button"]')].some(e=>!a.contains(e)&&important(e)&&getComputedStyle(e).visibility!=='hidden'&&e.getClientRects().length&&intersects(r,e.getBoundingClientRect())),overflow:document.documentElement.scrollWidth>innerWidth}})()`
const ready = (page) => page.heading ? `document.querySelector('main h1')?.textContent.includes(${JSON.stringify(page.heading)})` : `document.querySelector('.today-dashboard')`
const clickText = async (text) => evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&b.getClientRects().length);if(!b)throw Error('Missing button: '+${JSON.stringify(text)});b.click()})()`)
let mobile = true
let failTreasurer = false
async function navigate(page) {
  if (mobile) { await click('[aria-label="Open apps"]'); await waitFor(`document.querySelector('[aria-label="App drawer"]')`, 'Apps drawer'); await clickText(page.label) }
  else await click(`.desktop-nav [aria-label="${page.label}"]`)
  await waitFor(`location.pathname===${JSON.stringify(page.path)}&&Boolean(${ready(page)})&&!document.querySelector('[role="dialog"][data-state="open"]')`, 'route ' + page.path)
  await evaluate('window.scrollTo(0,0)'); await delay(100)
}
async function closeDialog() {
  await click('[role="dialog"][data-state="open"] [aria-label="Close dialog"]')
  await waitFor(`!document.querySelector('[role="dialog"][data-state="open"]')&&document.body.style.pointerEvents!=='none'`, 'dialog and input shield removed')
  await delay(200)
}
try {
  session.onIntercept = async ({ requestId, request, resourceType }) => {
    const url = new URL(request.url)
    if(resourceType==='Image'&&url.pathname.includes('eden-treasurer-abacus-static')) {
      await send(failTreasurer?'Fetch.failRequest':'Fetch.continueRequest',failTreasurer?{requestId,errorReason:'Failed'}:{requestId})
      return
    }
    let body, mime = 'application/javascript'
    if (request.url.startsWith(origin) && !url.pathname.includes('/src/') && !url.pathname.includes('/artifacts/')) { body = html; mime = 'text/html' }
    else body = syntheticRepositorySource(url.pathname)
    assert(body, 'Only explicit synthetic modules may be intercepted')
    await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{name:'Content-Type',value:mime}], body: Buffer.from(body).toString('base64') })
  }
  await send('Fetch.enable', { patterns: [
    ...pages.map(p=>({urlPattern:origin+(p.path==='/'?'/':p.path+'*'),resourceType:'Document'})),
    ...['firestoreAnimeRepository','firestoreWeeklyReviewRepository','animeDetailService','useGoalAllocations'].map(name=>({urlPattern:'*src/*/'+name+'.ts*'})),
    {urlPattern:'*eden-treasurer-abacus-static.webp*',resourceType:'Image'},
  ] })
  await send('Emulation.setFocusEmulationEnabled', {enabled:true})
  // Chrome headless denies fullscreen by default. Grant only this fresh test
  // profile/origin so the actual player and Fullscreen API can be exercised.
  await send('Browser.setPermission',{permission:{name:'fullscreen',allowWithoutGesture:true},setting:'granted',origin})
  const protocol = await (await fetch(`http://127.0.0.1:${session.port}/json/protocol`)).json()
  const safeInsets = protocol.domains.find(d=>d.domain==='Emulation').commands.some(c=>c.name==='setSafeAreaInsets')
  for (const width of [390,320,1440]) {
    mobile = width < 1024
    await send('Emulation.setDeviceMetricsOverride', {width,height:width===1440?1000:844,deviceScaleFactor:1,mobile})
    await send('Page.navigate', {url:origin+'/'})
    await delay(150)
    await waitFor(ready(pages[0]), 'initial Today')
    if (safeInsets) {
      await send('Emulation.setSafeAreaInsets',{insets:width===390?{top:47,bottom:34}:{}})
      await evaluate(`dispatchEvent(new Event('resize'))`);await delay(80)
      if (width===390) assert.equal(await evaluate(`parseFloat(getComputedStyle(document.querySelector('.eden-avatar-safe-area')).paddingBottom)`),34)
    }
    for (const page of pages) {
      await navigate(page)
      if (width===390) {
        await send('Page.navigate',{url:origin+page.path});await delay(100)
        await waitFor(`location.pathname===${JSON.stringify(page.path)}&&Boolean(${ready(page)})`,'direct link '+page.path)
        await evaluate('window.routeReloadMarker=true');await send('Page.reload');await delay(100)
        await waitFor(`!window.routeReloadMarker&&location.pathname===${JSON.stringify(page.path)}&&Boolean(${ready(page)})`,'reload retains '+page.path)
        if (safeInsets) {await send('Emulation.setSafeAreaInsets',{insets:{top:47,bottom:34}});await evaluate(`dispatchEvent(new Event('resize'))`);await delay(80)}
        await click('[aria-label="Open apps"]');await waitFor(`document.querySelector('[aria-label="App drawer"]')`,'route highlight')
        assert.equal(await evaluate(`document.querySelector('[aria-label="App drawer"] [aria-current="page"]')?.textContent.trim()`),page.label)
        await closeDialog()
      }
      assert.equal(await evaluate(`Boolean(document.querySelector('[data-global-capture]'))`), page.path==='/')
      assert.equal(await evaluate(`document.querySelectorAll('[aria-label="Capture something"]').length`), page.path==='/'?1:0)
      if (page.path==='/about') { assert.equal(await evaluate(`${avatar}===null`),true); continue }
      const selectedId=page.path==='/expenses'?'eden-treasurer':'eden-default'
      await waitFor(`${avatar}.querySelector('.eden-avatar-appearance').dataset.avatarId===${JSON.stringify(selectedId)}`,'selected wardrobe '+page.path)
      if(page.path==='/expenses') {
        assert.deepEqual(await evaluate(`(()=>{const i=${avatar}.querySelector('img'),s=getComputedStyle(i),r=i.getBoundingClientRect();return {natural:[i.naturalWidth,i.naturalHeight],size:[r.width,r.height],fit:s.objectFit,anchor:s.objectPosition,animation:s.animationName,blink:!!${avatar}.querySelector('.eden-avatar-eyes-closed')}})()`),{natural:[352,656],size:[88,164],fit:'contain',anchor:'50% 100%',animation:'none',blink:false})
      }
      let visibleSamples = 0
      const positions = []
      const expectedCorner = await evaluate(`(()=>{const v=window.visualViewport,s=getComputedStyle(document.querySelector('.eden-avatar-safe-area'));return ${page.path==='/weekly-review' ? `(v?.offsetLeft??0)+(parseFloat(s.paddingLeft)||0)+12+((v?.width??innerWidth)>=1024?100:0)` : `(v?.offsetLeft??0)+(v?.width??innerWidth)-(parseFloat(s.paddingRight)||0)-100`}})()`)
      const bottom = await evaluate('document.documentElement.scrollHeight-innerHeight')
      for (const direction of [1,-1]) for (let offset=0;offset<=bottom+120;offset+=120) {
        await evaluate(`window.scrollTo(0,${direction===1?Math.min(offset,bottom):Math.max(bottom-offset,0)})`)
        await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))')
        const sample = await evaluate(audit)
        assert.equal(sample.state,'idle'); assert.equal(sample.pose,'standing'); assert.equal(sample.sheet,false)
        assert.equal(sample.avatarId,selectedId)
        assert.equal(sample.mirrored,page.path==='/weekly-review')
        assert.equal(sample.pointer,'none'); assert.equal(sample.inert,true); assert.equal(sample.ariaHidden,'true'); assert.equal(sample.overflow,false)
        if (sample.visible==='true') {
          visibleSamples++; assert.equal(sample.collision,false,JSON.stringify({page:page.path,width,sample}))
          assert(Math.abs(sample.left-expectedCorner)<1,'fixed corner for '+page.path)
          positions.push([sample.left,sample.top])
        }
      }
      assert(visibleSamples>0, 'avatar must have safe standing space on '+page.path)
      assert(positions.every(p=>Math.abs(p[0]-positions[0][0])<1&&Math.abs(p[1]-positions[0][1])<1),'scroll never moves the standing anchor')
      await evaluate(`(()=>{const r=${avatar}.getBoundingClientRect();const b=document.createElement('button');b.id='ordinary-scroll-action';b.textContent='Synthetic scrolling action';Object.assign(b.style,{position:'absolute',left:(r.left+scrollX)+'px',top:(r.top+scrollY)+'px',width:r.width+'px',height:r.height+'px',zIndex:1});window.avatarButtonClicks=0;b.onclick=()=>window.avatarButtonClicks++;document.body.append(b)})()`)
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
      assert.equal((await evaluate(audit)).visible,'true','ordinary buttons never hide idle')
      const hit=await evaluate(`(()=>{const b=document.querySelector('#ordinary-scroll-action'),r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,receives:b.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))}})()`)
      assert(hit.receives,'inert avatar must not intercept the button behind it')
      await send('Input.dispatchMouseEvent',{type:'mousePressed',x:hit.x,y:hit.y,button:'left',clickCount:1})
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:hit.x,y:hit.y,button:'left',clickCount:1})
      assert.equal(await evaluate('window.avatarButtonClicks'),1)
      assert.equal((await evaluate(audit)).visible,'true')
      await evaluate(`document.querySelector('#ordinary-scroll-action').remove()`)
      await evaluate(`void(window.avatarBeforeLock=${avatar});void(window.outfitBeforeLock=${avatar}.querySelector('img'))`)
      for (const locked of [true,false]) {
        await evaluate(`window.aboutHarness.setLocked(${locked})`); await delay(60)
        assert(await evaluate(`window.avatarBeforeLock===${avatar}`))
        assert.equal((await evaluate(audit)).state,'idle')
        if(page.path==='/expenses') { assert.equal((await evaluate(audit)).avatarId,'eden-treasurer');assert(await evaluate(`window.outfitBeforeLock===${avatar}.querySelector('img')`)) }
      }
      results.push({width,page:page.path,visibleSamples,fixedCorner:true,noIdlePerch:true})
      if (width===390) await session.shot(path.join(output,page.label.replaceAll(' ','-')+'.png'))
    }
    await navigate(pages[4])
    await evaluate(`(()=>{const i=document.querySelector('textarea'),a=${avatar}.getBoundingClientRect();window.scrollBy(0,i.getBoundingClientRect().top-a.top);i.focus({preventScroll:true})})()`)
    const focusedOverlap=await evaluate(`(()=>{const a=${avatar}.getBoundingClientRect(),b=document.activeElement.getBoundingClientRect();return (${overlap})(a,b)})()`)
    if(focusedOverlap) await waitFor(`${avatar}.dataset.visible==='false'`,'focused Review field protected')
    else assert.equal((await evaluate(audit)).collision,false,'desktop Review field already clears the avatar')
    await evaluate(`document.querySelector('textarea').blur();window.scrollTo(0,0)`)
    await waitFor(`${avatar}.dataset.visible==='true'`,'Review blur restores standing')
    await evaluate(`document.querySelector('textarea').scrollIntoView({block:'center'})`); await delay(100)
    assert.equal((await evaluate(audit)).collision,false,'Review inputs never intersect a visible avatar')
    assert(await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Save reflection');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))})()`),'Save reflection remains hit-testable; no write performed')
    await delay(100); assert.equal((await evaluate(audit)).collision,false)
    for (const [page,entries] of [[pages[1],['Add Expense','Add Income']],[pages[2],['Capture workout']],[pages[3],['Capture','Capture a record']]]) {
      await navigate(page)
      for (const entry of entries) {
        await clickText(entry)
        await waitFor(`document.querySelector('[role="dialog"][data-state="open"]')`,entry+' opens')
        await waitFor(`${avatar}.dataset.visible==='false'`,'non-Today dialog hides avatar')
        const sample=await evaluate(audit)
        assert.equal(sample.state,'idle');assert.equal(sample.pose,'standing');assert.equal(sample.sheet,false)
        await closeDialog()
        assert.equal((await evaluate(audit)).state,'idle')
      }
    }
  }
  mobile=false
  await send('Page.navigate',{url:origin+'/expenses#/'});await delay(100)
  await waitFor(ready(pages[1]),'canonical Expenses beats stale root hash')
  await send('Page.navigate',{url:origin+'/#/expenses'});await delay(100)
  await waitFor(ready(pages[1]),'legacy root hash still supported')
  await navigate(pages[0])
  await evaluate(`history.replaceState(null,'','/expenses');dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))`)
  await waitFor(ready(pages[1]),'pageshow restores URL-backed content')
  await navigate(pages[6])
  await clickText('洗牌 / Shuffle')
  await waitFor(`document.querySelector('#cosmos-tarot-panel input')`,'local Cosmos shuffle')
  await evaluate(`(()=>{const i=document.querySelector('#cosmos-tarot-panel input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'1');i.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await evaluate(`document.querySelector('#cosmos-tarot-panel form').requestSubmit()`)
  await waitFor(`document.querySelector('.cosmos-revealed-card')`,'local Cosmos reveal without AI')
  assert.equal((await evaluate(audit)).collision,false)
  await navigate(pages[5])
  await evaluate(`(async()=>{const c=document.createElement('canvas');c.width=160;c.height=90;const x=c.getContext('2d');const stream=c.captureStream(10);const rec=new MediaRecorder(stream,{mimeType:'video/webm'});const chunks=[];rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(resolve=>rec.onstop=resolve);rec.start();for(let i=0;i<8;i++){x.fillStyle=i%2?'#273156':'#4763a0';x.fillRect(0,0,160,90);await new Promise(r=>setTimeout(r,80))}rec.stop();await done;stream.getTracks().forEach(t=>t.stop());window.syntheticMediaUrl=URL.createObjectURL(new Blob(chunks,{type:'video/webm'}))})()`)
  await click('[aria-label="Open Synthetic Anime"]')
  await waitFor(`document.querySelector('[aria-label="Anime video player"] video')?.readyState>=2`,'real player with synthetic local media')
  await waitFor(`${avatar}.dataset.visible==='false'`,'player hides global avatar')
  await evaluate(`document.querySelector('[aria-label="Anime video player"]').focus()`)
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,text:' ',unmodifiedText:' '})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32})
  await waitFor(`!document.querySelector('video').paused`,'Space plays the real player')
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'f',code:'KeyF',windowsVirtualKeyCode:70,text:'f'})
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'f',code:'KeyF',windowsVirtualKeyCode:70})
  await waitFor(`Boolean(document.fullscreenElement)`,'player fullscreen')
  assert.equal((await evaluate(audit)).visible,'false')
  await evaluate('document.exitFullscreen()')
  await closeDialog()
  assert.equal((await evaluate(audit)).state,'idle')
  await navigate(pages[0])
  await click('.dashboard-quick-capture')
  await waitFor(`${avatar}.dataset.state==='perched'`,'Today Capture perch')
  await evaluate(`history.pushState(null,'','/records');dispatchEvent(new PopStateEvent('popstate'))`)
  await waitFor(`${ready(pages[3])}&&!document.querySelector('[data-eden-capture]')&&!document.querySelector('.capture-overlay')&&document.body.style.pointerEvents!=='none'`,'route switch removes Capture and its shield')
  assert.equal((await evaluate(audit)).state,'idle')
  await evaluate('history.back()');await delay(100)
  await waitFor(ready(pages[0]),'history back to Today')
  await delay(550)
  assert.equal((await evaluate(audit)).state,'idle');assert.equal((await evaluate(audit)).pose,'standing')
  await evaluate('history.forward()');await delay(100);await waitFor(ready(pages[3]),'history forward to Records')
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-global-capture]'))`),false)
  await click('.desktop-nav [aria-label="Account"]')
  await waitFor(`${avatar}.dataset.visible==='false'`,'Account hides global avatar')
  await closeDialog()
  await evaluate('window.aboutBoot.replay()')
  await waitFor(`document.querySelector('.genesis-boot-screen')&&${avatar}.dataset.visible==='false'`,'Genesis hides global avatar')
  await click('.genesis-skip');await waitFor(`!document.querySelector('.genesis-boot-screen')`,'Genesis Skip')
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:235,deviceScaleFactor:1,mobile:true})
  await waitFor(`${avatar}.dataset.visible==='false'`,'keyboard-sized viewport hides avatar')
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await delay(100)
  assert.equal((await evaluate(audit)).collision,false);assert.equal((await evaluate(audit)).overflow,false)
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await send('Network.setCacheDisabled',{cacheDisabled:true})
  failTreasurer=true
  await send('Page.navigate',{url:origin+'/expenses'});await delay(100)
  await waitFor(`${ready(pages[1])}&&${avatar}.querySelector('.eden-avatar-appearance')?.dataset.assetState==='error'`,'network failure falls back without a broken character')
  assert.equal((await evaluate(audit)).avatarId,'eden-default')
  assert.equal((await evaluate(audit)).pose,'standing')
  failTreasurer=false
  await send('Page.navigate',{url:origin+'/expenses'});await delay(100)
  await waitFor(`${ready(pages[1])}&&${avatar}?.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-treasurer'`,'fresh route retries the approved material')
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await waitFor(`${avatar}.dataset.reduced==='true'`,'Treasurer Reduced Motion')
  assert.equal((await evaluate(audit)).mode,'static-prototype')
  await session.shot(path.join(output,'Treasurer-390-reduced.png'))
  await send('Page.navigate',{url:origin+'/'});await delay(100)
  await waitFor(`${avatar}?.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-default'`,'leaving Expenses restores original')
  assert.equal(await evaluate(`document.querySelectorAll('.eden-avatar-static-image').length`),0)
  assert.deepEqual(session.errors,[])
  const report={results,treasurerStaticOnlyOnExpenses:true,staticAspectAndFootAnchor:true,resourceFailureFallbackAndRetry:true,wardrobeCleanupAndReducedMotion:true,allEightRoutes:true,directLinksReloadAndDrawerHighlight:true,pageshowAndLegacyHash:true,ordinaryButtonsClickableBehindAvatar:true,reviewOnlyMirror:true,globalPlusOnlyToday:true,existingPageEntries:true,reviewInputsAndSaveProtected:true,cosmosLocalOnly:true,actualAnimePlayerSyntheticMedia:true,fullscreen:true,historyAndCaptureCleanup:true,accountAndGenesisHidden:true,shortViewportAndLandscape:true,noLiveDataOrPaidCalls:true,errors:session.errors}
  await writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
} catch(error) { console.error(JSON.stringify({page:await evaluate('document.body.innerText'),errors:session.errors}));throw error }
finally { await session.close() }
