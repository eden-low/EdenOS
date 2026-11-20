// Actual App in Strict Mode, isolated identities/repositories and fresh Chrome.
// Run avatarRouteBrowserValidation.mjs first to create its safe provider fixture.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createBrowserSession, delay } from './browserSession.mjs'
import { syntheticRepositorySource } from './avatarSyntheticRepositories.mjs'

const origin = 'http://127.0.0.1:5181'
const key = 'edenos:exercise-avatar:v1'
const output = path.resolve('artifacts/browser-validation/avatar-part4c-entry')
await mkdir(output, { recursive: true })
let harness = await readFile('artifacts/browser-validation/avatar-part4c-exercise/harness.tsx', 'utf8')
harness = harness.replace('.render(<Harness/>)', '.render(<React.StrictMode><Harness/></React.StrictMode>)')
assert(harness.includes('.render(<React.StrictMode><Harness/></React.StrictMode>)'))
await writeFile(path.join(output, 'harness.tsx'), harness)
await writeFile(path.join(output, 'index.html'), '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><div id="root"></div><script type="module" src="/artifacts/browser-validation/avatar-part4c-entry/harness.tsx"></script></body></html>')
await delay(200)
const html = await (await fetch(origin + '/artifacts/browser-validation/avatar-part4c-entry/index.html')).text()
const session = await createBrowserSession()
const trace = [], paused = []
let holdImages = false, failImages = false, total = 0, writes = 0
const avatar = `document.querySelector('.eden-avatar')`
const appearance = `${avatar}?.querySelector('.eden-avatar-appearance')`
const snapshot = `(()=>{const a=${avatar},p=${appearance};return {id:p?.dataset.avatarId,requested:p?.dataset.avatarRequested,asset:p?.dataset.assetState,state:a?.dataset.state,visible:a?.dataset.visible,sheet:a?.hasAttribute('data-sheet'),writes:window.exerciseSessionWrites}})()`
const instrumentation = `(()=>{const key=${JSON.stringify(key)},get=Storage.prototype.getItem,set=Storage.prototype.setItem;window.exerciseSessionWrites=0;window.exerciseStorageBlocked=false;Storage.prototype.getItem=function(k){if(k===key&&window.exerciseStorageBlocked)throw new Error('Synthetic blocked storage');return get.call(this,k)};Storage.prototype.setItem=function(k,v){if(k===key){if(window.exerciseStorageBlocked)throw new Error('Synthetic blocked storage');window.exerciseSessionWrites++}return set.call(this,k,v)}})()`

