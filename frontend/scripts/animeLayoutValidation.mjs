import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:5173').replace(/\/$/, '')
const outputDirectory = path.resolve(process.argv[3] ?? 'artifacts/anime-layout-refresh')
const port = 9444
const profile = await mkdtemp(path.join(os.tmpdir(), 'edenos-anime-layout-'))
await mkdir(outputDirectory, { recursive: true })
const browser = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--disable-default-apps',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let socket
let nextId = 0
const pending = new Map()
const runtimeErrors = []

async function browserPage() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
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

async function waitFor(expression, label, attempts = 200) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(expression)) return
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function authenticateIfNeeded() {
  await delay(500)
  const hasGuestEntry = await evaluate(`document.body?.innerText.includes('Continue as guest')`)
  if (hasGuestEntry) {
    await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Continue as guest'))?.click()`)
  }
  await waitFor(`document.querySelector('h1')?.textContent?.includes('Anime')`, 'Anime page')
}

async function addLocalProgressWhenPossible() {
  if (await evaluate(`Boolean(document.querySelector('button[aria-label^="Resume "]'))`)) return true
  const title = await evaluate(`document.querySelector('section[aria-label="Featured Anime"] h2')?.textContent?.trim() ?? ''`)
  if (!title || title.includes('will appear here')) return false
  await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.includes('Add Anime'))?.click()`)
  await waitFor(`Boolean(document.querySelector('[role="dialog"] input#tracking-search'))`, 'Add Anime search')
  await evaluate(`(() => {
    const input = document.querySelector('#tracking-search')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, ${JSON.stringify(title)})
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await waitFor(`Array.from(document.querySelectorAll('[role="dialog"] button')).some((button) => button.textContent?.includes(${JSON.stringify(title)}))`, 'catalogue search result')
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find((button) => button.textContent?.includes(${JSON.stringify(title)}))?.click()`)
  await waitFor(`Boolean(document.querySelector('#tracking-episode'))`, 'tracking editor')
  await evaluate(`(() => {
    const input = document.querySelector('#tracking-episode')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, '3')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] button')).find((button) => button.textContent?.trim() === 'Save')?.click()`)
  await waitFor(`Boolean(document.querySelector('button[aria-label^="Resume "]'))`, 'Continue Watching card')
  return true
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
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails?.text ?? 'Runtime exception')
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') runtimeErrors.push(message.params.args.map((item) => item.description ?? item.value).join(' '))
  })
  await send('Page.enable'); await send('Runtime.enable')
  await send('Page.navigate', { url: `${baseUrl}/anime` })
  await waitFor(`document.readyState === 'complete'`, 'direct Anime route')
  await authenticateIfNeeded()
  await waitFor(`Boolean(document.querySelector('section[aria-label="Featured Anime"]'))`, 'featured Anime')
  await delay(1200)
  const progressCreated = await addLocalProgressWhenPossible()
  if (progressCreated) {
    await evaluate(`(() => {
      const key = 'edenos.animeWatchProgress.v1'
      const stored = JSON.parse(localStorage.getItem(key) || '{"version":1,"items":[]}')
      const first = stored.items[0]
      if (!first || stored.items.length > 1) return
      const previews = [
        ['layout-preview-2', 'Dungeon Meshi', 'https://picsum.photos/seed/edenos-anime-1/600/900', 7, 13],
        ['layout-preview-3', 'Violet Evergarden', 'https://picsum.photos/seed/edenos-anime-2/600/900', 8, 14],
        ['layout-preview-4', 'The Apothecary Diaries', 'https://picsum.photos/seed/edenos-anime-3/600/900', 9, 15],
      ]
      stored.items = [first, ...previews.map(([externalId, title, coverUrl, currentEpisode, totalEpisodes], index) => ({
        ...first, externalId, animeId: externalId, title, coverUrl, currentEpisode, totalEpisodes,
        updatedAt: first.updatedAt - ((index + 1) * 1000),
      }))]
      localStorage.setItem(key, JSON.stringify(stored))
    })()`)
  }

  const viewports = [
    { width: 320, height: 900, theme: 'light' },
    { width: 390, height: 900, theme: 'dark' },
    { width: 768, height: 1024, theme: 'light' },
    { width: 1440, height: 1000, theme: 'dark' },
  ]
  const responsive = []
  for (const viewport of viewports) {
    await send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width < 768 })
    await evaluate(`localStorage.setItem('edenos.theme.v1', ${JSON.stringify(viewport.theme)})`)
    await send('Page.navigate', { url: `${baseUrl}/anime` })
    await waitFor(`document.readyState === 'complete'`, `${viewport.width}px direct route`)
    await waitFor(`document.querySelector('h1')?.textContent?.includes('Anime')`, `${viewport.width}px Anime heading`)
    await waitFor(`Boolean(document.querySelector('section[aria-label="Featured Anime"]'))`, `${viewport.width}px featured area`)
    await delay(1200)
    await evaluate(`scrollTo(0, 0)`)
    const audit = await evaluate(`(() => {
      const hero = document.querySelector('section[aria-label="Featured Anime"]')?.getBoundingClientRect()
      const rail = document.querySelector('aside[aria-label="New this week"], aside[aria-label="Latest updates"]')?.getBoundingClientRect()
      const continueRow = document.querySelector('[data-testid="continue-watching-row"]')
      const visible = (element) => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' }
      const undersized = Array.from(document.querySelectorAll('main button, main a, main input, main select')).filter(visible).map((element) => ({ label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 36) || element.tagName, width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) })).filter((item) => item.width < 36 || item.height < 36)
      const images = Array.from(document.images)
      return {
        width: innerWidth,
        theme: document.documentElement.dataset.theme,
        overflow: document.documentElement.scrollWidth > innerWidth,
        hero: hero && { width: Math.round(hero.width), height: Math.round(hero.height), top: Math.round(hero.top) },
        rail: rail && { width: Math.round(rail.width), top: Math.round(rail.top), left: Math.round(rail.left) },
        railBesideHero: Boolean(hero && rail && Math.abs(hero.top - rail.top) < 8 && rail.left > hero.left),
        continueWatching: Boolean(continueRow),
        continueScrollable: Boolean(continueRow && continueRow.scrollWidth > continueRow.clientWidth),
        myListFilters: document.querySelectorAll('[aria-label="My List filters"] button').length,
        catalogueCards: document.querySelectorAll('section[aria-labelledby="anime-catalogue-heading"] button[aria-label^="Open "]').length,
        imageCount: images.length,
        brokenImages: images.filter((image) => image.complete && image.naturalWidth === 0).length,
        undersized,
      }
    })()`)
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const filename = `anime-${viewport.width}-${viewport.theme}.png`
    await writeFile(path.join(outputDirectory, filename), Buffer.from(screenshot.data, 'base64'))
    responsive.push({ ...audit, screenshot: path.join(outputDirectory, filename) })
  }

  const pwa = await evaluate(`(async () => ({ manifest: Boolean(document.querySelector('link[rel="manifest"]')), registrations: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0 }))()`)
  console.log(JSON.stringify({ baseUrl, directRoute: true, progressCreated, responsive, pwa, runtimeErrors }, null, 2))
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
