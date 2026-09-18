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
    <header className="relative overflow-hidden rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--hero-gradient)] p-6 shadow-[var(--shadow-soft)] sm:p-8 lg:p-9">
      <div className="absolute -right-14 -top-28 size-80 rounded-full border border-[var(--hero-ring)]" aria-hidden="true" />
      <div className="absolute -right-2 -top-18 size-56 rounded-full border border-[var(--hero-ring-soft)]" aria-hidden="true" />
      <div className="absolute right-15 top-12 size-2 rounded-full bg-[var(--accent-soft)] shadow-[var(--hero-orb-shadow)]" aria-hidden="true" />
      <div className="absolute -bottom-30 right-34 size-60 rounded-full bg-[var(--hero-blue-wash)] blur-3xl" aria-hidden="true" />

      <div className="relative z-10 flex flex-col justify-between gap-6 sm:min-h-36 sm:flex-row sm:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-ghost)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <CalendarDays aria-hidden="true" size={14} strokeWidth={1.8} />
            {displayDate}
          </div>
          <h1 className="max-w-3xl text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.05em] text-[var(--text-primary)]">
            {greeting}
          </h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">Your day, at a glance.</p>
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
