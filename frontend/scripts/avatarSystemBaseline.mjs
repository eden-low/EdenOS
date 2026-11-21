// Evidence only: actual app components, disposable Chrome, read-only synthetic identity.
// Run avatarRouteBrowserValidation.mjs first to create the guarded fixture.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { createBrowserSession, delay } from './browserSession.mjs'
import { syntheticRepositorySource } from './avatarSyntheticRepositories.mjs'

const origin = 'http://127.0.0.1:5181'
const output = path.resolve('artifacts/browser-validation/avatar-part4e-baseline')
await mkdir(output, { recursive: true })
const html = await (await fetch(origin + '/artifacts/browser-validation/avatar-part4d-cosmos/index.html')).text()
assert(html.includes('avatar-part4d-cosmos/harness.tsx'))
const session = await createBrowserSession()
const { send, evaluate, waitFor, click } = session
const imageRequests = []
let phase = 'initial'
const systems = ['tarot', 'iching', 'bazi', 'astrology', 'ziwei', 'ai']
const ids = systems.map(s => 'eden-' + (s === 'ai' ? 'ai-explorer' : s))
const identities = new Set()
const appearance = `document.querySelector('.eden-avatar-appearance')`
const instrumentation = `(()=>{
 const decode=HTMLImageElement.prototype.decode;
 window.avatarEvidence={phase:'initial',decodes:[],shifts:[],longTasks:[],pageshow:[],pagehide:[],visibility:[],documentId:Math.random().toString(36)};
 HTMLImageElement.prototype.decode=function(){const row={src:this.src,start:performance.now()};window.avatarEvidence.decodes.push(row);return decode.call(this).then(v=>{row.end=performance.now();row.ok=true;return v},e=>{row.end=performance.now();row.ok=false;throw e})};
 for(const [type,key] of [['layout-shift','shifts'],['longtask','longTasks']]){try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.avatarEvidence[key].push({phase:window.avatarEvidence.phase,start:e.startTime,duration:e.duration,value:e.value??null,recentInput:e.hadRecentInput??false,avatarSource:e.sources?.some(s=>s.node?.closest?.('.eden-avatar'))??false})}).observe({type,buffered:true})}catch{}}
 for(const name of ['pageshow','pagehide'])addEventListener(name,e=>window.avatarEvidence[name].push({persisted:e.persisted,time:performance.now()}));
 document.addEventListener('visibilitychange',()=>window.avatarEvidence.visibility.push(document.visibilityState));
})()`
async function ready(id) { await waitFor(`${appearance}?.dataset.avatarId===${JSON.stringify(id)}&&${appearance}?.dataset.assetState==='ready'`, id);identities.add(id) }
async function choose(system) { await click('#cosmos-' + system + '-tab'); await ready(ids[systems.indexOf(system)]) }
async function navigate(label, pathname) {
 await click('[aria-label="Open apps"]');await waitFor(`document.querySelector('[aria-label="App drawer"]')`, 'drawer')
 await evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`)
 await waitFor(`location.pathname===${JSON.stringify(pathname)}&&!document.querySelector('[role="dialog"][data-state="open"]')&&document.body.style.pointerEvents!=='none'`,label)
 await delay(120)
}
async function memory(label) {
 const metrics=(await send('Performance.getMetrics')).metrics
 const names=['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','LayoutCount','RecalcStyleCount','TaskDuration']
 return {label,...Object.fromEntries(metrics.filter(m=>names.includes(m.name)).map(m=>[m.name,m.value])),dom:await send('Memory.getDOMCounters')}
}
async function snapshot() {
 return {...await evaluate(`(()=>{const a=document.querySelector('.eden-avatar'),p=${appearance},r=a?.getBoundingClientRect();return {id:p?.dataset.avatarId,requested:p?.dataset.avatarRequested,state:a?.dataset.state,visible:a?.dataset.visible,frame:r?[r.x,r.y,r.width,r.height]:null,decode:window.avatarEvidence.decodes,resources:performance.getEntriesByType('resource').filter(e=>/eden-.*\\.webp/.test(e.name)).map(e=>({url:e.name,initiatorType:e.initiatorType,transfer:e.transferSize,encoded:e.encodedBodySize,duration:e.duration})),renderedImages:[...document.querySelectorAll('.eden-avatar img')].map(i=>({src:i.getAttribute('src'),natural:[i.naturalWidth,i.naturalHeight]}))}})()`),imageRequests:[...imageRequests]}
}
try {
 session.onIntercept=async({requestId,request,resourceType})=>{
  if(resourceType==='Image') {imageRequests.push({url:request.url,phase});return send('Fetch.continueRequest',{requestId})}
  const url=new URL(request.url),document=resourceType==='Document'
  const body=document?(url.pathname==='/qa-lifecycle-away'?'<!doctype html><title>QA away</title><p>Disposable lifecycle page</p>':html):syntheticRepositorySource(url.pathname)
  assert(body,'Only explicit read-only fixture modules may be intercepted')
  await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:document?'text/html':'application/javascript'}],body:Buffer.from(body).toString('base64')})
 }
 await send('Fetch.enable',{patterns:[{urlPattern:origin+'/*',resourceType:'Document'},...['firestoreAnimeRepository','firestoreWeeklyReviewRepository','animeDetailService','useGoalAllocations'].map(name=>({urlPattern:'*src/*/'+name+'.ts*'})),{urlPattern:'*eden-*.webp*',resourceType:'Image'}]})
 await send('Page.addScriptToEvaluateOnNewDocument',{source:instrumentation})
 await send('Performance.enable')
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
 await send('Emulation.setFocusEmulationEnabled',{enabled:true})
 await send('Page.navigate',{url:origin+'/cosmos'});await ready('eden-tarot');await delay(300)
 const initial=await snapshot(),memories=[await memory('first Cosmos, Tarot only')]
 const initialStatic=initial.decode.filter(d=>ids.some(id=>d.src.includes(id+'-static')))
 assert.equal(initialStatic.length,1);assert(initialStatic.every(d=>d.src.includes('eden-tarot-static')&&d.ok))
 assert.equal(initial.renderedImages.length,1)
 assert(initial.imageRequests.filter(r=>r.url.includes('-static')).every(r=>r.url.includes('eden-tarot-static')))
 phase='warm six systems'
 await evaluate(`window.avatarEvidence.phase='warm six systems'`)
 for(const system of systems)await choose(system)
 const warm=await snapshot();memories.push(await memory('six systems warmed once'))
 const rapidStart=await evaluate('performance.now()')
 phase='rapid switching'
 await evaluate(`window.avatarEvidence.phase='rapid switching'`)
 for(let round=0;round<10;round++)for(const system of ['ziwei','tarot','ai','bazi','astrology','iching']) {
  await click('#cosmos-'+system+'-tab')
  await evaluate('new Promise(r=>requestAnimationFrame(r))')
  const sample=await evaluate(`({selected:document.querySelector('[role="tab"][aria-selected="true"]').id,requested:${appearance}?.dataset.avatarRequested,id:${appearance}?.dataset.avatarId})`)
  const expected=ids[systems.indexOf(system)]
  assert.equal(sample.selected,'cosmos-'+system+'-tab');assert.equal(sample.requested,expected)
  assert([expected,'eden-default'].includes(sample.id),'No wrong-system pixels while loading')
 }
 await ready('eden-iching')
 const rapid=await snapshot();memories.push(await memory('after 60 rapid switches'))
 await evaluate(`window.avatarEvidence.phase='continuous scroll'`)
 const scrolling=await evaluate(`(async()=>{document.activeElement?.blur();window.scrollTo(0,0);await new Promise(r=>requestAnimationFrame(r));const samples=[],gaps=[],end=performance.now()+1800,bottom=document.documentElement.scrollHeight-innerHeight;let last=performance.now(),step=0;while(performance.now()<end){window.scrollTo(0,(Math.sin(step++/8)+1)/2*Math.max(0,bottom));await new Promise(r=>requestAnimationFrame(r));const now=performance.now(),a=document.querySelector('.eden-avatar'),b=a.getBoundingClientRect();gaps.push(now-last);last=now;samples.push({x:b.x,y:b.y,visible:a.dataset.visible,state:a.dataset.state})}window.scrollTo(0,0);return {samples,frameGapsMs:gaps,maxScroll:bottom}})()`)
 assert(scrolling.samples.every(s=>s.visible==='true'&&s.state==='idle'&&s.x===scrolling.samples[0].x&&s.y===scrolling.samples[0].y))
 const routeObservations=[]
 phase='routes and lifecycle'
 await evaluate(`window.avatarEvidence.phase='route transition'`)
 for(const [label,route,id] of [['Today','/','eden-default'],['Expenses','/expenses','eden-treasurer'],['Records','/records','eden-archivist'],['Review','/weekly-review','eden-reflector'],['Anime','/anime','eden-watching'],['Exercise','/exercise','eden-swim'],['Cosmos','/cosmos','eden-tarot']]) {
  const start=await evaluate('performance.now()');await navigate(label,route);await ready(id)
  routeObservations.push({route,elapsedIncludingDrawerCloseMs:(await evaluate('performance.now()'))-start,...await snapshot()})
  const scroll=await evaluate(`(async()=>{window.avatarEvidence.phase='intentional scroll spacer and text resize';const spacer=document.createElement('div');spacer.style.height='6000px';spacer.setAttribute('aria-hidden','true');document.querySelector('main').append(spacer);const samples=[];document.activeElement?.blur();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));for(const offset of [0,1000,3000,6000,3000,1000,0]){window.scrollTo(0,offset);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const a=document.querySelector('.eden-avatar'),b=a.getBoundingClientRect();samples.push({x:b.x,y:b.y,width:b.width,height:b.height,visible:a.dataset.visible,state:a.dataset.state})}spacer.remove();window.scrollTo(0,0);return samples})()`)
  assert(scroll.every(s=>s.visible==='true'&&s.state==='idle'&&s.x===scroll[0].x&&s.y===scroll[0].y&&s.width===88&&s.height===164),'6,000px noninteractive scroll stays fixed: '+route)
  await evaluate(`document.documentElement.style.fontSize='200%'`)
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
  const enlarged=await evaluate(`(()=>{const a=document.querySelector('.eden-avatar'),r=a.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,frame:[r.width,r.height],visible:a.dataset.visible,inert:a.inert,hidden:a.getAttribute('aria-hidden'),pointer:getComputedStyle(a).pointerEvents}})()`)
  assert.deepEqual(enlarged.frame,[88,164]);assert(enlarged.inert);assert.equal(enlarged.hidden,'true');assert.equal(enlarged.pointer,'none')
  routeObservations.at(-1).scroll6000=scroll;routeObservations.at(-1).text200=enlarged
  await evaluate(`document.documentElement.style.fontSize=''`)
  await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`)
  await evaluate(`window.avatarEvidence.phase='route transition'`)
 }
 await navigate('Exercise','/exercise');await ready('eden-boxing')
 const storageBefore=await evaluate(`sessionStorage.getItem('edenos:exercise-avatar:v1')`)
 await evaluate(`void(window.lifecycleImage=document.querySelector('.eden-avatar img'))`)
 await send('Page.setWebLifecycleState',{state:'frozen'});await delay(100);await send('Page.setWebLifecycleState',{state:'active'});await send('Page.bringToFront')
 await evaluate(`dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));document.dispatchEvent(new Event('visibilitychange'))`)
 await ready('eden-boxing')
 assert.equal(await evaluate(`sessionStorage.getItem('edenos:exercise-avatar:v1')`),storageBefore)
 assert(await evaluate(`window.lifecycleImage===document.querySelector('.eden-avatar img')`))
 const exerciseBeforeAway=await evaluate('({documentId:window.avatarEvidence.documentId,storage:sessionStorage.getItem("edenos:exercise-avatar:v1")})')
 await send('Page.navigate',{url:origin+'/qa-lifecycle-away'});await waitFor(`document.title==='QA away'`,'neutral history destination')
 await evaluate('history.back()');await waitFor(`location.pathname==='/exercise'&&${appearance}?.dataset.assetState==='ready'`,'actual document history return')
 const restored=await evaluate(`({documentId:window.avatarEvidence.documentId,pageshow:window.avatarEvidence.pageshow,storage:sessionStorage.getItem('edenos:exercise-avatar:v1'),id:${appearance}.dataset.avatarId})`)
 const bfcacheRestored=restored.documentId===exerciseBeforeAway.documentId
 if(bfcacheRestored){assert.equal(restored.storage,exerciseBeforeAway.storage);assert.equal(restored.id,'eden-boxing');assert(restored.pageshow.some(e=>e.persisted))}
 else assert.equal(restored.id,'eden-swim','A new document is one new Exercise entry')
 await navigate('Cosmos','/cosmos');await choose('ai')
 const cosmosBefore=await snapshot()
 await send('Page.setWebLifecycleState',{state:'frozen'});await send('Page.setWebLifecycleState',{state:'active'});await send('Page.bringToFront');await ready('eden-ai-explorer')
 assert.deepEqual((await snapshot()).renderedImages,cosmosBefore.renderedImages)
 memories.push(await memory('after all routes and lifecycle restores'))
 await send('HeapProfiler.collectGarbage');memories.push(await memory('same document after explicit diagnostic GC'))
 const observation=await evaluate('window.avatarEvidence')
 assert.equal(identities.size,13,'Every registered identity must actually become ready')
 const files=await readdir('src/components/avatar/assets')
 const resourceBytes=[]
 for(const file of files.filter(f=>f.endsWith('.webp')))resourceBytes.push({file,bytes:(await stat(path.join('src/components/avatar/assets',file))).size})
 const aboutResourceBytes=[]
 for(const file of (await readdir('src/about/assets')).filter(f=>f.endsWith('.webp')))aboutResourceBytes.push({file,bytes:(await stat(path.join('src/about/assets',file))).size})
 const sw=await readFile('dist/sw.js','utf8')
 const cacheEntries=[...sw.matchAll(/\{url:"([^"]+)",revision:(?:"[^"]+"|null)\}/g)].map(m=>m[1])
 assert(cacheEntries.length>0,'Read actual production precache manifest')
 let cacheBytes=0
 for(const file of cacheEntries)cacheBytes+=(await stat(path.join('dist',file))).size
 assert.deepEqual(session.errors,[])
 assert(!session.requests.some(url=>url.includes('/.netlify/functions/')))
 const report={baselineSourceSha:process.env.AVATAR_BASELINE_SHA??'record with git rev-parse HEAD',browser:await send('Browser.getVersion'),viewport:{width:390,height:844},identities:[...identities],initial,warm,rapid:{...rapid,switches:60,start:rapidStart},memories,scrolling,routeObservations,lifecycle:{frozenResumeExerciseInvariant:true,actualHistoryReturn:{bfcacheRestored,...restored},cosmosFreezeStable:true},observation,resourceBytes,aboutResourceBytes,precache:{entries:cacheEntries.length,bytes:cacheBytes},limitations:['Disposable headless Chromium with mobile viewport, not real iPhone Safari/PWA.','decode() counts are observed application decode calls, not internal decoder cache executions.','JS heap/DOM are browser-observed; decoded image/GPU/native resident memory is not exposed by these APIs.','Frame timing includes DevTools instrumentation and full-page work, not isolated Avatar CPU.'],errors:session.errors}
 await writeFile(path.join(output,'baseline.json'),JSON.stringify(report,null,2))
 if(process.argv.includes('--write-evidence')) {
  const evidenceDir=path.resolve('../docs/evidence');await mkdir(evidenceDir,{recursive:true})
  const groups={};for(const request of rapid.imageRequests)groups[request.phase]=(groups[request.phase]??0)+1
  const summary={sourceSha:report.baselineSourceSha,browser:report.browser.product,viewport:report.viewport,identities:report.identities,initial:{imageRequests:initial.imageRequests.map(r=>new URL(r.url).pathname),explicitSuccessfulStaticDecodeCalls:initialStatic.length,renderedStaticImages:initial.renderedImages.length},rapid:{switches:60,observedDecodeCalls:rapid.decode.length,requestsByPhase:groups,wrongSystemPixels:false},memory:memories,scroll:{samples:scrolling.samples.length,maxFrameGapMs:Math.max(...scrolling.frameGapsMs),stableCorner:true},routes:routeObservations.map(r=>({route:r.route,elapsedIncludingDrawerCloseMs:r.elapsedIncludingDrawerCloseMs,scroll6000Fixed:true,text200:r.text200})),layoutShiftsByPhase:Object.fromEntries([...new Set(observation.shifts.map(s=>s.phase))].map(p=>[p,observation.shifts.filter(s=>s.phase===p).length])),avatarSourceLayoutShifts:observation.shifts.filter(s=>s.avatarSource).length,lifecycle:report.lifecycle,precache:report.precache,webpBytes:resourceBytes.reduce((sum,r)=>sum+r.bytes,0),aboutWebpBytes:aboutResourceBytes.reduce((sum,r)=>sum+r.bytes,0),limitations:report.limitations}
  await writeFile(path.join(evidenceDir,'eden-avatar-part4e-baseline.json'),JSON.stringify(summary,null,2)+'\n')
 }
 console.log(JSON.stringify({initialDecodeCalls:initialStatic.length,initialImageRequests:initial.imageRequests,rapidDecodeCalls:rapid.decode.length,rapidImageRequests:rapid.imageRequests.filter(r=>r.phase==='rapid switching').length,memories,scrollSamples:scrolling.samples.length,maxFrameGap:Math.max(...scrolling.frameGapsMs),bfcacheRestored,precache:report.precache,output:path.join(output,'baseline.json')},null,2))
}finally{await session.close()}
