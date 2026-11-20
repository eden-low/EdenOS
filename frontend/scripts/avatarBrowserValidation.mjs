// Synthetic only: this harness has no Auth provider, Firebase session or write implementation.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:5181'
const output = path.resolve('artifacts/browser-validation/avatar')
await mkdir(output, { recursive: true })
await writeFile(path.join(output, 'index.html'), `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body><div id="root"></div><script type="module" src="/artifacts/browser-validation/avatar/harness.tsx"></script></body></html>`)
// Use the actual Capture and avatar components, with strictly in-memory record context.
await writeFile(path.join(output, 'harness.tsx'), `
import React, {useState} from 'react'
import {createRoot} from 'react-dom/client'
import '/src/index.css'
import {EdenAvatarProvider} from '/src/components/avatar/EdenAvatar'
import {RecordsContext} from '/src/state/recordsContextDefinition'
import {PrivacyLockContext, unlockedPrivacyLock} from '/src/privacy/privacyLockContext'
import {TodayPage} from '/src/pages/TodayPage'
import {MobileNavigation} from '/src/components/layout/Navigation'
import {FirebaseAuthContext} from '/src/state/firebaseAuthContextDefinition'
import {FinancePlanningContext} from '/src/state/financePlanningContextDefinition'
import {AnimeProgressContext} from '/src/state/animeProgressContextDefinition'
import {UserSettingsContext} from '/src/state/userSettingsContextDefinition'
const forbidden = () => { throw Error('Synthetic avatar harness forbids writes') }
function Harness() {
 const [enabled,setEnabled] = useState(true)
 const [locked,setLocked] = useState(false)
 window.avatarHarness = {setEnabled,setLocked}
 return <FirebaseAuthContext.Provider value={{uid:'synthetic-avatar-only',firestore:{},isAnonymous:true,email:null,connectGoogle:forbidden,continueWithExistingGoogle:forbidden,discardExistingGoogleChoice:forbidden,signOutGoogle:forbidden,reviewGuestExit:forbidden}}>
 <FinancePlanningContext.Provider value={{goals:[],budgets:[],status:'loaded'}}><AnimeProgressContext.Provider value={{items:[],cloudError:null}}><UserSettingsContext.Provider value={{settings:{bodyWeightKg:null,heightCm:null,monthlyBudgetSen:null,savingsGoalSen:null},status:'loaded'}}>
 <PrivacyLockContext.Provider value={{...unlockedPrivacyLock,locked}}><RecordsContext.Provider value={{expenses:[],incomes:[],exerciseRecords:[],expenseStatus:'loaded',incomeStatus:'loaded',exerciseStatus:'loaded',retryExpenseSubscription:forbidden,retryIncomeSubscription:forbidden,retryExerciseSubscription:forbidden,drafts:[],discardDraft:forbidden,createExpenseDraft:forbidden,updateExpenseDraft:forbidden,confirmExpenseDraft:forbidden,createExerciseDraft:forbidden,updateExerciseDraft:forbidden,confirmExerciseDraft:forbidden}}>
 <EdenAvatarProvider enabled={enabled}><main style={{paddingBottom:130,paddingTop:52}}><TodayPage onNavigate={forbidden} onOpenCommand={()=>{}} /></main><MobileNavigation activePage="today" onNavigate={forbidden} /></EdenAvatarProvider>
 </RecordsContext.Provider></PrivacyLockContext.Provider></UserSettingsContext.Provider></AnimeProgressContext.Provider></FinancePlanningContext.Provider></FirebaseAuthContext.Provider>
}
createRoot(document.getElementById('root')).render(<React.StrictMode><Harness /></React.StrictMode>)
`)

