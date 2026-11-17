import { useBootAnimation } from './bootContext'
import { Button } from '../components/ui/button'
import { RotateCcw } from 'lucide-react'

export function GenesisBootSettings({ onReplay, replayDisabled = false }: { onReplay?: () => void; replayDisabled?: boolean }) {
  const boot = useBootAnimation()
  if (!boot) return null
  return <section className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-5" aria-labelledby="boot-animation-heading">
    <h3 id="boot-animation-heading" className="section-label">Welcome experience</h3>
    <div className="mt-1 flex flex-wrap items-center gap-x-3">
    <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
      <span>Show Boot Animation</span>
      <input type="checkbox" role="switch" checked={boot.enabled} onChange={(event) => boot.setEnabled(event.target.checked)} aria-describedby="boot-animation-description" className="size-5 shrink-0 accent-[var(--accent-primary)]" />
    </label>
    <Button type="button" variant="ghost" className="px-3 text-xs" disabled={!boot.canReplay || replayDisabled} onClick={() => { if (boot.replay()) onReplay?.() }} aria-label="Replay Boot Animation"><RotateCcw aria-hidden="true" size={14} />Replay</Button>
    </div>
    <p id="boot-animation-description" className="text-xs leading-5 text-[var(--text-muted)]">A brief celestial welcome when you open EdenOS. Your preference applies on this device.</p>
    {(!boot.canReplay || replayDisabled) && <p className="mt-2 text-xs text-[var(--text-muted)]">Replay is available when your workspace is ready and current work is finished.</p>}
    {!boot.preferenceSaved && <p role="status" className="mt-2 text-xs text-[var(--text-muted)]">This browser could not save your preference. It applies until this page closes.</p>}
  </section>
}
