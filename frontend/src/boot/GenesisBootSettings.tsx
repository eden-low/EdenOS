import { useBootAnimation } from './bootContext'
import { Button } from '../components/ui/button'

export function GenesisBootSettings({ onReplay }: { onReplay?: () => void }) {
  const boot = useBootAnimation()
  if (!boot) return null
  return <section className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-5" aria-labelledby="boot-animation-heading">
    <h3 id="boot-animation-heading" className="section-label">Welcome experience</h3>
    <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm font-semibold">
      <span>Show Boot Animation</span>
      <input type="checkbox" role="switch" checked={boot.enabled} onChange={(event) => boot.setEnabled(event.target.checked)} aria-describedby="boot-animation-description" className="size-5 shrink-0 accent-[var(--accent-primary)]" />
    </label>
    <p id="boot-animation-description" className="text-xs leading-5 text-[var(--text-muted)]">A brief celestial welcome when you open EdenOS. Your preference applies on this device.</p>
    <Button type="button" variant="secondary" className="mt-3 w-full" disabled={!boot.canReplay} onClick={() => { if (boot.replay()) onReplay?.() }}>Replay Boot Animation</Button>
    {!boot.canReplay && <p className="mt-2 text-xs text-[var(--text-muted)]">Replay is available when your workspace is ready and current work is finished.</p>}
    {!boot.preferenceSaved && <p role="status" className="mt-2 text-xs text-[var(--text-muted)]">This browser could not save your preference. It applies until this page closes.</p>}
  </section>
}