async function setup(client) {
  client.onIntercept = async ({ requestId, request, resourceType }) => {
    const url = new URL(request.url)
    if (resourceType === 'Image') {
      if (failImages) return client.send('Fetch.failRequest', { requestId, errorReason: 'Failed' })
      if (holdImages) { paused.push({ client, requestId, url: request.url }); return }
      return client.send('Fetch.continueRequest', { requestId })
    }
    const document = resourceType === 'Document'
    const body = document ? html : syntheticRepositorySource(url.pathname)
    assert(body, 'Only explicit synthetic modules may be intercepted')
    await client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: document ? 'text/html' : 'application/javascript' }], body: Buffer.from(body).toString('base64') })
  }
  await client.send('Page.enable'); await client.send('Runtime.enable'); await client.send('Network.enable')
  await client.send('Network.setBlockedURLs', { urls: ['*googleapis.com*', '*firebaseio.com*', '*firebaseapp.com*', '*/.netlify/functions/*'] })
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: instrumentation })
  await client.send('Fetch.enable', { patterns: [
    { urlPattern: origin + '/*', resourceType: 'Document' },
    ...['firestoreAnimeRepository', 'firestoreWeeklyReviewRepository', 'animeDetailService', 'useGoalAllocations'].map(name => ({ urlPattern: '*src/*/' + name + '.ts*' })),
    { urlPattern: '*eden-swim-static.webp*', resourceType: 'Image' }, { urlPattern: '*eden-boxing-static.webp*', resourceType: 'Image' },
  ] })
  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true })
}
async function navigate(label, pathname) {
  await session.click('[aria-label="Open apps"]')
  await session.waitFor(`document.querySelector('[aria-label="App drawer"]')`, 'Apps drawer')
  await session.evaluate(`Array.from(document.querySelectorAll('[aria-label="App drawer"] button')).find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`)
  await session.waitFor(`location.pathname===${JSON.stringify(pathname)}&&!document.querySelector('[role="dialog"][data-state="open"]')`, 'navigate ' + label)
  // Radix restores focus after its close animation. Do not bypass that physical
  // input shield with a programmatic click on a different dialog trigger.
  await session.waitFor(`document.body.style.pointerEvents!=='none'`, 'drawer input shield removed')
  await delay(120)
}
async function entered(label, { fresh = false, failure = false, loading = false } = {}) {
  const form = ++total % 2 ? 'eden-swim' : 'eden-boxing'
  if (fresh) writes = 0
  writes++
  await session.waitFor(`document.querySelector('main h1')?.textContent==='Exercise'&&${appearance}?.dataset.avatarRequested===${JSON.stringify(form)}&&${appearance}?.dataset.assetState===${JSON.stringify(failure ? 'error' : loading ? 'loading' : 'ready')}`, label)
  await session.waitFor(`${avatar}.dataset.visible==='true'`, 'safe Exercise position')
  const state = await session.evaluate(snapshot)
  assert.equal(state.id, failure || loading ? 'eden-default' : form)
  assert.equal(state.writes, writes, 'one committed entry must write exactly once')
  assert.equal(state.state, 'idle'); assert.equal(state.sheet, false)
  trace.push({ label, form, writes, asset: state.asset })
  return form
}
async function unchanged(before) {
  await delay(100)
  assert.deepEqual(await session.evaluate(snapshot), before)
}
async function reload(label, options = {}) {
  await session.evaluate('window.exerciseReloadMarker=true')
  await session.send('Page.reload'); await delay(150)
  await session.waitFor('!window.exerciseReloadMarker', 'new document')
  return entered(label, { fresh: true, ...options })
}
async function release(request) {
  try { await request.client.send('Fetch.continueRequest', { requestId: request.requestId }) }
  catch (error) { assert.match(error.message, /invalid|interception|request|cancel/i) }
}
// Attach only to new pages in this disposable test profile, never the owner's tabs.
async function attach(page) {
  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map(), errors = []
  const client = { errors, onIntercept: null }
  client.send = (method, params = {}) => {
    const number = ++id; socket.send(JSON.stringify({ id: number, method, params }))
    return new Promise((resolve, reject) => pending.set(number, { resolve, reject }))
  }
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data), item = pending.get(message.id)
    if (item) { pending.delete(message.id); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result) }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
    if (message.method === 'Fetch.requestPaused') void client.onIntercept?.(message.params).catch(error => errors.push(error.message))
  })
  client.evaluate = async (expression) => {
    const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result?.value
  }
  client.waitFor = async (expression, label) => {
    for (let i = 0; i < 150; i++) { if (await client.evaluate(`Boolean(${expression})`)) return; await delay(50) }
    throw new Error('Timed out: ' + label)
  }
  client.close = () => socket.close()
  return client
}
try {
  await setup(session)
  await session.send('Page.navigate', { url: origin + '/exercise' }); await delay(150)
  await entered('first direct Exercise, Strict Mode', { fresh: true })
  const before = await session.evaluate(snapshot)
  await session.evaluate(`window.exerciseImageBefore=${avatar}.querySelector('img');window.scrollTo(0,9999);for(const event of [new PageTransitionEvent('pageshow',{persisted:true}),new PageTransitionEvent('pageshow',{persisted:false}),new PopStateEvent('popstate'),new HashChangeEvent('hashchange')])dispatchEvent(event);document.dispatchEvent(new Event('visibilitychange'))`)
  for (const locked of [true, false, true, false]) { await session.evaluate(`window.aboutHarness.setLocked(${locked})`); await delay(50) }
  await session.send('Page.setWebLifecycleState', { state: 'frozen' })
  await session.send('Page.setWebLifecycleState', { state: 'active' })
  await session.send('Page.bringToFront')
  await navigate('Exercise', '/exercise') // selected navigation does not enter again
  await session.evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Capture workout').click()`)
  await session.waitFor(`document.querySelector('[role="dialog"][data-state="open"]')&&${avatar}.dataset.visible==='false'`, 'Capture protects avatar')
  await session.click('[role="dialog"][data-state="open"] [aria-label="Close dialog"]')
  await session.waitFor(`!document.querySelector('[role="dialog"][data-state="open"]')&&${avatar}.dataset.visible==='true'`, 'Capture restores same outfit')
  await unchanged(before)
  assert(await session.evaluate(`window.exerciseImageBefore===${avatar}.querySelector('img')`))
  for (let index = 2; index <= 12; index++) {
    const outside = index % 3 ? ['Records', '/records'] : ['Expenses', '/expenses']
    await navigate(...outside); await navigate('Exercise', '/exercise'); await entered('SPA entry ' + index)
  }
  await navigate('Records', '/records')
  await session.evaluate('history.back()'); await entered('history back enters Exercise')
  await session.evaluate('history.forward()'); await session.waitFor(`location.pathname==='/records'`, 'history forward leaves Exercise')
  await session.evaluate('history.back()'); await entered('history back reenters Exercise')
  await reload('refresh consumes once')
  await session.send('Page.navigate', { url: origin + '/exercise' }); await delay(150)
  await entered('same-tab direct address consumes once', { fresh: true })
  await session.send('Network.setCacheDisabled', { cacheDisabled: true })
  await session.send('Network.clearBrowserCache')
  await session.send('Page.navigate', { url: origin + '/records' }); await delay(150)
  await session.waitFor(`document.querySelector('main h1')?.textContent==='Records'`, 'fresh document before slow loads')
  writes = 0; holdImages = true
  await navigate('Exercise', '/exercise'); const first = await entered('first delayed form', { loading: true })
  await session.waitFor('true', 'delayed image interception'); await delay(100)
  await navigate('Records', '/records'); await navigate('Exercise', '/exercise')
  const second = await entered('rapid reentry with old load pending', { loading: true })
  for (let i = 0; i < 100 && paused.length < 2; i++) await delay(50)
  assert(paused.length >= 2, 'Both delayed image requests must be observed')
  holdImages = false
  for (const request of paused.filter(p => p.url.includes(second))) await release(request)
  await session.waitFor(`${appearance}.dataset.avatarId===${JSON.stringify(second)}`, 'latest material ready')
  for (const request of paused.filter(p => p.url.includes(first))) await release(request)
  await delay(100)
  assert.equal((await session.evaluate(snapshot)).id, second)
  assert.equal((await session.evaluate(snapshot)).writes, writes)
  failImages = true
  await reload('failed material keeps entry parity', { failure: true })
  await reload('other failed material keeps entry parity', { failure: true })
  failImages = false
  await navigate('Records', '/records'); await navigate('Exercise', '/exercise'); await entered('failure recovery uses next real entry')
  await session.evaluate(`sessionStorage.setItem(${JSON.stringify(key)},'broken');window.exerciseSessionWrites=0`)
  total = 0; writes = 0
  await navigate('Records', '/records'); await navigate('Exercise', '/exercise'); await entered('corrupt state repairs to Swim')
  await navigate('Records', '/records'); await navigate('Exercise', '/exercise'); await entered('repaired state alternates to Boxing')
  await session.evaluate('window.exerciseStorageBlocked=true')
  for (let i = 0; i < 2; i++) {
    await navigate('Records', '/records'); await navigate('Exercise', '/exercise')
    await session.waitFor(`${appearance}?.dataset.avatarId==='eden-swim'`, 'unavailable storage safely uses Swim')
    assert.equal((await session.evaluate(snapshot)).writes, writes)
  }
  await session.evaluate(`window.exerciseStorageBlocked=false;sessionStorage.setItem(${JSON.stringify(key)},'broken');window.exerciseSessionWrites=0`)
  total = 0; writes = 0
  await navigate('Records', '/records'); await navigate('Exercise', '/exercise'); await entered('known Swim before opening child')
  const parentSaved = await session.evaluate(`sessionStorage.getItem(${JSON.stringify(key)})`)
  const existing = new Set((await (await fetch(`http://127.0.0.1:${session.port}/json/list`)).json()).map(p => p.id))
  await session.send('Runtime.evaluate', { expression: "window.exerciseChild=window.open('about:blank','_blank')", userGesture: true })
  let childPage
  for (let i = 0; i < 100 && !childPage; i++) { childPage = (await (await fetch(`http://127.0.0.1:${session.port}/json/list`)).json()).find(p => p.type === 'page' && !existing.has(p.id)); if (!childPage) await delay(50) }
  assert(childPage, 'A separate child tab must open')
  const child = await attach(childPage)
  try {
    assert.equal(await child.evaluate(`sessionStorage.getItem(${JSON.stringify(key)})`), parentSaved, 'test must exercise an actual opener storage copy')
    await setup(child)
    await child.send('Page.navigate', { url: origin + '/exercise' }); await delay(150)
    await child.waitFor(`${appearance}?.dataset.avatarId==='eden-swim'`, 'new child starts Swim despite copied next Boxing')
    assert.equal((await child.evaluate(snapshot)).writes, 1)
    await child.send('Page.reload'); await delay(150)
    await child.waitFor(`${appearance}?.dataset.avatarId==='eden-boxing'`, 'child reload alternates independently')
    assert.equal((await child.evaluate(snapshot)).writes, 1)
    assert.equal(await session.evaluate(`sessionStorage.getItem(${JSON.stringify(key)})`), parentSaved)
    assert.equal((await session.evaluate(snapshot)).id, 'eden-swim')
    assert.deepEqual(child.errors, [])
  } finally { await session.send('Target.closeTarget', { targetId: childPage.id }); child.close() }
  await session.send('Page.bringToFront')
  await navigate('Records', '/records'); await navigate('Exercise', '/exercise'); await entered('parent still has its own next Boxing')
  await session.shot(path.join(output, 'Boxing-390.png'))
  await navigate('Records', '/records'); await navigate('Exercise', '/exercise'); await entered('parent next Swim')
  await session.shot(path.join(output, 'Swim-390.png'))
  assert.deepEqual(session.errors, [])
  const report = { trace, strictModeExactlyOneWrite:true, twelveAlternatingEntries:true, duplicateEventsAndSelectedNavigationIgnored:true, freezeAndResumeStable:true, captureAndLockDoNotConsume:true, refreshAndDirectAddress:true, historyBackForward:true, lateOldLoadCannotWin:true, bothImageFailuresDoNotConsumeExtra:true, corruptAndBlockedStorageSafe:true, actualOpenerCopyStartsSwim:true, twoTabsIndependent:true, noLiveWritesOrPaidCalls:true, errors:session.errors }
  await writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) { console.error(JSON.stringify({ page: await session.evaluate('document.body.innerText'),snapshot:await session.evaluate(snapshot),dialogs:await session.evaluate(`Array.from(document.querySelectorAll('[role="dialog"]')).map(d=>({state:d.dataset.state,label:d.getAttribute('aria-label')}))`),visibility:await session.evaluate('document.visibilityState'), errors:session.errors })); throw error }
finally { await session.close() }
