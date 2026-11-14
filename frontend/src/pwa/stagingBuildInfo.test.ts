import { afterEach, describe, expect, it, vi } from 'vitest'
import { entryScriptName, readServerBuild, readWorkerState, stagingBuildInfo } from './stagingBuildInfo'

const sha = 'a'.repeat(40)
const reply = (data: unknown, type = 'application/json', status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': type } })
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.head.querySelectorAll('script').forEach(s => s.remove()) })

describe('read-only staging version inspection', () => {
  it('does not enable diagnostics without trusted build injection', () => {
    expect(stagingBuildInfo).toBeNull()
  })
  it('requests public build data without cookies, authorization or HTTP-cache reuse', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ schema: 1, sha, ignored: 'not displayed' }))
    vi.stubGlobal('fetch', fetcher)
    const signal = new AbortController().signal
    expect(await readServerBuild(signal)).toEqual({ schema: 1, sha })
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('/staging-build.json', {
      cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' }, signal,
    })
  })
  it.each([null, [], {}, { schema: 2, sha }, { schema: 1, sha: 'old' }, { schema: 1, sha: 'z'.repeat(40) }])('rejects unverifiable server data: %j', async (value) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(value)))
    await expect(readServerBuild(new AbortController().signal)).rejects.toThrow()
  })
  it.each([reply({ schema: 1, sha }, 'text/html'), reply({}, 'application/json', 503), new Response('<html>old app shell</html>', { headers: { 'content-type': 'application/json' } }), reply({ schema: 1, sha, extra: 'x'.repeat(1024) })])('rejects error, cached app-shell and oversized responses', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    await expect(readServerBuild(new AbortController().signal)).rejects.toThrow()
  })
  it('distinguishes HTML entry scripts by actual filename without reading user storage', () => {
    const script = document.createElement('script'); script.type = 'module'; script.src = '/assets/index-Di1JxO66.js'; document.head.appendChild(script)
    expect(entryScriptName()).toBe('index-Di1JxO66.js')
    script.src = '/assets/index-DHDo_Ako.js'; expect(entryScriptName()).toBe('index-DHDo_Ako.js')
  })
  it('reports a missing worker without registering, updating or removing one', async () => {
    const register = vi.fn(), getRegistration = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration, register } })
    expect(await readWorkerState()).toBe('No registration')
    expect(register).not.toHaveBeenCalled()
  })
  it('reads controlled/active/waiting states without activating the waiting worker', async () => {
    const update = vi.fn(), unregister = vi.fn(), postMessage = vi.fn()
    vi.stubGlobal('navigator', { serviceWorker: { controller: {}, getRegistration: vi.fn().mockResolvedValue({ active: { state: 'activated' }, waiting: { state: 'installed', postMessage }, update, unregister }) } })
    expect(await readWorkerState()).toBe('Controlled · active: activated · waiting: installed · installing: none')
    expect(update).not.toHaveBeenCalled(); expect(unregister).not.toHaveBeenCalled(); expect(postMessage).not.toHaveBeenCalled()
  })
  it('tolerates browsers without service workers', async () => {
    vi.stubGlobal('navigator', {})
    expect(await readWorkerState()).toBe('Not supported')
  })
  it('bounds a stalled Safari worker inspection by the same abort signal', async () => {
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration: vi.fn(() => new Promise(() => {})) } })
    const controller = new AbortController(), inspection = readWorkerState(controller.signal)
    controller.abort()
    await expect(inspection).rejects.toMatchObject({ name: 'AbortError' })
  })
})
