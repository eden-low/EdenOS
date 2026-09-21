import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

export function CalendarCard({ referenceDate = new Date() }: { referenceDate?: Date }) {
  const [month, setMonth] = useState(() => new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1))
  const startOffset = (month.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: startOffset + days }, (_, index) => index < startOffset ? null : index - startOffset + 1)
  const isCurrentMonth = month.getFullYear() === referenceDate.getFullYear() && month.getMonth() === referenceDate.getMonth()
  const move = (delta: number) => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + delta, 1))

  return <section aria-labelledby="calendar-heading" className="dashboard-card order-4 col-span-2 p-5 sm:p-6 md:col-span-6 xl:col-span-5">
    <div className="flex items-center justify-between gap-3"><div><p className="section-label text-[var(--accent-soft)]">Date reference</p><h2 id="calendar-heading" className="mt-1 text-lg font-semibold">{monthLabel.format(month)}</h2></div><div className="flex gap-1"><button type="button" aria-label="Previous month" onClick={() => move(-1)} className="grid size-10 place-items-center rounded-xl border border-[var(--border-subtle)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"><ChevronLeft size={17} /></button><button type="button" aria-label="Next month" onClick={() => move(1)} className="grid size-10 place-items-center rounded-xl border border-[var(--border-subtle)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"><ChevronRight size={17} /></button></div></div>
    <div className="mt-5 grid grid-cols-7 text-center">{weekdays.map((day) => <span key={day} className="py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{day}</span>)}{cells.map((day, index) => <span key={index} aria-current={day && isCurrentMonth && day === referenceDate.getDate() ? 'date' : undefined} className={`mx-auto mt-1 grid size-8 place-items-center rounded-full text-xs ${day && isCurrentMonth && day === referenceDate.getDate() ? 'bg-[var(--accent-soft)] font-bold text-white' : 'text-[var(--text-secondary)]'}`}>{day}</span>)}</div>
  </section>
}
