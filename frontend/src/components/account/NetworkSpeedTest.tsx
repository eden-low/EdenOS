import { useEffect, useRef, useState } from 'react'
import { runNetworkSpeedTest, speedTestDataUsageMb, SpeedTestError, type SpeedPhase, type SpeedResults } from '../../services/networkSpeedTest'
import { Button } from '../ui/button'

const phaseLabel: Record<SpeedPhase, string> = { latency: 'Measuring latency', download: 'Measuring download', upload: 'Measuring upload' }

function display(value: number | undefined, unit: string) {
  return value === undefined ? `-- ${unit}` : `${value.toFixed(1)} ${unit}`
}

export function NetworkSpeedTest() {
  const controllerRef = useRef<AbortController | null>(null)
  const [results, setResults] = useState<SpeedResults>({})
  const [phase, setPhase] = useState<SpeedPhase | null>(null)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => () => { controllerRef.current?.abort(); controllerRef.current = null }, [])

  async function start() {
    if (controllerRef.current) return
    const controller = new AbortController()
    controllerRef.current = controller
    setResults({})
    setRunning(true)
    setMessage('')
    setPhase('latency')
    try {
      await runNetworkSpeedTest(controller.signal, (completed, value) => {
        if (controllerRef.current !== controller) return
        setResults((current) => ({ ...current, [completed === 'latency' ? 'latencyMs' : completed === 'download' ? 'downloadMbps' : 'uploadMbps']: value }))
        setPhase(completed === 'latency' ? 'download' : completed === 'download' ? 'upload' : null)
      })
      if (controllerRef.current === controller) setMessage('Test complete. Results are approximate.')
    } catch (error) {
      if (controllerRef.current !== controller) return
      setMessage(controller.signal.aborted ? 'Test cancelled.' : error instanceof SpeedTestError ? `${error.message} ${error.phase} could not be measured.` : 'The speed test could not be completed.')
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setRunning(false)
        setPhase(null)
      }
    }
  }

  return <details className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-5">
    <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">Network Speed</summary>
    <p className="mt-3 text-sm text-[var(--text-secondary)]">Approximate measurements from this browser to Cloudflare. Starts only when you choose to run it.</p>
    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
      <div><p className="text-[var(--text-muted)]">Download</p><p className="mt-1 font-semibold">{display(results.downloadMbps, 'Mbps')}</p></div>
      <div><p className="text-[var(--text-muted)]">Upload</p><p className="mt-1 font-semibold">{display(results.uploadMbps, 'Mbps')}</p></div>
      <div><p className="text-[var(--text-muted)]">Latency</p><p className="mt-1 font-semibold">{display(results.latencyMs, 'ms')}</p></div>
    </div>
    <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">Uses about {speedTestDataUsageMb} MB of data per completed test. Cloudflare receives test traffic and your IP address. Results stay on this screen and are not saved.</p>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" onClick={() => void start()} disabled={running}>Start Speed Test</Button>
      {running && <Button type="button" variant="ghost" onClick={() => controllerRef.current?.abort()}>Cancel</Button>}
    </div>
    {(running || message) && <p role="status" className="mt-3 text-sm text-[var(--text-secondary)]">{running && phase ? `${phaseLabel[phase]}…` : message}</p>}
  </details>
}
