import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppPage } from '../components/layout/Navigation'
import { AnimeHomeCard } from '../components/dashboard/AnimeHomeCard'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DailyContext } from '../components/dashboard/DailyContext'
import { ExerciseCard } from '../components/dashboard/ExerciseCard'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { SpendingCard } from '../components/dashboard/SpendingCard'
import { CalendarCard } from '../components/dashboard/CalendarCard'
import { TodaySummary } from '../components/dashboard/TodaySummary'
import { WeeklyReviewCard } from '../components/dashboard/WeeklyReviewCard'
import { DashboardEditor } from '../components/dashboard/DashboardEditor'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { createFirestoreAnimeRepository } from '../repositories/firestoreAnimeRepository'
import { selectDashboardSummary } from '../selectors/dashboardSelectors'
import { useAnimeProgress } from '../state/useAnimeProgress'
import { useFirebaseAuth } from '../state/useFirebaseAuth'
import { useRecords } from '../state/useRecords'
import { useDashboardPreferences } from '../state/useDashboardPreferences'
import type { DashboardSection } from '../domain/dashboardPreferences'
import type { AnimeSummary } from '../types/anime'
import { useFinancePlanning } from '../state/useFinancePlanning'
import { useGoalAllocations } from '../state/useGoalAllocations'
import { sumGoalAllocations } from '../domain/financePlanning'
import { addLocalWeeks, startOfLocalWeek } from '../lib/date'

export function TodayPage({ onNavigate, onOpenCommand }: { onNavigate: (page: AppPage) => void; onOpenCommand: () => void }) {
  const {
    expenses,
    incomes,
    exerciseRecords,
    expenseStatus,
    expenseError,
    incomeStatus,
    incomeError,
    exerciseStatus,
    exerciseError,
    retryExpenseSubscription,
    retryIncomeSubscription,
    retryExerciseSubscription,
  } = useRecords()
  const { firestore } = useFirebaseAuth()
  const dashboardPreferences = useDashboardPreferences()
  const { items: animeProgress } = useAnimeProgress()
  const referenceDate = useLocalReferenceDate()
  const financePlanning = useFinancePlanning()
  const { allocations: goalAllocations, status: goalAllocationsStatus } = useGoalAllocations(referenceDate)
  const repository = useMemo(() => createFirestoreAnimeRepository(firestore), [firestore])
  const [anime, setAnime] = useState<{
    status: 'loading' | 'ready' | 'error'
    recent: AnimeSummary[]
    updatesToday: number
  }>({ status: 'loading', recent: [], updatesToday: 0 })

  useEffect(() => {
    let active = true
    const today = new Date(referenceDate)
    today.setHours(0, 0, 0, 0)
    void Promise.all([repository.fetchPublishedSince(today, 4), repository.countPublishedSince(today)])
      .then(([recent, updatesToday]) => {
        if (active) setAnime({ status: 'ready', recent, updatesToday })
      })
      .catch(() => {
        if (active) setAnime({ status: 'error', recent: [], updatesToday: 0 })
      })
    return () => { active = false }
  }, [referenceDate, repository])
  const dashboard = useMemo(
    () =>
      selectDashboardSummary(
        expenseStatus === 'loaded' ? expenses : [],
        exerciseStatus === 'loaded' ? exerciseRecords : [],
        referenceDate,
        incomeStatus === 'loaded' ? incomes : [],
      ),
    [exerciseRecords, exerciseStatus, expenseStatus, expenses, incomeStatus, incomes, referenceDate],
  )
  const financeReady = expenseStatus === 'loaded' && incomeStatus === 'loaded'
  const exerciseReady = exerciseStatus === 'loaded'
  const allocationsSen = sumGoalAllocations(goalAllocations)
  const availableSen = dashboard.monthlyFinance.netCashflowSen - allocationsSen
  const nextWeek = addLocalWeeks(startOfLocalWeek(referenceDate), 1)
  const daysUntilReview = Math.max(0, Math.ceil((nextWeek.getTime() - referenceDate.getTime()) / 86_400_000))
  const recentActivitySource =
    expenseStatus === 'loaded' && exerciseStatus === 'loaded'
      ? 'Finance + exercise'
      : expenseStatus === 'loaded'
        ? 'Finance available'
        : exerciseStatus === 'loaded'
          ? 'Exercise available'
          : expenseStatus === 'loading' || exerciseStatus === 'loading'
            ? 'Activity loading'
            : 'Activity unavailable'
  const sections: Record<DashboardSection, ReactNode> = {
    finance: <SpendingCard spending={dashboard.monthlySpending} finance={dashboard.monthlyFinance} goals={financePlanning.goals} goalAllocations={goalAllocations} planningStatus={financePlanning.status === 'error' || goalAllocationsStatus === 'error' ? 'error' : financePlanning.status === 'loaded' && goalAllocationsStatus === 'loaded' ? 'loaded' : 'loading'} status={expenseStatus} incomeStatus={incomeStatus} error={expenseError} incomeError={incomeError} onRetry={retryExpenseSubscription} onRetryIncome={retryIncomeSubscription} onOpen={() => onNavigate('expenses')} />,
    exercise: <ExerciseCard exercise={dashboard.exercise} status={exerciseStatus} error={exerciseError} onRetry={retryExerciseSubscription} onOpen={() => onNavigate('exercise')} />,
    anime: <AnimeHomeCard watching={animeProgress.filter((item) => item.trackingStatus === 'watching').sort((left, right) => right.updatedAt - left.updatedAt)} recent={anime.recent} status={anime.status} onOpen={() => onNavigate('anime')} />,
    review: <WeeklyReviewCard referenceDate={referenceDate} onOpen={() => onNavigate('review')} />,
    records: <RecentActivity items={dashboard.recentActivity} sourceLabel={recentActivitySource} emptyMessage="No recent records yet." onOpen={() => onNavigate('records')} />,
    calendar: <CalendarCard referenceDate={referenceDate} />,
  }
  return (
    <div className="core-page mx-auto w-full max-w-[76rem] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <DashboardHeader greeting={dashboard.greeting} displayDate={dashboard.displayDate} onOpenCommand={onOpenCommand} />
      <TodaySummary
        availableSen={availableSen}
        allocationsSen={allocationsSen}
        workouts={dashboard.exercise.completedSessions}
        durationSeconds={dashboard.exercise.durationSeconds}
        animeUpdates={anime.updatesToday}
        daysUntilReview={daysUntilReview}
        financeReady={financeReady && goalAllocationsStatus === 'loaded'}
        exerciseReady={exerciseReady}
        animeReady={anime.status === 'ready'}
      />
      <DailyContext referenceDate={referenceDate} />
      <DashboardEditor dashboard={dashboardPreferences} />
      <section aria-labelledby="today-sections" className="mt-5 sm:mt-6">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div><p className="section-label">Your day</p><h2 id="today-sections" className="mt-1 text-xl font-semibold tracking-[-0.03em]">The details, in priority order</h2></div>
          <p className="hidden text-xs text-[var(--text-muted)] sm:block">Open a section for the full picture</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">{dashboardPreferences.preferences.order.filter((section) => !dashboardPreferences.preferences.hidden.includes(section)).map((section) => <div key={section} data-dashboard-section={section}>{sections[section]}</div>)}</div>
      </section>
    </div>
  )
}
