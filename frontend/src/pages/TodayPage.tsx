import { useEffect, useMemo, useState } from 'react'
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
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { createFirestoreAnimeRepository } from '../repositories/firestoreAnimeRepository'
import { selectDashboardSummary } from '../selectors/dashboardSelectors'
import { useAnimeProgress } from '../state/useAnimeProgress'
import { useFirebaseAuth } from '../state/useFirebaseAuth'
import { useRecords } from '../state/useRecords'
import type { AnimeSummary } from '../types/anime'

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
  const { items: animeProgress } = useAnimeProgress()
  const referenceDate = useLocalReferenceDate()
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
  return (
    <div className="core-page mx-auto w-full max-w-[76rem] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <DashboardHeader greeting={dashboard.greeting} displayDate={dashboard.displayDate} onOpenCommand={onOpenCommand} />
      <TodaySummary
        netCashflowSen={dashboard.monthlyFinance.netCashflowSen}
        workouts={dashboard.exercise.completedSessions}
        durationSeconds={dashboard.exercise.durationSeconds}
        animeUpdates={anime.updatesToday}
        financeReady={financeReady}
        exerciseReady={exerciseReady}
        animeReady={anime.status === 'ready'}
      />
      <DailyContext referenceDate={referenceDate} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SpendingCard
          spending={dashboard.monthlySpending}
          finance={dashboard.monthlyFinance}
          status={expenseStatus}
          incomeStatus={incomeStatus}
          error={expenseError}
          incomeError={incomeError}
          onRetry={retryExpenseSubscription}
          onRetryIncome={retryIncomeSubscription}
          onOpen={() => onNavigate('expenses')}
        />
        <ExerciseCard
          exercise={dashboard.exercise}
          status={exerciseStatus}
          error={exerciseError}
          onRetry={retryExerciseSubscription}
          onOpen={() => onNavigate('exercise')}
        />
        <AnimeHomeCard
          watching={animeProgress
            .filter((item) => item.trackingStatus === 'watching')
            .sort((left, right) => right.updatedAt - left.updatedAt)}
          recent={anime.recent}
          status={anime.status}
          onOpen={() => onNavigate('anime')}
        />
        <WeeklyReviewCard referenceDate={referenceDate} onOpen={() => onNavigate('review')} />
      </div>

      <section aria-labelledby="secondary-heading" className="mt-7">
        <h2 id="secondary-heading" className="section-label mb-3">Also available</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <RecentActivity
            items={dashboard.recentActivity}
            sourceLabel={recentActivitySource}
            emptyMessage="No recent records yet."
            onOpen={() => onNavigate('records')}
          />
          <CalendarCard referenceDate={referenceDate} />
        </div>
      </section>
    </div>
  )
}
