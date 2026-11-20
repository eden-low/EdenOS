// Fresh diagnostic Chrome profile. No interaction with the owner's browser/account.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function createBrowserSession(port = 0) {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'edenos-about-'))
  const browser = spawn(process.env.CHROME_PATH ?? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--disable-gpu', '--no-first-run', '--disable-default-apps',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' })
  let page
  let actualPort = port
  for (let i = 0; i < 80; i++) {
    try {
      if (!actualPort) actualPort = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0])
      page = (await (await fetch(`http://127.0.0.1:${actualPort}/json/list`)).json()).find((p) => p.type === 'page'); if (page) break
    } catch {}
    await delay(100)
  }
  if (!page) { browser.kill(); throw Error('Diagnostic Chrome did not start') }
  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map(), errors = [], requests = []
  const session = { errors, requests, port: actualPort, onIntercept: null }
  const send = (method, params = {}) => {
    const requestId = ++id; socket.send(JSON.stringify({ id: requestId, method, params }))
    return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }))
  }
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id)
      if (message.error) item.reject(Error(message.error.message)); else item.resolve(message.result)
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url)
    if (message.method === 'Fetch.requestPaused') void session.onIntercept?.(message.params).catch((error) => errors.push(error.message))
  })
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
    return result.result?.value
  }
  const waitFor = async (expression, label) => {
    for (let i = 0; i < 150; i++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(50) }
    throw Error(`Timed out: ${label}`)
  }
  Object.assign(session, { send, evaluate, waitFor,
    click: async (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`),
    shot: async (file, full = false) => {
      const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full })
      await writeFile(file, Buffer.from(result.data, 'base64'))
    },
    close: async () => {
      await Promise.race([send('Browser.close').catch(() => undefined), delay(1500)])
      socket.close(); browser.kill()
    },
  })
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Network.setBlockedURLs', { urls: ['*googleapis.com*', '*firebaseio.com*', '*firebaseapp.com*', '*/.netlify/functions/*'] })
  assert(socket.readyState === WebSocket.OPEN)
  return session
}
