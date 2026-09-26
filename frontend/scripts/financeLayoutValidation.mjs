import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:5173').replace(/\/$/, '')
const outputDirectory = path.resolve(process.argv[3] ?? 'artifacts/finance-layout-refresh')
const seed = process.argv.includes('--seed')
const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
const port = 9444
const profile = await mkdtemp(path.join(os.tmpdir(), 'edenos-finance-layout-'))
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

async function waitFor(expression, label, attempts = 200) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(expression)) return
    await delay(100)
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function clickButton(label) {
  const clicked = await evaluate(`(() => {
    const visible = (element) => element.getBoundingClientRect().height > 0 && getComputedStyle(element).visibility !== 'hidden'
    const button = Array.from(document.querySelectorAll('button')).find((item) => visible(item) && item.textContent?.trim() === ${JSON.stringify(label)})
    button?.click()
    return Boolean(button)
  })()`)
  if (!clicked) throw new Error(`Visible button not found: ${label}`)
}

async function setControl(label, value, selector = 'input, select, textarea') {
  const changed = await evaluate(`(() => {
    const labels = Array.from(document.querySelectorAll('label'))
    const owner = labels.find((item) => item.textContent?.includes(${JSON.stringify(label)}) && item.getBoundingClientRect().height > 0)
    const linked = owner?.getAttribute('for') ? document.getElementById(owner.getAttribute('for')) : null
    const control = linked?.matches(${JSON.stringify(selector)}) ? linked : owner?.matches(${JSON.stringify(selector)}) ? owner : owner?.querySelector(${JSON.stringify(selector)})
    if (!control) return false
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control), 'value')
    descriptor?.set?.call(control, ${JSON.stringify(value)})
    control.dispatchEvent(new Event('input', { bubbles: true }))
    control.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  })()`)
  if (!changed) throw new Error(`Control not found: ${label}`)
}

async function signInAndOpenFinance() {
  await send('Page.navigate', { url: `${baseUrl}/expenses` })
  await waitFor(`document.readyState === 'complete'`, 'initial page')
  await waitFor(`document.body?.innerText.includes('Continue as guest') || document.querySelector('h1')?.textContent?.includes('Finance')`, 'authentication or Finance', 300)
  if (await evaluate(`document.body?.innerText.includes('Continue as guest')`)) {
    await clickButton('Continue as guest')
    await waitFor(`Boolean(document.querySelector('h1')) || document.body?.innerText.includes('Here is what matters today.')`, 'authenticated application', 300)
    await send('Page.navigate', { url: `${baseUrl}/expenses` })
  }
  await waitFor(`document.querySelector('h1')?.textContent?.includes('Finance')`, 'Finance page', 300)
  try {
    await waitFor(`document.querySelectorAll('[data-finance-kpi]').length === 4`, 'Finance dashboard', 300)
  } catch (error) {
    console.error(await evaluate(`document.body?.innerText ?? ''`))
    console.error(runtimeErrors.join('\n'))
    throw error
  }
}

async function addIncome(amount, description) {
  await clickButton('Add Income')
  await waitFor(`document.body?.innerText.includes('Add income')`, 'income dialog')
  await setControl('Amount', amount)
  await setControl('Source / description', description)
  await clickButton('Add income')
  await waitFor(`!document.querySelector('[role="dialog"]')`, `${description} saved`, 300)
}

async function addExpense(amount, title, category) {
  await clickButton('Add Expense')
  await waitFor(`document.body?.innerText.includes('Add expense')`, 'expense dialog')
  await setControl('Amount', amount)
  await setControl('Merchant / title', title)
  await setControl('Category', category, 'select')
  await clickButton('Add expense')
  await waitFor(`!document.querySelector('[role="dialog"]')`, `${title} saved`, 300)
}

async function addGoal(name, target, initial) {
  await clickButton('Add goal')
  await waitFor(`document.body?.innerText.includes('Create goal')`, 'goal dialog')
  await setControl('Name', name)
  await setControl('Target amount', target)
  await setControl('Already saved', initial)
  await clickButton('Save goal')
  await waitFor(`!document.querySelector('[role="dialog"]')`, `${name} goal saved`, 300)
}

async function addBudget(name, amount, category) {
  await clickButton('Add pot')
  await waitFor(`document.body?.innerText.includes('Create budget pot')`, 'budget dialog')
  await setControl('Name', name)
  await setControl('Monthly amount', amount)
  await setControl('Expense category', category, 'select')
  await clickButton('Save budget')
  await waitFor(`!document.querySelector('[role="dialog"]')`, `${name} budget saved`, 300)
}

