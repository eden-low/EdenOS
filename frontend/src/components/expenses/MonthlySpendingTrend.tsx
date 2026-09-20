import { LockKeyhole } from 'lucide-react'
import { formatMoney } from '../../lib/format'
import { usePrivacyLock } from '../../privacy/usePrivacyLock'
import type { MonthlySpendingPoint, MonthlySpendingTrend as MonthlySpendingTrendData } from '../../selectors/monthlySpendingTrend'
import { Button } from '../ui/button'

const height = 220

function plotBounds(chartWidth: number) {
  return { left: chartWidth < 500 ? 58 : 68, right: chartWidth < 500 ? 10 : 18, top: 18, bottom: 36 }
}

function coordinate(point: MonthlySpendingPoint, length: number, maximum: number, chartWidth: number): [number, number] {
  const plot = plotBounds(chartWidth)
  const availableWidth = chartWidth - plot.left - plot.right
  const availableHeight = height - plot.top - plot.bottom
  const x = plot.left + (length <= 1 ? 0 : (point.day - 1) / (length - 1) * availableWidth)
  const y = plot.top + availableHeight - point.cumulativeSen / maximum * availableHeight
  return [x, y]
}

function line(points: MonthlySpendingPoint[], domainLength: number, maximum: number, chartWidth: number): string {
  return points.map((point) => coordinate(point, domainLength, maximum, chartWidth).join(',')).join(' ')
}

function finalTotal(points: MonthlySpendingPoint[]): number {
  return points.at(-1)?.cumulativeSen ?? 0
}

function TrendSvg({ trend, chartWidth, className, maximum, yTicks, xTicks, finalDay }: {
  trend: MonthlySpendingTrendData
  chartWidth: number
  className: string
  maximum: number
  yTicks: number[]
  xTicks: number[]
  finalDay: number
}) {
  const plot = plotBounds(chartWidth)
  const fontSize = chartWidth < 500 ? 12 : 11
  return <svg viewBox={`0 0 ${chartWidth} ${height}`} className={className} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    {yTicks.map((amount, index) => {
      const y = yTicks.length === 1 ? height - plot.bottom : plot.top + index * ((height - plot.top - plot.bottom) / (yTicks.length - 1))
      return <g key={`${amount}-${index}`}><line x1={plot.left} x2={chartWidth - plot.right} y1={y} y2={y} stroke="var(--border-subtle)" strokeWidth="1" /><text x={plot.left - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize={fontSize}>{formatMoney(amount)}</text></g>
    })}
    {xTicks.map((day) => {
      const [x] = coordinate({ day, cumulativeSen: 0 }, trend.current.length, maximum, chartWidth)
      return <text key={day} x={x} y={height - 10} textAnchor={day === 1 ? 'start' : day === finalDay ? 'end' : 'middle'} fill="var(--text-muted)" fontSize={fontSize}>Day {day}</text>
    })}
    {trend.previous && <polyline points={line(trend.previous, trend.current.length, maximum, chartWidth)} fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />}
    <polyline points={line(trend.current, trend.current.length, maximum, chartWidth)} fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    {trend.current.length > 0 && (() => { const point = trend.current.at(-1)!; const [x, y] = coordinate(point, trend.current.length, maximum, chartWidth); return <circle cx={x} cy={y} r="4" fill="var(--surface-elevated)" stroke="var(--accent-primary)" strokeWidth="3" /> })()}
  </svg>
}

export function MonthlySpendingTrend({ trend }: { trend: MonthlySpendingTrendData }) {
  const privacy = usePrivacyLock()
  if (privacy.locked) {
    return <section className="dashboard-card mt-4 p-5 sm:p-6" aria-labelledby="monthly-spending-trend-title">
      <h2 id="monthly-spending-trend-title" className="section-label">Monthly Spending Trend</h2>
      <div role="status" className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"><LockKeyhole aria-hidden="true" size={18} />Unlock to view spending trend</span>
        <Button type="button" variant="secondary" onClick={privacy.requestUnlock}>Unlock</Button>
      </div>
    </section>
  }

  const allPoints = trend.previous ? [...trend.current, ...trend.previous] : trend.current
  const maximumAmount = Math.max(0, ...allPoints.map((point) => point.cumulativeSen))
  const scaleMaximum = Math.max(1, maximumAmount)
  const yTicks = maximumAmount > 0 ? [maximumAmount, Math.round(maximumAmount / 2), 0] : [0]
  const finalDay = trend.current.at(-1)?.day ?? 1
  const xTicks = [...new Set([1, Math.max(1, Math.ceil(finalDay / 2)), finalDay])]
  const summary = `${trend.currentMonthLabel} cumulative spending through day ${finalDay}: ${formatMoney(finalTotal(trend.current))}.${trend.previous ? ` ${trend.previousMonthLabel} through the same day: ${formatMoney(finalTotal(trend.previous))}.` : ''}`

  return <section className="dashboard-card mt-4 p-5 sm:p-6" aria-labelledby="monthly-spending-trend-title">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 id="monthly-spending-trend-title" className="section-label">Monthly Spending Trend</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Cumulative spending by local calendar day</p></div>
      <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]" aria-label="Chart legend">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-[var(--accent-primary)]" aria-hidden="true" />{trend.currentMonthLabel}</span>
        {trend.previous && <span className="inline-flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-[var(--text-muted)]" aria-hidden="true" />{trend.previousMonthLabel}</span>}
      </div>
    </div>
    <p id="monthly-spending-trend-summary" className="sr-only">{summary}</p>
    <figure className="mt-5 min-w-0 overflow-hidden" aria-describedby="monthly-spending-trend-summary" role="img" aria-label="Monthly cumulative spending line chart" data-chart-theme="tokens">
      <TrendSvg trend={trend} chartWidth={360} className="mx-auto block h-auto w-full sm:hidden" maximum={scaleMaximum} yTicks={yTicks} xTicks={xTicks} finalDay={finalDay} />
      <TrendSvg trend={trend} chartWidth={720} className="mx-auto hidden h-auto w-full max-w-[720px] sm:block" maximum={scaleMaximum} yTicks={yTicks} xTicks={xTicks} finalDay={finalDay} />
    </figure>
  </section>
}
