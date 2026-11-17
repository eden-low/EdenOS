import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui/button'
import { diagnosticsModuleName, entryScriptName, readServerBuild, readWorkerState, stagingBuildInfo, type PublicBuildInfo } from './stagingBuildInfo'

export function StagingVersionDiagnostics({ disabled = false }: { disabled?: boolean }) {
  if (!stagingBuildInfo) return null
  return <StagingVersionPanel build={stagingBuildInfo} disabled={disabled} />
}

export function StagingVersionPanel({ build, disabled = false }: { build: PublicBuildInfo; disabled?: boolean }) {
  const [entry] = useState(entryScriptName)
  const [checking, setChecking] = useState(false)
  const [serverSha, setServerSha] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [worker, setWorker] = useState('Not checked')
  const request = useRef<{ controller: AbortController; timer: ReturnType<typeof setTimeout> } | null>(null)
  const sequence = useRef(0)
  useEffect(() => () => {
    sequence.current++
    request.current?.controller.abort()
    if (request.current) clearTimeout(request.current.timer)
  }, [])

  async function checkVersion() {
    const id = ++sequence.current
    request.current?.controller.abort()
    if (request.current) clearTimeout(request.current.timer)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    request.current = { controller, timer }
    setChecking(true); setError(false); setServerSha(null)
    try {
      const [server, serviceWorker] = await Promise.allSettled([readServerBuild(controller.signal), readWorkerState(controller.signal)])
      if (sequence.current !== id) return
      setServerSha(server.status === 'fulfilled' ? server.value.sha : null)
      setError(server.status === 'rejected')
      setWorker(serviceWorker.status === 'fulfilled' ? serviceWorker.value : 'Could not inspect')
    } finally {
      clearTimeout(timer)
      if (sequence.current === id) { request.current = null; setChecking(false) }
    }
  }

  return <section className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-5" aria-labelledby="staging-version-heading">
    <h3 id="staging-version-heading" className="section-label">Staging version</h3>
    <dl className="mt-3 space-y-2 text-xs leading-5 text-[var(--text-secondary)]">
      <div><dt>Loaded Build SHA</dt><dd className="break-all font-mono text-[var(--text-primary)]">{build.sha}</dd></div>
    </dl>
    <details className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
      <summary className="cursor-pointer py-2 font-semibold">Script and worker details</summary>
      <dl className="space-y-2">
        <div><dt>HTML entry script</dt><dd className="break-all font-mono">{entry}</dd></div>
        <div><dt>Running diagnostics module</dt><dd className="break-all font-mono">{diagnosticsModuleName}</dd></div>
        <div><dt>Service worker state</dt><dd className="break-words">{worker}</dd></div>
      </dl>
      <p className="mt-2">Worker state alone does not identify its build.</p>
      <p className="mt-1">For an update notice, close Account. Keep your Guest session and site data; a copied UID is not a recovery credential.</p>
    </details>
    <Button type="button" variant="secondary" className="mt-3 w-full" disabled={disabled || checking} onClick={() => void checkVersion()}>
      {checking ? 'Checking version…' : 'Check server version'}
    </Button>
    <div aria-live="polite" className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
      {serverSha && <><p>Server Build SHA</p><p className="break-all font-mono">{serverSha}</p><p className="mt-1 font-semibold">{serverSha === build.sha ? 'Loaded build matches the server.' : 'A different build is on the server. This page is still running the loaded build above.'}</p></>}
      {error && <p>Could not verify the server build. Your current session is unchanged.</p>}
      <p className="mt-2">This check reads public version and worker state only. It does not apply an update or reload.</p>
    </div>
  </section>
}
