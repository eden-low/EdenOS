// Isolated UI regression. Build first; supply an installed Playwright module via
// EDENOS_AUDIT_PLAYWRIGHT_MODULE when it is not resolvable in this checkout.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
const { chromium } = await import(process.env.EDENOS_AUDIT_PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.EDENOS_AUDIT_PLAYWRIGHT_MODULE)).href : 'playwright')
const cssPath = process.argv[2] ? resolve(process.argv[2]) : join(root, 'dist',
  readFileSync(join(root, 'dist/index.html'), 'utf8').match(/href="([^"]+\.css)"/)[1].replace(/^\//, ''))
const css = readFileSync(cssPath, 'utf8')
const fixture = `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {MobileNavigation,DesktopNavigation} from './src/components/layout/Navigation';
import {AccountDialog} from './src/components/account/AccountDialog';
import {FirebaseAuthContext} from './src/state/firebaseAuthContextDefinition';
import {PrivacyLockContext,unlockedPrivacyLock} from './src/privacy/privacyLockContext';
const mode=new URLSearchParams(location.search).get('mode');
window.__audit={selected:null,authCalls:0};
const forbidden=()=>{window.__audit.authCalls++;throw Error('Real account action is outside this fixture')};
const auth={uid:'synthetic-audit',isAnonymous:true,email:null,firestore:{},connectGoogle:forbidden,
continueWithExistingGoogle:forbidden,signOutGoogle:forbidden,reviewGuestExit:forbidden,discardExistingGoogleChoice:()=>{}};
const privacy={...unlockedPrivacyLock,enabled:mode==='navigation',lock:()=>{window.__audit.selected='locked'}};
createRoot(document.getElementById('root')).render(<FirebaseAuthContext.Provider value={auth}>
<PrivacyLockContext.Provider value={privacy}>{mode==='account'
?<AccountDialog><button>Open Account fixture</button></AccountDialog>
:mode==='desktop'?<DesktopNavigation activePage="today" onNavigate={page=>{window.__audit.selected=page}}/>
:<MobileNavigation activePage="today" onNavigate={page=>{window.__audit.selected=page}}/>}
</PrivacyLockContext.Provider></FirebaseAuthContext.Provider>);
`
const bundle = await build({
  stdin: { contents: fixture, resolveDir: root, sourcefile: 'stability-fixture.tsx', loader: 'tsx' },
  bundle: true, write: false, format: 'esm', jsx: 'automatic', outdir: 'unused',
  define: { __EDENOS_STAGING_BUILD__: 'null', 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'isolate-capture', setup(plugin) {
    plugin.onResolve({ filter: /\/capture\/CaptureSheet$/ }, () => ({ path: 'capture', namespace: 'fixture' }))
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
      contents: 'export const CaptureSheet = ({children}) => children', loader: 'js',
    }))
  } }],
})
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).text
const failures = []
const results = []
let assertions = 0
const check = (condition, scenario, message, actual) => {
  assertions++
  if (!condition) failures.push({ scenario, message, actual })
}
const browser = await chromium.launch({ headless: true })
try {
  for (const [width, height] of [[320, 568], [390, 844], [390, 360], [568, 320], [667, 375], [844, 390], [1440, 960]]) {
    for (const [top, left, bottom] of [[0, 0, 0], [59, 0, 34], [0, 47, 21]]) {
      const scenario = { width, height, top, left, bottom }
      const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' })
      let unexpectedRequests = 0
      const errors = []
      const style = css.replace(/env\(safe-area-inset-top(?:,\s*0px)?\)/g, `${top}px`)
        .replace(/env\(safe-area-inset-left(?:,\s*0px)?\)/g, `${left}px`)
        .replace(/env\(safe-area-inset-bottom(?:,\s*0px)?\)/g, `${bottom}px`)
        .replace(/env\(safe-area-inset-right(?:,\s*0px)?\)/g, '0px')
      await context.route('**/*', route => {
        if (new URL(route.request().url()).origin === 'https://edenos-audit.invalid') {
          return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
            style + '\n*,*::before,*::after{animation:none!important;transition:none!important}</style><div id="root"></div><script type="module">' + js + '</script>' })
        }
        unexpectedRequests++
        return route.abort()
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      await page.goto('https://edenos-audit.invalid/?mode=' + (width >= 1024 ? 'desktop' : 'navigation'))
      if (width >= 1024) {
        check(await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button').count() === 7,
          scenario, 'Desktop destinations remain available')
        await page.getByRole('button', { name: 'Cosmos', exact: true }).click()
        check(await page.evaluate(() => window.__audit.selected) === 'cosmos', scenario, 'Desktop navigation remains interactive')
      } else {
      await page.getByRole('button', { name: 'Open apps', exact: true }).click()
      const drawer = page.getByRole('dialog', { name: 'Apps', exact: true })
      const bounds = await drawer.boundingBox()
      const title = await page.getByRole('heading', { name: 'Apps', exact: true }).boundingBox()
      const close = await page.getByRole('button', { name: 'Close dialog', exact: true }).boundingBox()
      check(Math.abs(bounds.x) < 1, scenario, 'Drawer remains attached to left edge', bounds)
      check(title.y >= top && title.x >= left, scenario, 'Drawer heading clears reported safe areas', title)
      check(close.y >= top, scenario, 'Close control clears reported status area', close)
      await drawer.evaluate(element => { element.scrollTop = element.scrollHeight })
      const last = await drawer.getByRole('button', { name: 'Lock financial values', exact: true }).boundingBox()
      check(last.y >= 0 && last.y + last.height <= height - bottom + 1, scenario,
        'Last drawer action is reachable above bottom safe area after scrolling', last)
      if (last.y >= 0 && last.y + last.height <= height) {
        await drawer.getByRole('button', { name: 'Lock financial values', exact: true }).click()
        check(await page.evaluate(() => window.__audit.selected) === 'locked', scenario, 'Last action remains interactive')
      }
      }
      await page.goto('https://edenos-audit.invalid/?mode=account')
      await page.getByRole('button', { name: 'Open Account fixture', exact: true }).click()
      await page.getByRole('dialog', { name: 'Account', exact: true }).waitFor()
      const privacy = page.getByRole('region', { name: 'Privacy Lock', exact: true })
      await privacy.getByRole('button', { name: 'Enable', exact: true }).click()
      await privacy.getByLabel('New 6-digit PIN', { exact: true }).fill('123456')
      await privacy.getByRole('button', { name: 'Cancel PIN changes', exact: true }).click()
      await privacy.getByRole('button', { name: 'Enable', exact: true }).click()
      check(await privacy.getByLabel('New 6-digit PIN', { exact: true }).inputValue() === '', scenario, 'Cancelled PIN input is cleared')
      check(await page.getByRole('dialog').count() === 1, scenario, 'PIN editor stays within one Account dialog')
      check(await page.evaluate(() => window.__audit.authCalls) === 0, scenario, 'No account operation occurs')
      check(unexpectedRequests === 0 && errors.length === 0, scenario, 'No unexpected network or browser error', { unexpectedRequests, errors })
      results.push(scenario)
      await context.close()
    }
  }
  const report = { scenarios: results.length, assertions, failures, scope: 'Actual UI and built CSS; synthetic contexts, substituted safe-area values; no real iPhone keyboard or authentication' }
  console.log(JSON.stringify(report, null, 2))
  assert.equal(failures.length, 0, 'Stability browser regressions failed')
} finally {
  await browser.close()
}
