import { LockKeyhole, TrendingUp } from 'lucide-react'
import { formatMoney } from '../../lib/format'
import { usePrivacyLock } from '../../privacy/usePrivacyLock'
import type { CashflowPoint } from '../../selectors/financeSelectors'
import { Button } from '../ui/button'

const width = 680
const height = 210
const bounds = { left: 62, right: 16, top: 12, bottom: 32 }

function points(values: number[], maximum: number): string {
  const plotWidth = width - bounds.left - bounds.right
  const plotHeight = height - bounds.top - bounds.bottom
  return values.map((value, index) => {
    const x = bounds.left + (values.length <= 1 ? 0 : index / (values.length - 1) * plotWidth)
    const y = bounds.top + plotHeight - value / maximum * plotHeight
    return `${x},${y}`
  }).join(' ')
}

export function CashflowChart({ data, monthLabel }: { data: CashflowPoint[]; monthLabel: string }) {
  const privacy = usePrivacyLock()
  if (privacy.locked) return <section className="dashboard-card p-5 sm:p-6" aria-labelledby="cashflow-title">
    <p className="section-label">Monthly overview</p><h2 id="cashflow-title" className="mt-1 text-lg font-semibold">Income and expenses</h2>
    <div role="status" className="mt-4 flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl bg-[var(--surface-secondary)] p-5 text-center">
      <LockKeyhole size={20} /><p className="text-sm text-[var(--text-secondary)]">Unlock to view finance trend</p><Button variant="secondary" onClick={privacy.requestUnlock}>Unlock</Button>
    </div>
  </section>
  const income = data.map((point) => point.incomeSen)
  const expenses = data.map((point) => point.expenseSen)
  const maximumValue = Math.max(0, ...income, ...expenses)
  const maximum = Math.max(1, maximumValue)
  const ticks = maximumValue > 0 ? [maximumValue, Math.round(maximumValue / 2), 0] : [0]
  const lastDay = data.at(-1)?.day ?? 1
  const description = `${monthLabel}: cumulative income ${formatMoney(income.at(-1) ?? 0)} and cumulative expenses ${formatMoney(expenses.at(-1) ?? 0)}.`
  return <section className="dashboard-card p-5 sm:p-6" aria-labelledby="cashflow-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="section-label">Monthly overview</p><h2 id="cashflow-title" className="mt-1 text-lg font-semibold">Income and expenses</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Cumulative movement through {monthLabel}</p></div>
      <div className="flex gap-4 text-xs text-[var(--text-secondary)]" aria-label="Chart legend"><span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-[var(--positive)]" />Income</span><span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-[var(--accent-blue)]" />Expenses</span></div>
    </div>
    {maximumValue === 0 ? <div className="mt-4 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] text-center"><TrendingUp size={20} className="text-[var(--text-muted)]" /><p className="mt-3 text-sm font-semibold">No finance activity this month</p><p className="mt-1 text-xs text-[var(--text-muted)]">Add income or an expense to begin the trend.</p></div> : <>
      <p className="sr-only" id="cashflow-description">{description}</p>
      <figure role="img" aria-label="Cumulative income and expense line chart" aria-describedby="cashflow-description" className="mt-4 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" aria-hidden="true">
          {ticks.map((tick, index) => { const y = ticks.length === 1 ? height - bounds.bottom : bounds.top + index * ((height - bounds.top - bounds.bottom) / (ticks.length - 1)); return <g key={`${tick}-${index}`}><line x1={bounds.left} x2={width - bounds.right} y1={y} y2={y} stroke="var(--border-subtle)" /><text x={bounds.left - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="11">{formatMoney(tick)}</text></g> })}
          {[1, Math.ceil(lastDay / 2), lastDay].map((day) => { const x = bounds.left + (day - 1) / Math.max(1, lastDay - 1) * (width - bounds.left - bounds.right); return <text key={day} x={x} y={height - 8} textAnchor={day === 1 ? 'start' : day === lastDay ? 'end' : 'middle'} fill="var(--text-muted)" fontSize="11">Day {day}</text> })}
          <polyline points={points(income, maximum)} fill="none" stroke="var(--positive)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <polyline points={points(expenses, maximum)} fill="none" stroke="var(--accent-blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </figure>
    </>}
  </section>
}
