export interface PublicBuildInfo {
  schema: 1
  sha: string
}

declare const __EDENOS_STAGING_BUILD__: PublicBuildInfo | null

export const stagingBuildInfo: PublicBuildInfo | null =
  typeof __EDENOS_STAGING_BUILD__ === 'undefined' ? null : __EDENOS_STAGING_BUILD__

export async function readServerBuild(signal: AbortSignal): Promise<PublicBuildInfo> {
  // Not a navigation request, not precached by Workbox. No cookies/auth headers.
  const response = await fetch('/staging-build.json', {
    cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' }, signal,
  })
  if (!response.ok || response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    throw new Error('Server build is unavailable.')
  }
  const text = await response.text()
  if (text.length > 1024) throw new Error('Unexpected build response.')
  const value: unknown = JSON.parse(text)
  if (!value || typeof value !== 'object' || !('schema' in value) || value.schema !== 1 ||
    !('sha' in value) || typeof value.sha !== 'string' || !/^[a-f0-9]{40}$/.test(value.sha)) {
    throw new Error('Invalid build metadata.')
  }
  return { schema: 1, sha: value.sha }
}

function withAbort<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Inspection aborted', 'AbortError'))
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
    task.then(value => { signal.removeEventListener('abort', abort); resolve(value) },
      error => { signal.removeEventListener('abort', abort); reject(error) })
  })
}

export async function readWorkerState(signal?: AbortSignal): Promise<string> {
  if (!('serviceWorker' in navigator)) return 'Not supported'
  const inspection = navigator.serviceWorker.getRegistration()
  const registration = await (signal ? withAbort(inspection, signal) : inspection)
  if (!registration) return 'No registration'
  return `${navigator.serviceWorker.controller ? 'Controlled' : 'Not controlled'} · active: ${registration.active?.state ?? 'none'} · waiting: ${registration.waiting?.state ?? 'none'} · installing: ${registration.installing?.state ?? 'none'}`
}

function scriptName(url: string | undefined): string {
  try { return new URL(url ?? '', location.href).pathname.split('/').pop() || 'Unknown' } catch { return 'Unknown' }
}

export function entryScriptName(): string {
  return scriptName(document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src)
}

export const diagnosticsModuleName = scriptName(import.meta.url)