const profile = await mkdtemp(path.join(os.tmpdir(), 'eden-avatar-'))
const browser = spawn(process.env.CHROME_PATH ?? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-default-apps',
  '--remote-debugging-port=9341', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let socket, nextId = 0
const pending = new Map(), errors = [], results = []
function send(method, params = {}) {
  const id = ++nextId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result?.value
}
async function waitFor(expression, label) {
  for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(50) }
  throw Error(`Timed out: ${label}`)
}
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`) }
async function shot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(path.join(output, name + '.png'), Buffer.from(result.data, 'base64'))
}
const audit = `(() => {
 const a=document.querySelector('.eden-avatar'), s=document.querySelector('[data-eden-capture]'), r=a.getBoundingClientRect(), t=s?.getBoundingClientRect()
 const collision=a.dataset.visible==='true'&&[...document.querySelectorAll('[data-eden-capture] button,[data-eden-capture] input,[data-eden-capture] textarea')].some(e=>{const b=e.getBoundingClientRect();return r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top})
 return {state:a.dataset.state,visible:a.dataset.visible,top:r.top,bottom:r.bottom,sheetTop:t?.top,collision,pointerEvents:getComputedStyle(a).pointerEvents,overflow:document.documentElement.scrollWidth>innerWidth}
})()`
try {
  let page
  for (let i = 0; i < 80; i++) {
    try { page = (await (await fetch('http://127.0.0.1:9341/json/list')).json()).find((p) => p.type === 'page'); if (page) break } catch {}
    await delay(100)
  }
  assert(page, 'Chrome must start')
  socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id)
      if (message.error) item.reject(Error(message.error.message))
      else item.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
    if (message.method === 'Fetch.requestPaused') {
      const isAnime = message.params.request.url.includes('firestoreAnimeRepository')
      const body = isAnime
        ? 'export const createFirestoreAnimeRepository=()=>({fetchPublishedSince:async()=>[],countPublishedSince:async()=>0});'
        : 'export const useGoalAllocations=()=>({allocations:[],status:"loaded"});'
      void send('Fetch.fulfillRequest', {requestId:message.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'}],body:Buffer.from(body).toString('base64')}).catch(e=>errors.push(e.message))
    }
  })
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Network.setBlockedURLs', { urls: ['*googleapis.com*', '*firebaseio.com*', '*firebaseapp.com*', '*/.netlify/functions/*'] })
  await send('Fetch.enable',{patterns:[{urlPattern:'*src/repositories/firestoreAnimeRepository.ts*'},{urlPattern:'*src/state/useGoalAllocations.ts*'}]})
  for (const view of [{width:390,height:844},{width:1440,height:1000},{width:320,height:740}]) {
    await send('Emulation.setDeviceMetricsOverride', {...view, deviceScaleFactor:1, mobile:view.width<768})
    await send('Page.navigate', {url:baseUrl+'/artifacts/browser-validation/avatar/index.html'})
    await waitFor(`document.querySelector('.eden-avatar')?.dataset.visible==='true'`, 'idle avatar')
    await shot(`idle-${view.width}`)
    for (const entry of view.width < 1024 ? ['Mobile Capture','Dashboard Capture'] : ['Dashboard Capture']) {
      await click(entry==='Mobile Capture' ? '[aria-label="Capture something"]' : '.dashboard-quick-capture')
      await waitFor(`document.querySelector('.eden-avatar')?.dataset.state==='perched'`, 'perched state')
      await delay(150)
      let result = await evaluate(audit)
      assert.equal(result.visible,'true'); assert.equal(result.collision,false); assert.equal(result.pointerEvents,'none'); assert.equal(result.overflow,false)
      assert(Math.abs(result.bottom-result.sheetTop-3)<1,'hands must follow sheet edge')
      results.push({view,entry,stage:'perched',...result})
      await shot(`perched-${view.width}-${entry.split(' ')[0]}`)
      await click('[aria-label="Expense Manual"]'); await delay(500)
      result = await evaluate(audit)
      assert.equal(result.collision,false)
      if(result.visible==='true') assert(Math.abs(result.bottom-result.sheetTop-3)<1)
      results.push({view,entry,stage:'taller-form',...result})
      await click('[aria-label="Close dialog"]')
      await waitFor(`document.querySelector('.eden-avatar')?.dataset.state==='idle'`, 'returned home')
    }
  }
  // A short landscape viewport and simulated keyboard leave no safe headroom.
  await send('Emulation.setDeviceMetricsOverride', {width:844,height:390,deviceScaleFactor:1,mobile:true})
  await click('[aria-label="Capture something"]'); await delay(600)
  assert.equal((await evaluate(audit)).visible,'false')
  results.push({stage:'landscape',...await evaluate(audit)})
  await shot('landscape-hidden')
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:320,deviceScaleFactor:1,mobile:true}); await delay(350)
  assert.equal((await evaluate(audit)).visible,'false')
  await click('[aria-label="Close dialog"]'); await delay(400)
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true})
  // Close during the initial reaction, reopen before return completes, then settle.
  await click('.dashboard-quick-capture'); await delay(40)
  await click('[aria-label="Close dialog"]'); await delay(180)
  await click('[aria-label="Capture something"]')
  await waitFor(`document.querySelector('.eden-avatar')?.dataset.state==='perched'`, 'rapid reopen')
  assert.equal((await evaluate(audit)).visible,'true')
  await click('[aria-label="Close dialog"]'); await delay(400)
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]})
  await click('.dashboard-quick-capture')
  await waitFor(`document.querySelector('.eden-avatar')?.dataset.state==='perched'`, 'reduced motion settles')
  assert(await evaluate(`parseFloat(getComputedStyle(document.querySelector('.eden-avatar')).transitionDuration)<=0.00002`), 'reduced motion is effectively immediate')
  await click('[aria-label="Close dialog"]'); await delay(80)
  await evaluate(`window.avatarHarness.setLocked(true)`); await delay(80)
  assert.equal((await evaluate(audit)).visible,'false')
  await evaluate(`window.avatarHarness.setEnabled(false)`)
  await waitFor(`!document.querySelector('.eden-avatar')`, 'avatar removed outside Today')
  assert.deepEqual(errors,[])
  const result = {results,rapidReopen:true,reducedMotion:true,privacyLock:true,todayOnly:true,externalNetworkBlocked:true,errors}
  await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2))
  console.log(JSON.stringify(result,null,2))
} finally {
  socket?.close(); browser.kill()
  // Preserve the diagnostic profile and screenshots for review; no filesystem cleanup risk.
}
