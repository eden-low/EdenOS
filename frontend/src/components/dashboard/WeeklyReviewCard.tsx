import { ArrowRight, ClipboardCheck } from 'lucide-react'
import { addLocalWeeks, startOfLocalWeek } from '../../lib/date'

export function WeeklyReviewCard({ referenceDate, onOpen }: { referenceDate: Date; onOpen: () => void }) {
  const nextWeek = addLocalWeeks(startOfLocalWeek(referenceDate), 1)
  const days = Math.max(0, Math.ceil((nextWeek.getTime() - referenceDate.getTime()) / 86_400_000))
  return <section aria-label="Weekly review" className="dashboard-card p-5 sm:p-6">
    <div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--positive-wash)] text-[var(--positive)]"><ClipboardCheck size={19} /></span><div className="min-w-0 flex-1"><p className="section-label">Weekly Review</p><h2 className="mt-1 text-lg font-semibold">Pause, notice, decide</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Your current week is ready to review. The next week begins in {days} {days === 1 ? 'day' : 'days'}.</p><button type="button" onClick={onOpen} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--accent-soft)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]">Review this week <ArrowRight size={16} /></button></div></div>
  </section>
}
