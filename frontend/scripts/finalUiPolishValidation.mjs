import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:4173').replace(/\/$/, '')
const outputDirectory = path.resolve(process.argv[3] ?? 'artifacts/final-ui-polish')
const seed = process.argv.includes('--seed')
const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const port = 9555
const profile = await mkdtemp(path.join(os.tmpdir(), 'edenos-final-polish-'))
await mkdir(outputDirectory, { recursive: true })
const browser = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-default-apps', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let socket
let nextId = 0
const pending = new Map()
const runtimeErrors = []

async function browserPage() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = pages.find((candidate) => candidate.type === 'page')
      if (page) return page
    } catch { /* Chrome is starting. */ }
    await delay(100)
  }
  throw new Error('Chrome DevTools did not become ready')
}

function send(method, params = {}) {
  const id = ++nextId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result?.value
}

async function waitFor(expression, label, attempts = 300) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(expression)) return
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function clickButton(label) {
  const clicked = await evaluate(`(() => { const visible = (element) => element.getBoundingClientRect().height > 0 && getComputedStyle(element).visibility !== 'hidden'; const button = Array.from(document.querySelectorAll('button')).find((item) => visible(item) && (item.textContent?.trim() === ${JSON.stringify(label)} || item.getAttribute('aria-label') === ${JSON.stringify(label)})); button?.click(); return Boolean(button) })()`)
  if (!clicked) throw new Error(`Visible button not found: ${label}`)
}

async function setControl(label, value, selector = 'input, select, textarea') {
  const changed = await evaluate(`(() => { const labels = Array.from(document.querySelectorAll('label')); const owner = labels.find((item) => item.textContent?.includes(${JSON.stringify(label)}) && item.getBoundingClientRect().height > 0); const linked = owner?.getAttribute('for') ? document.getElementById(owner.getAttribute('for')) : null; const control = linked?.matches(${JSON.stringify(selector)}) ? linked : owner?.matches(${JSON.stringify(selector)}) ? owner : owner?.querySelector(${JSON.stringify(selector)}); if (!control) return false; const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control), 'value'); descriptor?.set?.call(control, ${JSON.stringify(value)}); control.dispatchEvent(new Event('input', { bubbles: true })); control.dispatchEvent(new Event('change', { bubbles: true })); return true })()`)
  if (!changed) throw new Error(`Control not found: ${label}`)
}

async function signIn() {
  await send('Page.navigate', { url: `${baseUrl}/` })
  await waitFor(`document.readyState === 'complete'`, 'initial page')
  await waitFor(`document.body?.innerText.includes('Continue as guest') || document.body?.innerText.includes('Here is what matters today.')`, 'authentication or Home')
  if (await evaluate(`document.body?.innerText.includes('Continue as guest')`)) {
    await clickButton('Continue as guest')
    await waitFor(`document.body?.innerText.includes('Here is what matters today.')`, 'authenticated Home')
  }
}

async function seedRepresentativeData() {
  await send('Page.navigate', { url: `${baseUrl}/expenses` })
  await waitFor(`document.querySelector('h1')?.textContent?.includes('Finance')`, 'Finance')
  await clickButton('Add Income'); await waitFor(`document.body?.innerText.includes('Add income')`, 'income dialog')
  await setControl('Amount', '6000'); await setControl('Source / description', 'UI Polish Salary'); await clickButton('Add income')
  await waitFor(`!document.querySelector('[role="dialog"]')`, 'income saved')
  await clickButton('Add Expense'); await waitFor(`document.body?.innerText.includes('Add expense')`, 'expense dialog')
  await setControl('Amount', '18.50'); await setControl('Merchant / title', 'UI Polish Lunch'); await setControl('Category', 'food', 'select'); await clickButton('Add expense')
  await waitFor(`!document.querySelector('[role="dialog"]')`, 'expense saved')

  await send('Page.navigate', { url: `${baseUrl}/exercise` })
  await waitFor(`document.querySelector('h1')?.textContent?.includes('Exercise')`, 'Exercise')
  await clickButton('Capture workout'); await waitFor(`Boolean(document.querySelector('[role="dialog"]'))`, 'capture dialog'); await clickButton('Exercise Text')
  await setControl('What exercise did you do?', 'Badminton 30 min', 'textarea')
  await clickButton('Continue'); await waitFor(`document.body?.innerText.includes('Review exercise')`, 'exercise review')
  await clickButton('Confirm exercise'); await waitFor(`!document.querySelector('[role="dialog"]')`, 'exercise saved')
}

const pages = [
  { slug: 'home', path: '/', ready: `document.body?.innerText.includes('Here is what matters today.')` },
  { slug: 'exercise', path: '/exercise', ready: `document.querySelector('h1')?.textContent?.includes('Exercise')` },
  { slug: 'weekly-review', path: '/weekly-review', ready: `document.querySelector('h1')?.textContent?.includes('Weekly Review')` },
  { slug: 'records', path: '/records', ready: `document.querySelector('h1')?.textContent?.includes('Records')` },
]
const viewports = [
  { width: 320, height: 900, theme: 'light' },
  { width: 390, height: 900, theme: 'dark' },
  { width: 768, height: 1024, theme: 'light' },
  { width: 1440, height: 1000, theme: 'dark' },
]

try {
  const page = await browserPage()
  socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) { const request = pending.get(message.id); pending.delete(message.id); if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result) }
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails?.text ?? 'Runtime exception')
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') runtimeErrors.push(message.params.args.map((item) => item.description ?? item.value).join(' '))
  })
  await send('Page.enable'); await send('Runtime.enable')
  await signIn()
  if (seed) await seedRepresentativeData()

  const responsive = []
  for (const target of pages) {
    for (const viewport of viewports) {
      await send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 768 })
      await evaluate(`localStorage.setItem('edenos.theme.v1', '${viewport.theme}')`)
      await send('Page.navigate', { url: `${baseUrl}${target.path}` })
      await waitFor(`document.readyState === 'complete'`, `${target.slug} load`)
      await waitFor(target.ready, `${target.slug} content`)
      await delay(250)
      const audit = await evaluate(`(() => { const visible = (element) => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' }; const undersized = Array.from(document.querySelectorAll('button, a, input, select, textarea')).filter(visible).map((element) => ({ label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 36) || element.tagName, width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) })).filter((item) => item.width < 36 || item.height < 36); return { page: ${JSON.stringify(target.slug)}, width: innerWidth, theme: document.documentElement.dataset.theme, path: location.pathname, overflow: document.documentElement.scrollWidth > innerWidth, mainOverflow: document.querySelector('main') ? document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth : null, undersized } })()`)
      const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
      const filename = `${target.slug}-${viewport.width}-${viewport.theme}.png`
      await writeFile(path.join(outputDirectory, filename), Buffer.from(image.data, 'base64'))
      responsive.push({ ...audit, screenshot: filename })
    }
  }

  const pwa = await evaluate(`(async () => ({ manifest: Boolean(document.querySelector('link[rel="manifest"]')), registrations: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0 }))()`)
  console.log(JSON.stringify({ baseUrl, seed, responsive, pwa, runtimeErrors }, null, 2))
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close()
  browser.kill()
  if (browser.exitCode === null) await Promise.race([new Promise((resolve) => browser.once('exit', resolve)), delay(3000)])
  const resolvedProfile = path.resolve(profile)
  if (resolvedProfile.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
    for (let attempt = 0; attempt < 5; attempt += 1) { try { await rm(resolvedProfile, { recursive: true, force: true }); break } catch { await delay(300) } }
  }
}
