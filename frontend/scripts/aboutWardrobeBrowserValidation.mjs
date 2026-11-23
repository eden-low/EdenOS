// Actual App and keyboard/pointer input, disposable Chrome and readonly fixtures.
// Prepare the guarded fixture with avatarRouteBrowserValidation.mjs first.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createBrowserSession, delay } from './browserSession.mjs'
import { syntheticRepositorySource } from './avatarSyntheticRepositories.mjs'
const origin='http://127.0.0.1:5181'
const output=path.resolve('artifacts/browser-validation/avatar-part4f-wardrobe')
await mkdir(output,{recursive:true})
const html=await (await fetch(origin+'/artifacts/browser-validation/avatar-part4d-cosmos/index.html')).text()
assert(html.includes('harness.tsx'))
const session=await createBrowserSession(),{send,evaluate,waitFor,click}=session
const ids=['eden-default','eden-treasurer','eden-archivist','eden-reflector','eden-watching','eden-swim','eden-boxing','eden-tarot','eden-iching','eden-bazi','eden-astrology','eden-ziwei','eden-ai-explorer']
const p=`document.querySelector('.about-wardrobe-preview')`, gallery=`document.querySelector('#eden-wardrobe')`
const images=[],paused=[],layouts=[]
let enlargedSelectionHeights=[]
let fail=null,hold=false
async function selected(id,status='ready'){
 await waitFor(`${p}?.dataset.selectedAvatar===${JSON.stringify(id)}&&${p}?.dataset.assetState===${JSON.stringify(status)}`,id+' '+status)
 const state=await evaluate(`({actual:${p}.dataset.previewAvatar,selected:[...document.querySelectorAll('[data-wardrobe-choice][aria-pressed="true"]')].map(b=>b.dataset.wardrobeChoice)})`)
 assert.equal(state.actual,status==='ready'?id:'eden-default');assert.deepEqual(state.selected,[id])
}
async function choose(id,status='ready'){await click('[data-wardrobe-choice="'+id+'"]');await selected(id,status)}
async function key(key,code,number){const text=key==='Enter'?'\r':key===' '?' ':undefined;await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:number,...(text?{text,unmodifiedText:text}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:number})}
async function navigate(label,pathname){
 await click('[aria-label="Open apps"]');await waitFor(`document.querySelector('[aria-label="App drawer"]')`,'Apps')
 await evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`)
 await waitFor(`location.pathname===${JSON.stringify(pathname)}&&!document.querySelector('[role="dialog"][data-state="open"]')&&document.body.style.pointerEvents!=='none'`,'navigate '+label)
}
async function fresh(){
 await evaluate('window.wardrobeDocumentMarker=true')
 const navigation=await send('Page.navigate',{url:origin+'/about#eden-wardrobe'})
 // Navigating to an identical fragment can be a same-document navigation.
 // Failure cases require an actual cold document, not a simulated route reset.
 if(!navigation.loaderId)await send('Page.reload')
 await waitFor('!window.wardrobeDocumentMarker','fresh document')
 await selected('eden-default')
}
async function release(request){try{await send('Fetch.continueRequest',{requestId:request.requestId})}catch(error){assert.match(error.message,/invalid|interception|cancel|request/i)}}
try{
 session.onIntercept=async({requestId,request,resourceType})=>{
  if(resourceType==='Image'){
   images.push(request.url)
   if(fail&&request.url.includes(fail))return send('Fetch.failRequest',{requestId,errorReason:'Failed'})
   if(hold&&request.url.includes('-static.webp')){paused.push({requestId,url:request.url});return}
   return send('Fetch.continueRequest',{requestId})
  }
  const document=resourceType==='Document',body=document?html:syntheticRepositorySource(new URL(request.url).pathname)
  assert(body)
  await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:document?'text/html':'application/javascript'}],body:Buffer.from(body).toString('base64')})
 }
 await send('Fetch.enable',{patterns:[{urlPattern:origin+'/*',resourceType:'Document'},...['firestoreAnimeRepository','firestoreWeeklyReviewRepository','animeDetailService','useGoalAllocations'].map(name=>({urlPattern:'*src/*/'+name+'.ts*'})),{urlPattern:'*eden-*.webp*',resourceType:'Image'}]})
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const d=HTMLImageElement.prototype.decode;window.wardrobeDecodes=[];HTMLImageElement.prototype.decode=function(){window.wardrobeDecodes.push(this.src);return d.call(this)}})()`})
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
 await send('Emulation.setFocusEmulationEnabled',{enabled:true})
 await fresh()
 await waitFor(`${gallery}.getBoundingClientRect().top<innerHeight&&${gallery}.getBoundingClientRect().top>=0`,'deep-link scroll after lazy mount')
 assert.equal(await evaluate(`document.querySelectorAll('.eden-avatar').length`),0)
 assert.equal(images.filter(url=>url.includes('-static.webp')).length,0,'Unselected static clothes must not be requested')
 assert.deepEqual(await evaluate('window.wardrobeDecodes'),[])
 assert.equal(await evaluate(`${p}.querySelector('.eden-avatar-art').getAttribute('viewBox')`),'144 0 256 512')
 assert.equal(await evaluate(`getComputedStyle(${p}.querySelector('.eden-avatar-eyes-open')).animationName`),'none')
 assert.equal(await evaluate(`getComputedStyle(${p}.querySelector('.eden-avatar-eyes-closed')).display`),'none')
 assert.equal(await evaluate(`${gallery}.previousElementSibling.id`),'interactive-eden')
 assert.equal(await evaluate(`${gallery}.nextElementSibling.tagName`),'FOOTER')
 assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-wardrobe-choice]')].map(b=>b.dataset.wardrobeChoice)`),ids)
 const initialImages=[...images],frame=await evaluate(`document.querySelector('.about-wardrobe-character').getBoundingClientRect().height`)
 for(let index=1;index<=13;index++){
  await click('.about-wardrobe-character');await selected(ids[index%13])
  assert.equal(await evaluate(`document.querySelector('.about-wardrobe-character').getBoundingClientRect().height`),frame)
 }
 await click('.about-wardrobe-step button:first-child');await selected(ids[12])
 await click('.about-wardrobe-step button:last-child');await selected(ids[0])
 await choose('eden-reflector')
 const count=await evaluate('window.wardrobeDecodes.length')
 await choose('eden-reflector');assert.equal(await evaluate('window.wardrobeDecodes.length'),count)
 assert.equal(await evaluate(`getComputedStyle(${p}.querySelector('img')).transform`),'none')
 assert.equal(await evaluate(`getComputedStyle(${p}.querySelector('img')).objectFit`),'contain')
 await choose('eden-watching')
 assert.equal(await evaluate(`${p}.querySelector('.about-wardrobe-art > svg').getAttribute('viewBox')`),'0 373 352 283')
 await evaluate(`document.querySelector('.about-wardrobe-character').scrollIntoView({block:'center'})`)
 const point=await evaluate(`(()=>{const b=document.querySelector('.about-wardrobe-character'),r=b.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,hit:b.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))}})()`)
 assert(point.hit)
 for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,x:point.x,y:point.y,button:'left',clickCount:1})
 await selected('eden-swim')
 await evaluate(`document.querySelector('.about-wardrobe-character').focus()`)
 await key('Enter','Enter',13);await selected('eden-boxing')
 await key(' ','Space',32);await selected('eden-tarot')
 assert.equal(await evaluate(`document.activeElement.className`),'about-wardrobe-character')
 const focusStyle=await evaluate(`({style:getComputedStyle(document.activeElement).outlineStyle,width:parseFloat(getComputedStyle(document.activeElement).outlineWidth)})`)
 assert.equal(focusStyle.style,'solid');assert(focusStyle.width>=2)
 await key('Tab','Tab',9);assert.equal(await evaluate(`document.activeElement.textContent.trim()`),'上一套')
 await key('Tab','Tab',9);await key('Tab','Tab',9)
 assert.equal(await evaluate(`document.activeElement.dataset.wardrobeChoice`),'eden-default')
 await key('Enter','Enter',13);await selected('eden-default')
 await evaluate(`document.querySelector('[data-wardrobe-choice="eden-ai-explorer"]').focus()`)
 await key('Tab','Tab',9);assert.equal(await evaluate(`${gallery}.contains(document.activeElement)`),false,'No keyboard trap')
 const ax=await send('Accessibility.getFullAXTree')
 assert(ax.nodes.some(n=>n.role?.value==='button'&&n.name?.value==='查看下一套服装'))
 assert(ax.nodes.some(n=>n.role?.value==='button'&&n.name?.value==='01 Original Eden · 日常版'&&n.properties.some(v=>v.name==='pressed'&&v.value.value==='true')))
 for(const width of [320,375,390,430,768,1024,1440])for(const theme of ['dark','light']){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width<768?844:1000,deviceScaleFactor:1,mobile:width<1024})
  await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};document.documentElement.style.fontSize='100%'`)
  await choose('eden-ziwei');await evaluate(`${gallery}.scrollIntoView({block:'start'})`)
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
  const geometry=await evaluate(`(()=>{const s=${gallery},b=s.querySelector('.about-wardrobe-character').getBoundingClientRect(),m=s.querySelector('.about-wardrobe-main').getBoundingClientRect(),c=s.querySelector('.about-wardrobe-picker').getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth,preview:[b.width,b.height],mainX:m.x,pickerX:c.x,pickerY:c.y,mainY:m.y,buttons:[...s.querySelectorAll('button')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))}})()`)
  assert.equal(geometry.overflow,false)
  assert(geometry.buttons.every(b=>b.w>=44&&b.h>=44))
  if(width<900)assert(geometry.pickerY>geometry.mainY)
  else assert(geometry.pickerX>geometry.mainX)
  layouts.push({width,theme,...geometry})
  if([390,1440].includes(width)&&theme==='dark')await session.shot(path.join(output,'wardrobe-'+width+'.png'))
  await evaluate(`document.documentElement.style.fontSize='200%'`)
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,'200% text '+width)
  if(width===390&&theme==='dark') {
    const heights=[]
    for(const id of ids){await choose(id);heights.push(await evaluate(`${gallery}.getBoundingClientRect().height`))}
    enlargedSelectionHeights=heights
    assert(Math.max(...heights)-Math.min(...heights)<1,'Selection must not repeatedly resize the gallery at 200% text: '+JSON.stringify(heights))
  }
  await choose('eden-watching')
  if(width===390&&theme==='light'){await evaluate(`document.querySelector('.about-wardrobe-character').scrollIntoView({block:'center'})`);await session.shot(path.join(output,'watching-390-light-200.png'))}
 }
 await evaluate(`document.documentElement.style.fontSize='100%';document.documentElement.dataset.theme='dark'`)
 await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true})
 const protocol=await (await fetch('http://127.0.0.1:'+session.port+'/json/protocol')).json()
 const safe=protocol.domains.find(d=>d.domain==='Emulation').commands.some(c=>c.name==='setSafeAreaInsets')
 if(safe)await send('Emulation.setSafeAreaInsets',{insets:{left:47,right:47,bottom:21}})
 await choose('eden-watching');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false)
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-reduced-transparency',value:'reduce'}]})
 for(const id of ids)await choose(id)
 assert.equal(await evaluate(`${gallery}.getAnimations({subtree:true}).length`),0)
 await send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]})
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('.about-wardrobe-halo')).display`),'none')
 await send('Emulation.setEmulatedMedia',{features:[]})
 if(safe)await send('Emulation.setSafeAreaInsets',{insets:{}})
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
 await choose('eden-boxing')
 await evaluate('window.aboutHarness.setLocked(true)');await selected('eden-boxing')
 await click('[aria-label="Open apps"]');await waitFor(`document.querySelector('[aria-label="App drawer"]')&&document.querySelector('.about-wardrobe-layout').inert`,'real modal blocks wardrobe')
 await click('[data-wardrobe-choice="eden-tarot"]');assert.equal(await evaluate(`${p}.dataset.selectedAvatar`),'eden-boxing')
 assert(await evaluate(`document.querySelector('[role="dialog"]').contains(document.activeElement)`))
 await click('[role="dialog"][data-state="open"] [aria-label="Close dialog"]')
 await waitFor(`!document.querySelector('[role="dialog"][data-state="open"]')&&!document.querySelector('.about-wardrobe-layout').inert`,'modal closes')
 await evaluate('window.aboutHarness.setLocked(false)')
 await waitFor('window.aboutBoot.canReplay','committed unlocked boot state')
 assert.equal(await evaluate('window.aboutBoot.replay()'),true)
 await waitFor(`document.querySelector('.genesis-boot-screen')&&document.querySelector('.about-wardrobe-layout').inert`,'Genesis blocks wardrobe')
 await click('[data-wardrobe-choice="eden-tarot"]');assert.equal(await evaluate(`${p}.dataset.selectedAvatar`),'eden-boxing')
 await click('.genesis-skip');await waitFor(`!document.querySelector('.genesis-boot-screen')&&!document.querySelector('.about-wardrobe-layout').inert`,'Genesis restores')
 await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Network.clearBrowserCache')
 hold=true;await fresh()
 for(const id of ['eden-tarot','eden-swim','eden-watching','eden-ziwei'])await choose(id,'loading')
 for(let i=0;i<100&&paused.length<4;i++)await delay(50)
 assert(paused.length>=4);hold=false
 for(const item of paused.filter(p=>p.url.includes('eden-ziwei')))await release(item)
 await selected('eden-ziwei')
 for(const item of paused.filter(p=>!p.url.includes('eden-ziwei')))await release(item)
 await delay(100);await selected('eden-ziwei')
 for(const id of ['eden-tarot','eden-watching']){
  fail=id;await fresh();await choose(id,'error')
  assert(await evaluate(`document.querySelector('.about-wardrobe-status-message').textContent.includes('这套服装暂时没加载好')`))
  fail=null;await evaluate(`dispatchEvent(new Event('online'))`);await selected(id)
 }
 await choose('eden-watching')
 await evaluate(`${p}.querySelector('.about-wardrobe-art image').dispatchEvent(new Event('error'))`)
 await selected('eden-watching','error')
 await evaluate(`dispatchEvent(new Event('online'))`);await selected('eden-watching')
 await choose('eden-default')
 await evaluate(`${p}.querySelector('.about-wardrobe-art image').dispatchEvent(new Event('error'))`)
 await selected('eden-default','error')
 await evaluate(`dispatchEvent(new Event('online'))`);await selected('eden-default')
 await fresh();await click('#about-jump-interactive-eden');await waitFor(`location.hash==='#interactive-eden'`,'section navigation')
 await click('#about-jump-eden-wardrobe');await waitFor(`location.hash==='#eden-wardrobe'`,'wardrobe nav')
 await evaluate('history.back()');await waitFor(`location.hash==='#interactive-eden'`,'anchor back')
 await evaluate('history.forward()');await waitFor(`location.hash==='#eden-wardrobe'&&${gallery}.getBoundingClientRect().top<innerHeight`,'anchor forward')
 await choose('eden-bazi');await send('Page.reload');await selected('eden-default')
 const exerciseKey='edenos:exercise-avatar:v1'
 assert.equal(await evaluate(`sessionStorage.getItem(${JSON.stringify(exerciseKey)})`),null)
 for(const id of ids)await choose(id)
 assert.equal(await evaluate(`sessionStorage.getItem(${JSON.stringify(exerciseKey)})`),null)
 await navigate('Exercise','/exercise');await waitFor(`document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-swim'`,'first real Exercise entry')
 const saved=await evaluate(`sessionStorage.getItem(${JSON.stringify(exerciseKey)})`)
 await navigate('About Eden','/about');await selected('eden-default')
 for(const id of ids)await choose(id)
 assert.equal(await evaluate(`sessionStorage.getItem(${JSON.stringify(exerciseKey)})`),saved)
 await navigate('Exercise','/exercise');await waitFor(`document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-boxing'`,'second real Exercise entry')
 await navigate('Cosmos','/cosmos');await waitFor(`document.querySelector('#cosmos-ai-tab')`,'Cosmos')
 await click('#cosmos-ai-tab');await waitFor(`document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-ai-explorer'`,'real Cosmos AI')
 await navigate('About Eden','/about');await selected('eden-default');await choose('eden-ziwei')
 await evaluate('history.back()');await waitFor(`document.querySelector('#cosmos-tarot-tab')?.getAttribute('aria-selected')==='true'&&document.querySelector('.eden-avatar-appearance')?.dataset.avatarId==='eden-tarot'`,'Cosmos return follows its own fresh visit')
 await evaluate('history.forward()');await selected('eden-default')
 assert.deepEqual(session.errors,[])
 assert(!session.requests.some(url=>url.includes('/.netlify/functions/')))
 const report={all13InOrder:true,clickCycleAndWrap:true,previousNextAndDirect:true,reselectDoesNotDecode:true,initialImages,initialStaticDecodes:0,actualPointerAndEnterSpace:true,tabFlowAndNoTrap:true,focusStyle,accessibleNamesAndPressed:true,layouts,allWidths200Percent:true,enlargedSelectionHeights,staticOriginalOpenEyes:true,watchingCompleteLandscapeWindow:true,reflectorNativeNoMirror:true,reducedMotionTransparencyForcedColors:true,realModalAndGenesisGuard:true,financeLockedInteractive:true,rapidOldLoadsIgnored:true,networkAndSvgFailuresRecover:true,anchorsReloadAndHistory:true,exerciseCountsIndependent:true,cosmosStateIndependent:true,unmountReentryResets:true,noGlobalAboutAvatar:true,noRealWritesOrPaidCalls:true,errors:session.errors}
 await writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
}catch(error){console.error(JSON.stringify({path:await evaluate('location.href'),preview:await evaluate(`${p}?{...${p}.dataset}:null`),errors:session.errors}));throw error}
finally{await session.close()}
