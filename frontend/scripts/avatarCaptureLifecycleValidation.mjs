// Repeated actual Today triggers across route/unmount boundaries; no writes.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createBrowserSession } from './browserSession.mjs'
import { syntheticRepositorySource } from './avatarSyntheticRepositories.mjs'
const origin='http://127.0.0.1:5181'
const output='artifacts/browser-validation/avatar-part4e-capture-lifecycle'
await mkdir(output,{recursive:true})
const html=await readFile('artifacts/browser-validation/avatar-part4d-cosmos/index.html','utf8')
// Obtain Vite's refresh preamble, not the raw source HTML.
const served=await (await fetch(origin+'/artifacts/browser-validation/avatar-part4d-cosmos/index.html')).text()
assert(html.includes('harness.tsx')&&served.includes('harness.tsx'))
const session=await createBrowserSession(),{send,evaluate,waitFor,click}=session
const trace=[]
let mobile=false
async function navigate(label,path){
 if(mobile){await click('[aria-label="Open apps"]');await waitFor(`document.querySelector('[aria-label="App drawer"]')`,'drawer');await evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`)}
 else await click('.desktop-nav [aria-label="'+label+'"]')
 await waitFor(`location.pathname===${JSON.stringify(path)}&&!document.querySelector('[role="dialog"][data-state="open"]')&&document.body.style.pointerEvents!=='none'`,'navigate '+path)
 await waitFor(path==='/'?`document.querySelector('.today-dashboard')`:`document.querySelector('main h1')`,'page content')
}
try{
 session.onIntercept=async({requestId,request,resourceType})=>{
  const document=resourceType==='Document',body=document?served:syntheticRepositorySource(new URL(request.url).pathname)
  assert(body)
  await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:document?'text/html':'application/javascript'}],body:Buffer.from(body).toString('base64')})
 }
 await send('Fetch.enable',{patterns:[{urlPattern:origin+'/*',resourceType:'Document'},...['firestoreAnimeRepository','firestoreWeeklyReviewRepository','animeDetailService','useGoalAllocations'].map(name=>({urlPattern:'*src/*/'+name+'.ts*'}))]})
 await send('Emulation.setFocusEmulationEnabled',{enabled:true})
 await send('Page.navigate',{url:origin+'/expenses'});await waitFor(`document.querySelector('main h1')`,'initial Expenses')
 for(let index=0;index<30;index++){
  const width=[1440,390,320][index%3];mobile=width<1024
  await send('Emulation.setDeviceMetricsOverride',{width,height:width===1440?1000:844,deviceScaleFactor:1,mobile})
  await navigate(...[['Anime','/anime'],['Cosmos','/cosmos'],['Records','/records']][index%3])
  await navigate('Today','/')
  const trigger=mobile&&index%2?'[aria-label="Capture something"]':'.dashboard-quick-capture'
  await click(trigger)
  await waitFor(`document.querySelector('[data-eden-capture]')`,'Capture DOM '+index)
  await waitFor(`document.querySelector('.eden-avatar')?.dataset.state==='perched'`,'Capture perched '+index)
  trace.push({index,width,trigger,perched:true})
  await click('[role="dialog"][data-state="open"] [aria-label="Close dialog"]')
  await waitFor(`!document.querySelector('[data-eden-capture]')&&document.body.style.pointerEvents!=='none'`,'close '+index)
  // Next route intentionally starts while the old returning timer may be pending.
 }
 assert.deepEqual(session.errors,[])
 await writeFile(output+'/results.json',JSON.stringify({trace,errors:session.errors},null,2))
 console.log(JSON.stringify({cycles:trace.length,threeWidths:true,bothTodayTriggers:true,routeDuringReturn:true,errors:session.errors}))
}catch(error){
 const state=await evaluate(`(()=>{const sheet=document.querySelector('[data-eden-capture]'),a=document.querySelector('.eden-avatar');const simple=v=>v instanceof Element?{element:v.tagName,connected:v.isConnected}:typeof v==='symbol'?String(v):v&&typeof v==='object'?{page:v.page,anchor:v.anchor?{sheet:simple(v.anchor.sheet),owner:String(v.anchor.owner)}:undefined,sheet:v.sheet?simple(v.sheet):undefined,deps:Array.isArray(v.deps)?v.deps.map(d=>typeof d==='function'?d.toString().slice(0,150):typeof d==='symbol'?String(d):d instanceof Element?simple(d):typeof d):undefined}:typeof v==='function'?v.toString().slice(0,150):v;const owners=[];for(let f=sheet?.[Object.keys(sheet??{}).find(k=>k.startsWith('__reactFiber$'))],n=0;f&&n<60;f=f.return,n++){if(['CaptureSheet','AvatarScene'].includes(f.type?.name)){const variants=[];for(const branch of [f,f.alternate]){if(!branch)continue;const hooks=[];for(let h=branch.memoizedState,i=0;h&&i<30;h=h.next,i++)hooks.push(simple(h.memoizedState));variants.push({page:branch.memoizedProps?.page,hooks})}owners.push({name:f.type.name,variants})}}return {avatar:a?{...a.dataset}:null,owners}})()`)
 console.error(JSON.stringify({trace,state,errors:session.errors}));throw error
}finally{await session.close()}
