import { CalendarDays, Plus, Search } from 'lucide-react'
import { Button } from '../ui/button'
import { CaptureSheet } from '../capture/CaptureSheet'
import { triggerPressFeedback } from '../ui/pressFeedback'

export function DashboardHeader({
  greeting,
  displayDate,
  onOpenCommand,
}: {
  greeting: string
  displayDate: string
  onOpenCommand?: () => void
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

        <div className="flex flex-wrap gap-2">
          {onOpenCommand && <Button type="button" variant="secondary" onClick={onOpenCommand}><Search aria-hidden="true" size={17} />Search <span className="hidden text-xs text-[var(--text-muted)] sm:inline">⌘K</span></Button>}
          <CaptureSheet><Button {...triggerPressFeedback} className="press-feedback"><Plus aria-hidden="true" size={18} strokeWidth={2.2} />Capture</Button></CaptureSheet>
        </div>
      </div>
    </header>
  )
}
