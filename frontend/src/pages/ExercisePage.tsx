import { Activity, CircleAlert, Flame, Footprints, Timer, Trophy } from 'lucide-react'
import { createElement, useMemo, type ReactNode } from 'react'
import { ActivityBreakdown } from '../components/exercise/ActivityBreakdown'
import { BodyMetricsCard } from '../components/exercise/BodyMetricsCard'
import { WeeklyActivityChart } from '../components/exercise/WeeklyActivityChart'
import { Button } from '../components/ui/button'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { formatLongDate } from '../lib/date'
import { getExerciseActivityIcon } from '../lib/exerciseIcon'
import { formatDistance, formatDuration } from '../lib/format'
import { selectExerciseDashboard } from '../selectors/exerciseDashboardSelectors'
import { useRecords } from '../state/useRecords'
import { useUserSettings } from '../state/useUserSettings'

export function ExercisePage({ onOpenRecords }: { onOpenRecords: () => void }) {
  const records = useRecords()
  const { settings } = useUserSettings()
  const referenceDate = useLocalReferenceDate()
  const summary = useMemo(() => selectExerciseDashboard(records.exerciseRecords, settings.bodyWeightKg, referenceDate), [records.exerciseRecords, referenceDate, settings.bodyWeightKg])
  if (records.exerciseStatus === 'error') return <Page><div role="alert" className="dashboard-card p-6"><CircleAlert className="text-[var(--danger)]" /><h2 className="mt-3 text-lg font-semibold">Exercise unavailable</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{records.exerciseError}</p><Button className="mt-4" onClick={records.retryExerciseSubscription}>Retry</Button></div></Page>

  return <Page>
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-label text-[var(--accent-teal)]">Movement</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Exercise</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">A focused view of your real weekly activity and body metrics.</p></div><Button type="button" variant="secondary" onClick={onOpenRecords}>Open exercise records</Button></header>
    <section aria-label="Weekly exercise summary" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Trophy size={18} />} tone="purple" label="Workouts" value={`${summary.sessions} ${summary.sessions === 1 ? 'Session' : 'Sessions'}`} detail={summary.durationComparisonPercent === null ? 'No prior-week comparison' : `${summary.durationComparisonPercent >= 0 ? '+' : ''}${summary.durationComparisonPercent}% duration vs last week`} />
      <Metric icon={<Timer size={18} />} tone="teal" label="Duration" value={summary.durationSeconds ? formatDuration(summary.durationSeconds) : '0 min'} detail="Current local week" />
      <Metric icon={<Footprints size={18} />} tone="blue" label="Distance" value={summary.distanceMetres ? formatDistance(summary.distanceMetres) : '0 m'} detail="Where distance was recorded" />
      <Metric icon={<Flame size={18} />} tone="amber" label="Calories" value={summary.reportedCaloriesKcal ? `${Math.round(summary.reportedCaloriesKcal)} kcal` : 'No reported data'} detail={summary.estimatedCaloriesKcal ? `Estimated separately: ${summary.estimatedCaloriesKcal} kcal` : 'Reported and estimated stay separate'} />
    </section>
    <section aria-label="Exercise consistency and personal bests" className="dashboard-card mt-4 grid gap-5 p-5 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(0,1.3fr)] sm:p-6">
      <div><p className="section-label">Consistency</p><p className="mt-3 text-2xl font-semibold">{summary.activeDays} active {summary.activeDays === 1 ? 'day' : 'days'}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{summary.streakDays > 0 ? `${summary.streakDays}-day simple streak` : 'No current streak'} · this week</p></div>
      <div><p className="section-label">Personal bests</p>{summary.personalBests.length ? <div className="mt-3 grid gap-2 sm:grid-cols-3">{summary.personalBests.map((best) => <div key={best.label} className="rounded-xl bg-[var(--surface-secondary)] p-3"><p className="text-xs text-[var(--text-muted)]">{best.label}</p><p className="mt-1 text-sm font-semibold">{best.unit === 'seconds' ? formatDuration(best.value) : best.unit === 'metres' ? formatDistance(best.value) : `${formatDuration(best.value)} / km`}</p></div>)}</div> : <p className="mt-3 text-sm text-[var(--text-muted)]">Log workouts to establish personal bests.</p>}</div>
    </section>
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)]"><WeeklyActivityChart data={summary.dailyActivity} /><ActivityBreakdown activities={summary.activities} /></div>
    <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]"><RecentWorkouts records={summary.recent} onOpenRecords={onOpenRecords} /><BodyMetricsCard /></div>
  </Page>
}

function RecentWorkouts({ records, onOpenRecords }: { records: ReturnType<typeof selectExerciseDashboard>['recent']; onOpenRecords: () => void }) {
  return <section aria-labelledby="recent-workouts-heading" className="dashboard-card overflow-hidden"><div className="flex items-center justify-between gap-3 p-5 sm:p-6"><div><p className="section-label text-[var(--accent-teal)]">History</p><h2 id="recent-workouts-heading" className="mt-1 text-lg font-semibold">Recent Workouts</h2></div><button type="button" onClick={onOpenRecords} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-[var(--accent-soft)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]">View & edit</button></div>
    {records.length ? <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">{records.map((item) => { const Icon = getExerciseActivityIcon(item.activity); const reported = item.reportedActiveCaloriesKcal ?? item.reportedTotalCaloriesKcal; return <li key={item.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]">{createElement(Icon, { size: 18, 'aria-hidden': true })}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.activity}</strong><span className="mt-1 block text-xs text-[var(--text-muted)]">{formatLongDate(item.occurredAt)} · {formatDuration(item.durationSeconds)}{item.distanceMetres ? ` · ${formatDistance(item.distanceMetres)}` : ''}</span></span><span className="shrink-0 text-right text-xs text-[var(--text-muted)]">{reported === undefined ? 'No reported kcal' : <><strong className="block text-sm text-[var(--text-primary)]">{Math.round(reported)} kcal</strong>Reported</>}</span></li> })}</ul> : <div className="m-5 flex items-center gap-2 rounded-2xl border border-dashed border-[var(--border-subtle)] p-5 text-sm text-[var(--text-muted)]"><Activity size={16} />No exercise records yet. Capture a workout to begin.</div>}</section>
}

function Page({ children }: { children: ReactNode }) { return <div className="core-page mx-auto w-full max-w-[80rem] px-4 py-5 sm:px-6 lg:px-8">{children}</div> }
function Metric({ icon, tone, label, value, detail }: { icon: ReactNode; tone: 'purple' | 'teal' | 'blue' | 'amber'; label: string; value: string; detail: string }) {
  const backgrounds = { purple: 'from-[var(--accent-wash)] to-[var(--surface-primary)]', teal: 'from-[var(--accent-teal-wash)] to-[var(--surface-primary)]', blue: 'from-[color-mix(in_oklab,var(--accent-soft)_13%,var(--surface-primary))] to-[var(--surface-primary)]', amber: 'from-[color-mix(in_oklab,var(--warning)_13%,var(--surface-primary))] to-[var(--surface-primary)]' }
  return <article className={`dashboard-card relative overflow-hidden bg-gradient-to-br ${backgrounds[tone]} p-5`}><span className="grid size-10 place-items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--accent-soft)] shadow-sm">{icon}</span><p className="section-label mt-5">{label}</p><p className="metric-value mt-2 text-2xl font-semibold">{value}</p><p className="mt-2 min-h-8 text-xs leading-4 text-[var(--text-muted)]">{detail}</p></article>
}
