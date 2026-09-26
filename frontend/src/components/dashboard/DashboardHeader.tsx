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
    <header className="py-2 sm:py-3">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="section-label">Today</p>
          <div className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <CalendarDays aria-hidden="true" size={14} strokeWidth={1.8} />
            {displayDate}
          </div>
          <h1 className="mt-3 max-w-3xl text-[clamp(2rem,5vw,3.35rem)] font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--text-primary)]">
            {greeting}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">Here is what matters today.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:min-w-[22rem]">
          {onOpenCommand && <Button type="button" variant="secondary" className="min-h-12 flex-1 justify-start px-4 text-[var(--text-secondary)]" onClick={onOpenCommand}><Search aria-hidden="true" size={17} /><span className="flex-1 text-left">Search or run a command</span><span className="hidden rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-[10px] text-[var(--text-muted)] sm:inline">⌘K</span></Button>}
          <CaptureSheet><Button {...triggerPressFeedback} className="press-feedback"><Plus aria-hidden="true" size={18} strokeWidth={2.2} />Capture</Button></CaptureSheet>
        </div>
      </div>
    </header>
  )
}
