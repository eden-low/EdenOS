import { Cloud, RotateCw, TriangleAlert, WifiOff } from 'lucide-react'
import { Button } from '../ui/button'

interface AppStatusScreenProps {
  status: 'loading' | 'error' | 'offline'
  title: string
  message: string
  onRetry?: () => void
}

export function AppStatusScreen({
  status,
  title,
  message,
  onRetry,
}: AppStatusScreenProps) {
  const Icon = status === 'loading' ? Cloud : status === 'offline' ? WifiOff : TriangleAlert

  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-10 text-[var(--text-primary)]">
      <section
        className="dashboard-card w-full max-w-md p-7 text-center sm:p-9"
        aria-live="polite"
        aria-busy={status === 'loading'}
      >
        <span
          className={`mx-auto grid size-12 place-items-center rounded-2xl ${
            status === 'loading'
              ? 'bg-[var(--accent-wash)] text-[var(--accent-soft)]'
              : status === 'offline'
                ? 'bg-[var(--accent-amber-wash)] text-[var(--accent-amber)]'
                : 'bg-[var(--danger-wash)] text-[var(--danger)]'
          }`}
        >
          <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
        </span>
        <p className="section-label mt-5">Eden OS</p>
        <h1 className="mt-2 text-xl font-semibold tracking-[-0.025em]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{message}</p>
        {onRetry && (
          <Button type="button" variant="secondary" className="mt-6" onClick={onRetry}>
            <RotateCw aria-hidden="true" size={16} />
            Try again
          </Button>
        )}
      </section>
    </main>
  )
}
