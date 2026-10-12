import { ArrowRight, Sparkles } from 'lucide-react'
import { cosmosReflectionForLocalDate } from '../../cosmos/dailyReflections'

export function CosmosTodayCard({ referenceDate, onOpen }: { referenceDate: Date; onOpen: () => void }) {
  const reflection = cosmosReflectionForLocalDate(referenceDate)

  return <section aria-labelledby="cosmos-today-heading" className="dashboard-card relative overflow-hidden p-5 ring-1 ring-inset ring-[var(--accent-amber-wash)] sm:p-6">
    <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full bg-[var(--accent-amber-wash)] blur-2xl" />
    <div className="relative flex items-start gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-amber-wash)] text-[var(--accent-amber)]"><Sparkles size={19} /></span>
      <div className="min-w-0 flex-1">
        <p className="section-label text-[var(--accent-amber)]">Cosmos Today</p>
        <h2 id="cosmos-today-heading" className="mt-1 text-lg font-semibold">今日一问</h2>
        <p className="mt-3 text-[0.95rem] leading-7 text-[var(--text-primary)]">{reflection.text}</p>
        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">每日反思提示 · 不是星座运势或历法推算</p>
        <button type="button" onClick={onOpen} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--accent-amber)] outline-none hover:bg-[var(--accent-amber-wash)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]" aria-label="Open Cosmos">打开 Cosmos <ArrowRight size={16} /></button>
      </div>
    </div>
  </section>
}
