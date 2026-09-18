import { useMemo } from 'react'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DailyQuote } from '../components/dashboard/DailyQuote'
import { ExerciseCard } from '../components/dashboard/ExerciseCard'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { SavingsGoalCard } from '../components/dashboard/SavingsGoalCard'
import { DailySpendingCards, SpendingCard } from '../components/dashboard/SpendingCard'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { selectDashboardSummary } from '../selectors/dashboardSelectors'
import { useRecords } from '../state/useRecords'

export function TodayPage() {
  const {
    expenses,
    exerciseRecords,
    expenseStatus,
    expenseError,
    exerciseStatus,
    exerciseError,
    retryExpenseSubscription,
    retryExerciseSubscription,
  } = useRecords()
  const referenceDate = useLocalReferenceDate()
  const dashboard = useMemo(
    () =>
      selectDashboardSummary(
        expenseStatus === 'loaded' ? expenses : [],
        exerciseStatus === 'loaded' ? exerciseRecords : [],
        referenceDate,
      ),
    [exerciseRecords, exerciseStatus, expenseStatus, expenses, referenceDate],
  )
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
  const recentActivityEmptyMessage =
    expenseStatus === 'loaded' && exerciseStatus === 'loaded'
      ? 'No recent activity yet'
      : expenseStatus === 'loaded' || exerciseStatus === 'loaded'
        ? 'No recent activity in available records'
        : expenseStatus === 'loading' || exerciseStatus === 'loading'
          ? 'Loading recent activity…'
          : 'Recent activity unavailable'

  return (
    <div className="core-page mx-auto w-full max-w-[80rem] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <DashboardHeader greeting={dashboard.greeting} displayDate={dashboard.displayDate} />
      <DailyQuote referenceDate={referenceDate} />

      <div className="mt-4 grid grid-cols-2 items-stretch gap-3 sm:mt-5 sm:gap-4 md:grid-cols-6 xl:grid-cols-12">
        <SpendingCard
          spending={dashboard.monthlySpending}
          status={expenseStatus}
          error={expenseError}
          onRetry={retryExpenseSubscription}
        />
        <RecentActivity
          items={dashboard.recentActivity}
          sourceLabel={recentActivitySource}
          emptyMessage={recentActivityEmptyMessage}
        />
        <DailySpendingCards spending={dashboard.monthlySpending} status={expenseStatus} />
        <ExerciseCard
          exercise={dashboard.exercise}
          status={exerciseStatus}
          error={exerciseError}
          onRetry={retryExerciseSubscription}
        />
        <SavingsGoalCard />
      </div>
    </div>
  )
}
