import { useState } from 'react'
import { formatDuration } from '../../lib/format'

type DailyActivity = { day: string; durationSeconds: number; sessions: number }

export function WeeklyActivityChart({ data }: { data: DailyActivity[] }) {
  const [metric, setMetric] = useState<'duration' | 'sessions'>('duration')
  const values = data.map((item) => metric === 'duration' ? item.durationSeconds : item.sessions)
  const max = Math.max(...values, 1)
  const hasData = values.some(Boolean)

  return <section aria-labelledby="weekly-activity-heading" className="dashboard-card p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="section-label text-[var(--accent-teal)]">This week</p><h2 id="weekly-activity-heading" className="mt-1 text-lg font-semibold">Activity</h2></div>
      <div className="flex rounded-xl bg-[var(--surface-secondary)] p-1" aria-label="Activity chart metric">
        {(['duration', 'sessions'] as const).map((item) => <button key={item} type="button" aria-pressed={metric === item} onClick={() => setMetric(item)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold capitalize outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${metric === item ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)]'}`}>{item}</button>)}
      </div>
    </div>
    <div role="img" aria-label={`Weekly exercise ${metric} from Monday to Sunday`} className="mt-5 grid h-48 grid-cols-7 items-end gap-2 sm:gap-3">
      {data.map((item, index) => {
        const value = values[index]
        const label = metric === 'duration' ? (value ? formatDuration(value) : 'No duration') : `${value} ${value === 1 ? 'session' : 'sessions'}`
        return <div key={item.day} className="flex h-full min-w-0 flex-col items-center justify-end gap-2" title={`${item.day}: ${label}`}>
          <span className="text-[10px] font-medium text-[var(--text-muted)] sm:text-xs">{value ? (metric === 'duration' ? `${Math.round(value / 60)}m` : value) : '0'}</span>
          <div className="flex h-32 w-full max-w-10 items-end overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="w-full rounded-full bg-gradient-to-t from-[var(--accent-teal)] to-[var(--accent-soft)] transition-[height]" style={{ height: `${hasData ? Math.max(value ? 10 : 0, value / max * 100) : 0}%` }} /></div>
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] sm:text-xs">{item.day}</span>
        </div>
      })}
    </div>
    {!hasData && <p className="mt-3 text-center text-sm text-[var(--text-muted)]">No exercise recorded this week yet.</p>}
  </section>
}
