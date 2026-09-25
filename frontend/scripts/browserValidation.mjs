import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const port = 9333
const profile = await mkdtemp(path.join(os.tmpdir(), 'edenos-browser-validation-'))
const outputDirectory = path.resolve('artifacts/browser-validation')
await mkdir(outputDirectory, { recursive: true })
const browser = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-default-apps',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let socket
let nextId = 0
const pending = new Map()
const errors = []

async function browserPage() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = pages.find((candidate) => candidate.type === 'page')
      if (page) return page
    } catch { /* Chrome is still starting. */ }
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

async function waitFor(expression, label, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(expression)) return
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function navigate(url, expectedText) {
  await send('Page.navigate', { url })
  await waitFor(`document.readyState === 'complete'`, `${url} load`)
  try { await waitFor(`document.querySelector('h1')?.textContent?.includes(${JSON.stringify(expectedText)})`, `${url} content`) }
  catch (error) { console.error(`Route failure ${url}: ${await evaluate(`document.body?.innerText ?? ''`)}\nErrors: ${errors.join(' | ')}`); throw error }
  return evaluate(`({ url: location.pathname, overflow: document.documentElement.scrollWidth > innerWidth, heading: document.querySelector('h1')?.textContent?.trim() })`)
}

try {
  const page = await browserPage()
  socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id); pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails?.text ?? 'Runtime exception')
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map((item) => item.description ?? item.value).join(' '))
  })
  await send('Page.enable'); await send('Runtime.enable')
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await waitFor(`document.readyState === 'complete'`, 'initial load')
  await delay(1000)
  const initialText = await evaluate(`document.body?.innerText ?? ''`)
  if (!initialText.includes('Continue as guest')) console.error(`Initial page: ${initialText}\nErrors: ${errors.join(' | ')}`)
  await waitFor(`document.body?.innerText.includes('Continue as guest')`, 'Guest entry')
  await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Continue as guest'))?.click()`)
  await waitFor(`document.body?.innerText.includes('Here is what matters today.')`, 'authenticated Home', 200)

  const viewports = [
    { width: 320, height: 900, theme: 'light' },
    { width: 390, height: 900, theme: 'dark' },
    { width: 768, height: 1024, theme: 'light' },
    { width: 1440, height: 1000, theme: 'dark' },
  ]
  const responsive = []
  for (const viewport of viewports) {
    await send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 768 })
    await evaluate(`localStorage.setItem('edenos.theme.v1', '${viewport.theme}'); location.reload()`)
    await waitFor(`document.body?.innerText.includes('Here is what matters today.')`, `${viewport.width}px Home`)
    const audit = await evaluate(`(() => {
      const visible = (element) => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' }
      const undersized = Array.from(document.querySelectorAll('button, a, input, select, textarea')).filter(visible).map((element) => ({ label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 40) || element.tagName, height: Math.round(element.getBoundingClientRect().height), width: Math.round(element.getBoundingClientRect().width) })).filter((item) => item.height < 36 || item.width < 36)
      return { width: innerWidth, theme: document.documentElement.dataset.theme, overflow: document.documentElement.scrollWidth > innerWidth, sections: document.querySelectorAll('[data-dashboard-section]').length, undersized }
    })()`)
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const filename = `home-${viewport.width}-${viewport.theme}.png`
    await writeFile(path.join(outputDirectory, filename), Buffer.from(image.data, 'base64'))
    responsive.push({ ...audit, screenshot: filename })
  }

  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, modifiers: 2 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'k', code: 'KeyK', windowsVirtualKeyCode: 75, modifiers: 2 })
  await waitFor(`document.body?.innerText.includes('Command EdenOS')`, 'Ctrl+K command palette')
  const commandKeyboard = await evaluate(`Boolean(document.querySelector('[role="dialog"]'))`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })

  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await waitFor(`document.body?.innerText.includes('Here is what matters today.')`, 'Home before dashboard edit')
  await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Edit Dashboard'))?.click()`)
  await waitFor(`document.body?.innerText.includes('Reset to default')`, 'Dashboard edit mode')
  const dashboardEdit = await evaluate(`({ moveControls: document.querySelectorAll('button[aria-label^="Move "]').length, hideControls: document.querySelectorAll('button[aria-label^="Hide "]').length })`)

  const routes = []
  for (const [route, heading] of [['/expenses', 'Expenses'], ['/exercise', 'Exercise'], ['/anime', 'Anime'], ['/records', 'Records'], ['/weekly-review', 'Weekly Review']]) {
    routes.push(await navigate(`http://127.0.0.1:5173${route}`, heading))
  }

  console.log(JSON.stringify({ responsive, commandKeyboard, dashboardEdit, routes, runtimeErrors: errors }, null, 2))
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close()
  browser.kill()
  if (browser.exitCode === null) await Promise.race([new Promise((resolve) => browser.once('exit', resolve)), delay(3000)])
  const resolvedProfile = path.resolve(profile)
  if (resolvedProfile.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try { await rm(resolvedProfile, { recursive: true, force: true }); break } catch { await delay(300) }
    }
  }
}
