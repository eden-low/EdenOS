import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createBrowserSession, delay } from './browserSession.mjs'

const origin = 'http://127.0.0.1:5181'
const output = path.resolve('artifacts/browser-validation/about')
await mkdir(output, { recursive: true })
await writeFile(path.join(output, 'index.html'), '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body><div id="root"></div><script type="module" src="/artifacts/browser-validation/about/harness.tsx"></script></body></html>')
// Let Vite add its real React refresh preamble before serving this synthetic document.
await writeFile(path.join(output, 'harness.tsx'), `
import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import '/src/index.css'
import App from '/src/App'
import {RecordsContext} from '/src/state/recordsContextDefinition'
import {PrivacyLockContext,unlockedPrivacyLock} from '/src/privacy/privacyLockContext'
import {FirebaseAuthContext} from '/src/state/firebaseAuthContextDefinition'
import {FinancePlanningContext} from '/src/state/financePlanningContextDefinition'
import {AnimeProgressContext} from '/src/state/animeProgressContextDefinition'
import {UserSettingsContext} from '/src/state/userSettingsContextDefinition'
import {PwaContext} from '/src/pwa/pwaContextDefinition'
import {GenesisBootProvider} from '/src/boot/GenesisBootProvider'
import {useBootAnimation} from '/src/boot/bootContext'
import {bootSessionKey} from '/src/boot/bootStorage'
// Skip the automatic welcome only in this fresh synthetic profile; replay is tested below.
sessionStorage.setItem(bootSessionKey,'seen')
const forbidden=()=>{throw Error('Synthetic About harness forbids account/data writes')}
function BootControls(){window.aboutBoot=useBootAnimation();return null}
function Harness(){const [locked,setLocked]=useState(false);window.aboutHarness={setLocked};return <FirebaseAuthContext.Provider value={{uid:'synthetic-about-only',firestore:{},isAnonymous:false,email:'synthetic@example.invalid',connectGoogle:forbidden,continueWithExistingGoogle:forbidden,discardExistingGoogleChoice:forbidden,signOutGoogle:forbidden,reviewGuestExit:forbidden}}>
<FinancePlanningContext.Provider value={{goals:[],budgets:[],status:'loaded'}}><AnimeProgressContext.Provider value={{items:[],cloudError:null}}><UserSettingsContext.Provider value={{settings:{bodyWeightKg:null,heightCm:null,monthlyBudgetSen:null,savingsGoalSen:null},status:'loaded'}}>
<RecordsContext.Provider value={{expenses:[],incomes:[],exerciseRecords:[],expenseStatus:'loaded',incomeStatus:'loaded',exerciseStatus:'loaded',retryExpenseSubscription:forbidden,retryIncomeSubscription:forbidden,retryExerciseSubscription:forbidden,drafts:[],discardDraft:forbidden,createExpenseDraft:forbidden,updateExpenseDraft:forbidden,confirmExpenseDraft:forbidden,createExerciseDraft:forbidden,updateExerciseDraft:forbidden,confirmExerciseDraft:forbidden}}>
<PwaContext.Provider value={{updateAvailable:false,applyUpdate:forbidden,dismissUpdate:forbidden}}><PrivacyLockContext.Provider value={{...unlockedPrivacyLock,locked}}><GenesisBootProvider ready blocked={locked}><App/><BootControls/></GenesisBootProvider></PrivacyLockContext.Provider></PwaContext.Provider>
</RecordsContext.Provider></UserSettingsContext.Provider></AnimeProgressContext.Provider></FinancePlanningContext.Provider></FirebaseAuthContext.Provider>}
createRoot(document.getElementById('root')).render(<React.StrictMode><Harness/></React.StrictMode>)
`)
// Resolve the HTML only after writing its entry, so Vite cannot point at a stale
// entry timestamp and hot-reexecute createRoot over a live test application.
await delay(250)
const html = await (await fetch(origin + '/artifacts/browser-validation/about/index.html')).text()
const session = await createBrowserSession()
const { send, evaluate, waitFor, click } = session
const stage = 'document.querySelector(".about-avatar-stage")'
const button = (name) => `Array.from(document.querySelectorAll('.about-gesture-button')).find(b=>b.textContent.trim()===${JSON.stringify(name)})`
const aboutReady = `document.querySelector('h1')?.textContent==='About Eden'`
const results = []
let designMarkup = ''
try {
  session.onIntercept = async ({ requestId, request }) => {
    let body, mime
    if (new URL(request.url).pathname === '/' || new URL(request.url).pathname.startsWith('/about')) { body = html; mime = 'text/html' }
    else {
      body = request.url.includes('firestoreAnimeRepository')
        ? 'export const createFirestoreAnimeRepository=()=>({fetchPublishedSince:async()=>[],countPublishedSince:async()=>0});'
        : 'export const useGoalAllocations=()=>({allocations:[],status:"loaded"});'
      mime = 'application/javascript'
    }
    await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: mime }], body: Buffer.from(body).toString('base64') })
  }
  await send('Fetch.enable', { patterns: [
    { urlPattern: origin + '/', resourceType: 'Document' }, { urlPattern: origin + '/about*', resourceType: 'Document' },
    { urlPattern: '*src/repositories/firestoreAnimeRepository.ts*' }, { urlPattern: '*src/state/useGoalAllocations.ts*' },
  ] })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  await send('Page.navigate', { url: origin + '/' })
  await waitFor(`document.querySelector('.today-dashboard')`, 'Today before About')
  assert(!session.requests.some((url) => url.includes('/src/pages/AboutPage.tsx')), 'About must stay lazy on Today')
  await click('.desktop-nav [aria-label="About Eden"]')
  await waitFor(aboutReady, 'desktop navigation')
  assert.equal(await evaluate('location.pathname'), '/about')
  await waitFor('!document.querySelector(".eden-avatar")', 'Today avatar unmounts on About')
  await evaluate('history.back()')
  await waitFor(`document.querySelector('.today-dashboard')`, 'browser back')
  assert.equal(await evaluate('location.pathname'), '/')
  await evaluate('history.forward()')
  await waitFor(aboutReady, 'browser forward')
  await evaluate('window.aboutReloadMarker=true')
  await send('Page.reload')
  await waitFor('!window.aboutReloadMarker', 'new reload document')
  await waitFor(aboutReady, 'direct About reload')
  results.push({ stage: 'desktop-navigation-history-reload', passed: true, lazyOnToday: true })

  const protocol = await (await fetch(`http://127.0.0.1:${session.port}/json/protocol`)).json()
  const safeAreaSupported = protocol.domains.find((domain) => domain.domain === 'Emulation').commands.some((command) => command.name === 'setSafeAreaInsets')
  for (const view of [
    { width: 390, height: 844, theme: 'dark', scale: 1, insets: { top: 47, bottom: 34, left: 0, right: 0 } },
    { width: 320, height: 740, theme: 'dark', scale: 1, insets: {} },
    { width: 844, height: 390, theme: 'dark', scale: 1, insets: { left: 47, right: 47, bottom: 21 } },
    { width: 1440, height: 1000, theme: 'dark', scale: 1, insets: {} },
    { width: 1440, height: 390, theme: 'dark', scale: 1, insets: {} },
    { width: 390, height: 844, theme: 'light', scale: 2, insets: { top: 47, bottom: 34 } },
    { width: 1440, height: 1000, theme: 'light', scale: 1, insets: {} },
  ]) {
    await send('Emulation.setDeviceMetricsOverride', { width: view.width, height: view.height, deviceScaleFactor: 1, mobile: view.width < 1024 })
    if (safeAreaSupported) await send('Emulation.setSafeAreaInsets', { insets: view.insets })
    await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(view.theme)};document.documentElement.style.fontSize=${JSON.stringify(view.scale * 100 + '%')};window.scrollTo(0,0)`)
    await delay(100)
    const audit = await evaluate(`(() => {const page=document.querySelector('.about-page'),style=getComputedStyle(page);return {overflow:document.documentElement.scrollWidth>innerWidth,sections:document.querySelectorAll('.about-section').length,heroLoaded:document.querySelector('.about-hero img').complete,avatarCount:document.querySelectorAll('.eden-avatar').length,leftPadding:parseFloat(style.paddingLeft),rightPadding:parseFloat(style.paddingRight),buttons:[...document.querySelectorAll('.about-gesture-button')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))}})()`)
    assert.equal(audit.overflow, false); assert.equal(audit.avatarCount, 0); assert(audit.heroLoaded)
    assert(audit.buttons.every((rect) => rect.w >= 44 && rect.h >= 44))
    if (safeAreaSupported) { assert(audit.leftPadding >= (view.insets.left ?? 0)); assert(audit.rightPadding >= (view.insets.right ?? 0)) }
    results.push({ stage: 'responsive', view, safeAreaSupported, ...audit })
    if (view.width === 1440 && view.height === 1000 && view.theme === 'dark') designMarkup = await evaluate(`document.querySelector('.about-page').outerHTML`)
    await session.shot(path.join(output, `about-${view.width}-${view.height}-${view.theme}-${view.scale}.png`))
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  if (safeAreaSupported) await send('Emulation.setSafeAreaInsets', { insets: { top: 47, bottom: 34 } })
  await evaluate(`document.documentElement.dataset.theme='dark';document.documentElement.style.fontSize='100%'`)
  await click('[aria-label="Open apps"]')
  await waitFor(`document.querySelector('[role="dialog"]')`, 'mobile Apps Drawer')
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent==='Today').click()`)
  await waitFor(`document.querySelector('.today-dashboard')`, 'mobile Today')
  await click('[aria-label="Open apps"]')
  await evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent==='About Eden').click()`)
  await waitFor(aboutReady, 'mobile About')
  await waitFor(`!document.querySelector('[role="dialog"]')`, 'drawer closes')
  assert.equal(await evaluate('location.pathname'), '/about')
  await send('Page.navigate', { url: origin + '/about#interactive-eden' })
  await waitFor(aboutReady, 'section deep link')
  await waitFor(`${stage}?.getBoundingClientRect().top<innerHeight`, 'deep link scrolls after lazy mount')
  assert.equal(await evaluate(`Boolean(document.querySelector('.genesis-boot-screen'))`), false)

  for (const action of ['Smile', 'Think', 'Wave']) {
    await evaluate(`${button(action)}.click()`)
    await waitFor(`${stage}.dataset.action===${JSON.stringify(action.toLowerCase())}`, action)
    if (action === 'Wave') {
      await delay(210)
      const first = await evaluate(`${stage}.dataset.cell`)
      await delay(180)
      const second = await evaluate(`${stage}.dataset.cell`)
      assert.notEqual(first, second, 'Wave must change purpose-made arm frames')
    }
    await session.shot(path.join(output, action.toLowerCase() + '.png'))
    await waitFor(`${stage}.dataset.action==='idle'`, action + ' returns idle')
  }
  await evaluate(`${button('Wave')}.focus()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await waitFor(`${stage}.dataset.action==='wave'`, 'Enter activates Wave')
  await evaluate(`${button('Think')}.focus()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ', unmodifiedText: ' ' })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
  await waitFor(`${stage}.dataset.action==='think'`, 'Space activates Think')
  assert(await evaluate(`${button('Think')}.matches(':focus-visible')`))
  assert(await evaluate(`parseFloat(getComputedStyle(${button('Think')}).outlineWidth)>=3`))
  await evaluate(`${button('Smile')}.click();${button('Wave')}.click();${button('Think')}.click()`)
  assert.equal(await evaluate(`${stage}.dataset.action`), 'think')
  await waitFor(`${stage}.dataset.action==='idle'`, 'rapid gestures settle')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await evaluate(`${button('Wave')}.click()`); await delay(500)
  assert.equal(await evaluate(`${stage}.dataset.cell`), '3')
  await waitFor(`${stage}.dataset.action==='idle'`, 'reduced gesture settles')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await evaluate(`${button('Wave')}.click();window.aboutHarness.setLocked(true)`)
  await waitFor(`${button('Wave')}.disabled`, 'Privacy Lock pauses gestures')
  assert.equal(await evaluate(`${stage}.dataset.action`), 'idle')
  await evaluate('window.aboutHarness.setLocked(false)')
  await waitFor(`!${button('Wave')}.disabled`, 'unlock restores controls')
  await evaluate('window.aboutBoot.replay()')
  await waitFor(`document.querySelector('.genesis-boot-screen')`, 'real Genesis replay')
  await waitFor(`${button('Wave')}.disabled`, 'Genesis pauses gestures')
  await click('.genesis-skip')
  await waitFor(`!document.querySelector('.genesis-boot-screen')`, 'Genesis Skip')
  await waitFor(`!${button('Wave')}.disabled`, 'post-Genesis controls')
  assert.equal(await evaluate('document.querySelectorAll(".eden-avatar").length'), 0)
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  await evaluate(`${button('Wave')}.click()`)
  await waitFor(`${stage}.dataset.action==='wave'`, 'loaded About gesture works offline')
  await waitFor(`${stage}.dataset.action==='idle'`, 'offline gesture returns idle')
  assert.deepEqual(session.errors, [])
  const report = { results, threeDedicatedGestures: true, keyboardEnterSpace: true, focusVisible: true, rapidRepeat: true, reducedMotion: true, privacyLock: true, realGenesisReplayAndSkip: true, noTodayAvatarOnAbout: true, loadedGestureOffline: true, externalNetworkBlocked: true, errors: session.errors }
  await writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  console.error(JSON.stringify({ page: await evaluate('document.body?.innerText'), errors: session.errors }))
  throw error
} finally { await session.close() }
if (designMarkup) await writeFile(path.join(output, 'about-dom.html'), designMarkup)
