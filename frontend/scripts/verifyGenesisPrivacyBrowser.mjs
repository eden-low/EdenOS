// Synthetic startup only. No real Firebase initialization, identity, data or network.
// Build first. Optionally set EDENOS_AUDIT_PLAYWRIGHT_MODULE to an installed module.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx/package.json'))('esbuild')
const { chromium } = await import(process.env.EDENOS_AUDIT_PLAYWRIGHT_MODULE
  ? pathToFileURL(resolve(process.env.EDENOS_AUDIT_PLAYWRIGHT_MODULE)).href : 'playwright')
const css = readFileSync(join(root, 'dist', readFileSync(join(root, 'dist/index.html'), 'utf8')
  .match(/href="([^"]+\.css)"/)[1].replace(/^\//, '')), 'utf8')
const fixture = `
import React,{StrictMode} from 'react'; import {createRoot} from 'react-dom/client';
import {GenesisBoot} from './src/boot/GenesisBoot';
import {GenesisLaunchProvider} from './src/boot/GenesisLaunchProvider';
import {GenesisLaunchSession} from './src/boot/genesisLaunchSession';
import {bootPreferenceKey} from './src/boot/bootStorage';
import {useBootAnimation} from './src/boot/bootContext';
import {FirebaseAuthProvider} from './src/state/FirebaseAuthProvider';
import {PrivacyLockProvider} from './src/privacy/PrivacyLockProvider';
import {usePrivacyLock} from './src/privacy/usePrivacyLock';
import {createPrivacyLockRecord,privacyLockStorageKey} from './src/privacy/privacyLock';
import {FinancialAmount} from './src/components/privacy/FinancialAmount';
import {PwaContext} from './src/pwa/pwaContextDefinition';
const mode=window.__fixtureMode;
window.__audit={authCalls:0,leaks:0,dataStatus:'loaded',update:false};
const audit=window.__audit;
if(mode!=='disabled')localStorage.setItem(privacyLockStorageKey,JSON.stringify(await createPrivacyLockRecord('123456')));
if(mode==='preference')localStorage.setItem(bootPreferenceKey,'off');
const launch=new GenesisLaunchSession({home:mode!=='deep',navigation:mode==='reload'?'reload':'navigate',marker:'new',historyLength:1,sameOriginReferrer:false,opener:false,standalone:true,discarded:false});
function Values(){
 const privacy=usePrivacyLock(),boot=useBootAnimation(); audit.privacy=privacy;
 return <><output id="lock">{privacy.locked?'locked':'unlocked'}</output><output id="replay">{String(boot.canReplay)}</output><FinancialAmount amountSen={987654} exact /></>;
}
const app=createRoot(document.getElementById('root'));
function render(){app.render(<StrictMode><PwaContext.Provider value={{updateAvailable:audit.update,applyUpdate:async()=>{},dismissUpdate:()=>{}}}>
 <GenesisLaunchProvider session={launch}><FirebaseAuthProvider><PrivacyLockProvider><GenesisBoot><Values/></GenesisBoot></PrivacyLockProvider></FirebaseAuthProvider></GenesisLaunchProvider>
 </PwaContext.Provider></StrictMode>)};
audit.restore=()=>audit.observer.next({uid:mode==='guest'?'synthetic-guest':'synthetic-google',isAnonymous:mode==='guest',email:null});
audit.interrupt=async kind=>{
 if(kind==='request')audit.privacy.requestUnlock();
 else if(kind==='direct')await audit.privacy.unlock('wrong');
 else if(kind==='lock')audit.privacy.lock();
 else if(kind==='data')audit.dataStatus='error';
 else if(kind==='update')audit.update=true;
 else if(kind==='auth')audit.observer.error(Error('synthetic auth failure'));
 else window.dispatchEvent(new Event(kind));
 render();
};
new MutationObserver(()=>{
 const sequence=document.querySelector('.genesis-boot-screen');
 if(sequence&&audit.startedAt===undefined)audit.startedAt=Date.now();
 if(document.getElementById('lock')?.textContent==='locked'&&document.getElementById('root').textContent.includes('9,876.54'))audit.leaks++;
}).observe(document.body,{childList:true,subtree:true,characterData:true});
render();
`
const modules = {
  firebase: `export const firebaseInitialization={status:'ready',services:{auth:{},firestore:{}}}`,
  firebaseAuthService: `export function createFirebaseAuthService(){const forbidden=async()=>{window.__audit.authCalls++;throw Error('Real authentication forbidden')};return {observe:async observer=>{window.__audit.observer=observer;return ()=>{}},continueAnonymously:forbidden,signInWithGoogle:forbidden,linkGoogle:forbidden,continueWithExistingGoogle:forbidden,signOutGoogle:forbidden,signOutGuest:forbidden,hasPendingGoogleConflict:()=>false,discardConflictingGoogleCredential:()=>{}}}`,
  useRecords: `export const useRecords=()=>({expenseStatus:window.__audit.dataStatus,incomeStatus:'loaded',exerciseStatus:'loaded',drafts:[]})`,
  useUserSettings: `export const useUserSettings=()=>({status:'loaded'})`,
}
const bundle = await build({ stdin: { contents: fixture, resolveDir: root, sourcefile: 'genesis-privacy-fixture.tsx', loader: 'tsx' },
  bundle: true, write: false, format: 'esm', jsx: 'automatic', outdir: 'unused',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'synthetic-only', setup(plugin) {
    plugin.onResolve({ filter: /\/(firebase|firebaseAuthService|useRecords|useUserSettings)$/ }, args => ({ path: args.path.split('/').at(-1), namespace: 'synthetic' }))
    plugin.onLoad({ filter: /.*/, namespace: 'synthetic' }, args => ({ contents: modules[args.path], loader: 'js' }))
  } }],
})
const js = bundle.outputFiles.find(file => file.path.endsWith('.js')).text
const browser = await chromium.launch({ headless: true, channel: process.env.EDENOS_AUDIT_BROWSER_CHANNEL })
const results = []
const artifacts = join(root, 'artifacts/browser-validation/genesis-privacy')
mkdirSync(artifacts, { recursive: true })
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 960 }]) {
    for (const mode of ['disabled', 'google', 'guest', 'skip', 'request', 'direct', 'lock', 'data', 'update', 'auth', 'pagehide', 'popstate', 'deep', 'reload', 'reduced', 'preference']) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' })
      let requests = 0
      const errors = []
      await context.route('**/*', route => {
        if (route.request().isNavigationRequest() && new URL(route.request().url()).origin === 'https://genesis.invalid') {
          return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style><div id="root"></div><script>window.__fixtureMode=' + JSON.stringify(mode) + '</script><script type="module">' + js + '</script>' })
        }
        requests++; return route.abort()
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      await page.clock.install({ time: new Date('2026-11-18T00:00:00Z') })
      await page.clock.pauseAt(new Date('2026-11-18T00:00:01Z'))
      await page.goto('https://genesis.invalid/' + (mode === 'deep' ? 'expenses?review=synthetic' : ''))
      await page.waitForFunction(() => !!window.__audit?.observer)
      await page.clock.runFor(100)
      const noBoot = async () => assert.equal(await page.locator('.genesis-boot-screen').count(), 0, mode)
      const masked = async () => {
        assert.equal(await page.locator('#lock').textContent(), 'locked', mode)
        assert.equal(await page.locator('#replay').textContent(), 'false', 'Locked replay remains disabled')
        assert.equal(await page.locator('#root').textContent().then(text => text.includes('9,876.54')), false, 'No underlying plaintext')
      }
      const at = async elapsed => {
        const delta = await page.evaluate(ms => window.__audit.startedAt + ms - Date.now(), elapsed)
        if (delta > 0) await page.clock.runFor(delta)
      }
      if (['deep', 'reload', 'reduced', 'preference'].includes(mode)) {
        await page.evaluate(() => window.__audit.restore()); await page.clock.runFor(10000); await noBoot(); await masked()
      } else {
        assert.equal(await page.locator('.genesis-boot-screen').count(), 1, mode)
        await at(1000); await page.evaluate(() => window.__audit.restore()); await page.clock.runFor(1)
        if (mode !== 'disabled') await masked()
        assert.equal(await page.locator('.genesis-boot-screen').count(), 1, 'Restoration must not dismiss')
        if (['disabled', 'google', 'guest'].includes(mode)) {
          for (const [elapsed, stage] of [[1300, 'core'], [3300, 'ready'], [4900, 'welcome'], [6900, 'enter'], [7999, 'enter']]) {
            await at(elapsed)
            assert.equal(await page.evaluate(() => document.querySelector('.genesis-boot-screen')?.getAttribute('data-stage')), stage, mode + ':' + elapsed)
            if (mode !== 'disabled') await masked()
          }
          if (viewport.width === 390 && mode === 'google') await page.screenshot({ path: join(artifacts, 'locked-enter-mobile.png') })
          await at(8001); await noBoot()
        } else if (mode === 'skip') {
          await page.getByRole('button', { name: 'Skip' }).click(); await noBoot()
        } else {
          await page.evaluate(kind => window.__audit.interrupt(kind), mode); await noBoot()
          if (mode === 'request') {
            const dialog = page.getByRole('dialog', { name: 'Unlock financial values' })
            assert.equal(await dialog.count(), 1)
            await dialog.getByLabel('PIN').fill('654321'); await dialog.getByRole('button', { name: 'Unlock', exact: true }).click()
            await page.getByRole('alert').waitFor(); await masked()
            await dialog.getByLabel('PIN').fill('123456'); await dialog.getByRole('button', { name: 'Unlock', exact: true }).click()
            await page.waitForFunction(() => document.getElementById('lock').textContent === 'unlocked')
          }
        }
        if (!['disabled', 'auth', 'request'].includes(mode)) await masked()
        await page.evaluate(() => { window.dispatchEvent(new Event('pageshow')); document.dispatchEvent(new Event('visibilitychange')) })
        await page.clock.runFor(10000); await noBoot()
      }
      assert.deepEqual(await page.evaluate(() => ({ authCalls: window.__audit.authCalls, leaks: window.__audit.leaks })), { authCalls: 0, leaks: 0 })
      assert.equal(requests, 0); assert.deepEqual(errors, [])
      results.push({ viewport, mode, passed: true })
      await context.close()
    }
  }
  const report = { scenarios: results.length, results, scope: 'Chromium synthetic identities, actual Genesis/Lock/FinancialAmount and built CSS; no real iPhone or authentication' }
  writeFileSync(join(artifacts, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ scenarios: results.length, passed: results.length, authCalls: 0, leaks: 0, unexpectedRequests: 0 }))
} finally { await browser.close() }
