import { Activity, CircleAlert, Flame, Footprints, Plus, Timer, Trophy } from 'lucide-react'
import { createElement, useMemo, type ReactNode } from 'react'
import { CaptureSheet } from '../components/capture/CaptureSheet'
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
    <header className="flex flex-col justify-between gap-5 py-2 sm:py-3 lg:flex-row lg:items-end">
      <div><p className="section-label text-[var(--accent-teal)]">Movement</p><h1 className="mt-2 text-[clamp(2rem,5vw,3.35rem)] font-semibold leading-[1.02] tracking-[-0.055em]">Exercise</h1><p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">Your weekly movement, consistency, and supported personal bests.</p></div>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={onOpenRecords}>View records</Button><CaptureSheet><Button type="button"><Plus size={17} />Capture workout</Button></CaptureSheet></div>
    </header>

    <section aria-label="Weekly exercise summary" className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 xl:grid-cols-4">
      <Metric icon={<Trophy size={17} />} label="Workouts" value={String(summary.sessions)} detail={summary.sessions === 1 ? 'Session this week' : 'Sessions this week'} />
      <Metric icon={<Timer size={17} />} label="Total minutes" value={summary.durationSeconds ? formatDuration(summary.durationSeconds) : '0 min'} detail={comparisonText(summary.durationComparisonPercent)} />
      <Metric icon={<Footprints size={17} />} label="Distance" value={summary.distanceMetres ? formatDistance(summary.distanceMetres) : '0 m'} detail="Recorded this week" />
      <Metric icon={<Activity size={17} />} label="Active days" value={String(summary.activeDays)} detail={summary.streakDays > 0 ? `${summary.streakDays}-day current streak` : 'No current streak'} />
    </section>

    <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)]">
      <WeeklyActivityChart data={summary.dailyActivity} />
      <ProgressCard summary={summary} />
    </div>

    <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
      <RecentWorkouts records={summary.recent} onOpenRecords={onOpenRecords} />
      <ActivityBreakdown activities={summary.activities} />
    </div>

    <div className="mt-4"><BodyMetricsCard /></div>
  </Page>
}

function comparisonText(comparison: number | null): string {
  if (comparison === null) return 'No prior-week comparison'
  if (comparison === 0) return 'Same duration as last week'
  return `${comparison > 0 ? '+' : ''}${comparison}% vs last week`
}

function ProgressCard({ summary }: { summary: ReturnType<typeof selectExerciseDashboard> }) {
  return <section aria-labelledby="progress-heading" className="dashboard-card p-5 sm:p-6">
    <p className="section-label text-[var(--accent-teal)]">Consistency</p>
    <h2 id="progress-heading" className="mt-1 text-lg font-semibold">Keep the week moving</h2>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <SmallStat label="Active days" value={String(summary.activeDays)} />
      <SmallStat label="Current streak" value={summary.streakDays ? `${summary.streakDays} days` : '—'} />
    </div>
    <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]"><Flame size={14} />Calories</div>
      <p className="mt-2 text-sm font-semibold">{summary.reportedCaloriesKcal ? `${Math.round(summary.reportedCaloriesKcal)} kcal reported` : 'No reported data'}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{summary.estimatedCaloriesKcal ? `Estimated separately: ${summary.estimatedCaloriesKcal} kcal` : 'Reported and estimated stay separate'}</p>
    </div>
    <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
      <p className="section-label">Supported personal bests</p>
      {summary.personalBests.length ? <div className="mt-3 space-y-2">{summary.personalBests.map((best) => <div key={best.label} className="flex items-baseline justify-between gap-3 rounded-xl bg-[var(--surface-secondary)] px-3 py-2.5"><span className="text-xs text-[var(--text-muted)]">{best.label}</span><strong className="shrink-0 text-sm">{best.unit === 'seconds' ? formatDuration(best.value) : best.unit === 'metres' ? formatDistance(best.value) : `${formatDuration(best.value)} / km`}</strong></div>)}</div> : <p className="mt-3 text-sm text-[var(--text-muted)]">Log workouts to establish personal bests.</p>}
    </div>
  </section>
}

function RecentWorkouts({ records, onOpenRecords }: { records: ReturnType<typeof selectExerciseDashboard>['recent']; onOpenRecords: () => void }) {
  return <section aria-labelledby="recent-workouts-heading" className="dashboard-card overflow-hidden"><div className="flex items-center justify-between gap-3 p-5 sm:p-6"><div><p className="section-label text-[var(--accent-teal)]">Latest activity</p><h2 id="recent-workouts-heading" className="mt-1 text-lg font-semibold">Recent workouts</h2></div><button type="button" onClick={onOpenRecords} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--accent-soft)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]">View & edit</button></div>
    {records.length ? <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">{records.map((item, index) => { const Icon = getExerciseActivityIcon(item.activity); const reported = item.reportedActiveCaloriesKcal ?? item.reportedTotalCaloriesKcal; return <li key={item.id} className={`flex items-center gap-3 px-5 py-4 sm:px-6 ${index === 0 ? 'bg-[var(--surface-secondary)]' : ''}`}><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]">{createElement(Icon, { size: 18, 'aria-hidden': true })}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="block truncate text-sm">{item.activity}</strong>{index === 0 && <span className="rounded-full bg-[var(--positive-wash)] px-2 py-0.5 text-[10px] font-semibold text-[var(--positive)]">Latest</span>}</span><span className="mt-1 block text-xs text-[var(--text-muted)]">{formatLongDate(item.occurredAt)} · {formatDuration(item.durationSeconds)}{item.distanceMetres ? ` · ${formatDistance(item.distanceMetres)}` : ''}</span></span><span className="shrink-0 text-right text-xs text-[var(--text-muted)]">{reported === undefined ? 'No reported kcal' : <><strong className="block text-sm text-[var(--text-primary)]">{Math.round(reported)} kcal</strong>Reported</>}</span></li> })}</ul> : <div className="m-5 flex items-center gap-2 rounded-2xl border border-dashed border-[var(--border-subtle)] p-5 text-sm text-[var(--text-muted)]"><Activity size={16} />No exercise records yet. Capture a workout to begin.</div>}</section>
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[var(--surface-secondary)] p-3"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-lg font-semibold tracking-[-0.03em]">{value}</p></div>
}

function Page({ children }: { children: ReactNode }) { return <div className="core-page mx-auto w-full max-w-[80rem] px-4 py-5 sm:px-6 lg:px-8">{children}</div> }
function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <article className="dashboard-card min-w-0 p-4 sm:p-5"><div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]"><span className="text-[var(--accent-teal)]">{icon}</span><span>{label}</span></div><p className="mt-4 truncate text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{value}</p><p className="mt-1 min-h-8 text-[11px] leading-4 text-[var(--text-muted)] sm:text-xs">{detail}</p></article>
}
