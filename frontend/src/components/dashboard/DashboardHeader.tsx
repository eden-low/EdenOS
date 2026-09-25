import { CalendarDays, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { CaptureSheet } from '../capture/CaptureSheet'
import { triggerPressFeedback } from '../ui/pressFeedback'

export function DashboardHeader({
  greeting,
  displayDate,
}: {
  greeting: string
  displayDate: string
}) {
  return (
    <header className="rounded-[1.5rem] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <CalendarDays aria-hidden="true" size={14} strokeWidth={1.8} />
            {displayDate}
          </div>
          <h1 className="max-w-3xl text-[clamp(1.9rem,5vw,3.15rem)] font-semibold leading-[1.05] tracking-[-0.05em] text-[var(--text-primary)]">
            {greeting}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">Here is what matters today.</p>
        </div>

        <CaptureSheet>
          <Button {...triggerPressFeedback} className="press-feedback self-start sm:self-auto">
            <Plus aria-hidden="true" size={18} strokeWidth={2.2} />
            Capture
          </Button>
        </CaptureSheet>
      </div>
    </header>
  )
}
