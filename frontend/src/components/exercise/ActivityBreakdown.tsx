import { formatDuration } from '../../lib/format'

const palette = ['var(--accent-teal)', 'var(--accent-soft)', 'var(--warning)', 'var(--success)', 'var(--text-muted)']

export function ActivityBreakdown({ activities }: { activities: Array<{ activity: string; durationSeconds: number; percentage: number }> }) {
  const segments = activities.map((_item, index) => `${palette[index % palette.length]} ${activities.slice(0, index).reduce((sum, value) => sum + value.percentage, 0)}% ${activities.slice(0, index + 1).reduce((sum, value) => sum + value.percentage, 0)}%`)
  return <section aria-labelledby="activity-breakdown-heading" className="dashboard-card p-5 sm:p-6">
    <p className="section-label text-[var(--accent-soft)]">Distribution</p><h2 id="activity-breakdown-heading" className="mt-1 text-lg font-semibold">Activity Breakdown</h2>
    {activities.length ? <div className="mt-5 grid items-center gap-5 sm:grid-cols-[9rem_1fr] lg:grid-cols-1 xl:grid-cols-[9rem_1fr]">
      <div role="img" aria-label="Exercise duration by activity" className="relative mx-auto size-36 rounded-full" style={{ background: `conic-gradient(${segments.join(',')})` }}><div className="absolute inset-5 grid place-items-center rounded-full bg-[var(--surface-primary)] text-center"><span><strong className="block text-xl">{activities.length}</strong><span className="text-xs text-[var(--text-muted)]">activities</span></span></div></div>
      <ul className="space-y-3">{activities.map((item, index) => <li key={item.activity} className="flex items-center gap-2 text-sm"><span className="size-2.5 shrink-0 rounded-full" style={{ background: palette[index % palette.length] }} /><span className="min-w-0 flex-1 truncate font-medium">{item.activity}</span><span className="text-right text-xs text-[var(--text-muted)]"><strong className="block text-sm text-[var(--text-primary)]">{Math.round(item.percentage)}%</strong>{formatDuration(item.durationSeconds)}</span></li>)}</ul>
    </div> : <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center text-sm text-[var(--text-muted)]">Complete a workout to see your activity mix.</div>}
  </section>
}