async function seedRepresentativeFinanceData() {
  if (await evaluate(`document.body?.innerText.includes('Salary') && document.body?.innerText.includes('Phone')`)) return
  await addIncome('6000', 'Salary')
  await addExpense('1200', 'Groceries', 'food')
  await addExpense('600', 'PETRONAS', 'transport')
  await addExpense('300', 'Netflix', 'entertainment')
  await evaluate(`document.querySelector('#finance-planning-management')?.scrollIntoView({ block: 'start' })`)
  await addGoal('Phone', '5200', '2800')
  await addGoal('Emergency Fund', '10000', '6500')
  await clickButton('Allocate')
  await waitFor(`document.body?.innerText.includes('Allocate to Phone')`, 'allocation dialog')
  await setControl('Amount', '1300')
  await clickButton('Confirm allocation')
  await waitFor(`!document.querySelector('[role="dialog"]')`, 'allocation saved', 300)
  await clickButton('Configure Budget')
  await setControl('Budget amount', '3500')
  await clickButton('Save Budget')
  await waitFor(`!document.querySelector('[role="dialog"]')`, 'overall budget saved', 300)
  await addBudget('Food', '1000', 'food')
  await addBudget('Transport', '600', 'transport')
  await addBudget('Others', '500', 'other')
  await send('Page.navigate', { url: `${baseUrl}/expenses` })
  await waitFor(`document.body?.innerText.includes('RM 2,600')`, 'derived available money', 300)
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
  await signInAndOpenFinance()
  if (seed) await seedRepresentativeFinanceData()

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
    await waitFor(`document.querySelector('h1')?.textContent?.includes('Finance')`, `${viewport.width}px Finance`, 300)
    await waitFor(`document.querySelectorAll('[data-finance-kpi]').length === 4`, `${viewport.width}px KPI cards`, 300)
    if (seed) await waitFor(`document.querySelector('[data-finance-kpi="Available Money"]')?.textContent?.includes('RM 2,600')`, `${viewport.width}px allocation summary`, 300)
    const audit = await evaluate(`(() => {
      const dashboard = document.querySelector('main')
      const cards = Array.from(document.querySelectorAll('[data-finance-kpi]'))
      const labels = cards.map((card) => card.getAttribute('data-finance-kpi'))
      const visible = (element) => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' }
      const undersized = Array.from(document.querySelectorAll('button, a, input, select')).filter(visible).map((element) => ({ label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 40) || element.tagName, width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) })).filter((item) => item.width < 36 || item.height < 36)
      return {
        width: innerWidth,
        theme: document.documentElement.dataset.theme,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
        mainOverflow: dashboard ? dashboard.scrollWidth > dashboard.clientWidth : null,
        kpis: labels,
        kpiColumns: new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top))).size,
        monthlyOverview: Boolean(document.querySelector('#cashflow-title')),
        expenseBreakdown: Boolean(document.querySelector('#activity-title')),
        recentTransactions: Boolean(document.querySelector('#recent-transactions-heading')),
        goalsAndBudgets: Boolean(document.querySelector('#goal-budget-summary-heading')),
        monthStory: Boolean(document.querySelector('#month-story-heading')),
        chartWidth: Math.round(document.querySelector('#cashflow-title')?.closest('section')?.getBoundingClientRect().width ?? 0),
        undersized,
      }
    })()`)
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const filename = `finance-${viewport.width}-${viewport.theme}.png`
    await writeFile(path.join(outputDirectory, filename), Buffer.from(image.data, 'base64'))
    responsive.push({ ...audit, screenshot: filename })
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${baseUrl}/expenses` })
  await waitFor(`document.querySelector('h1')?.textContent?.includes('Finance')`, 'direct Finance refresh', 300)
  if (seed) await waitFor(`document.querySelector('[data-finance-kpi="Available Money"]')?.textContent?.includes('RM 2,600')`, 'direct Finance allocation summary', 300)
  const directRoute = await evaluate(`({ path: location.pathname, heading: document.querySelector('h1')?.textContent?.trim(), overflow: document.documentElement.scrollWidth > innerWidth })`)
  const semantics = await evaluate(`({
    available: document.querySelector('[data-finance-kpi="Available Money"]')?.textContent,
    income: document.querySelector('[data-finance-kpi="Income"]')?.textContent,
    expenses: document.querySelector('[data-finance-kpi="Expenses"]')?.textContent,
    net: document.querySelector('[data-finance-kpi="Net Cashflow"]')?.textContent,
    hasOverspend: document.body.innerText.includes('overspent'),
    goalAllocationIsSeparate: document.body.innerText.includes('Goal allocations') && document.body.innerText.includes('Reserved this month, not an expense'),
  })`)
  const pwa = await evaluate(`(async () => ({ manifest: Boolean(document.querySelector('link[rel="manifest"]')), registrations: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0 }))()`)
  console.log(JSON.stringify({ baseUrl, seed, responsive, directRoute, semantics, pwa, runtimeErrors }, null, 2))
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
