import { WifiOff } from 'lucide-react'
import { useConnectivity } from '../../providers/useConnectivity'

export function OfflineIndicator() {
  const status = useConnectivity()
  if (status === 'online') return null

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[60] flex max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 shadow-[var(--shadow-soft)] sm:right-5"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-amber-wash)] text-[var(--accent-amber)]">
        <WifiOff aria-hidden="true" size={17} strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Offline</p>
        <p className="text-xs text-[var(--text-secondary)]">Cloud changes are temporarily unavailable.</p>
      </div>
    </aside>
  )
}
