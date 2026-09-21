import { useMemo } from 'react'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DailyContext } from '../components/dashboard/DailyContext'
import { ExerciseCard } from '../components/dashboard/ExerciseCard'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { SavingsGoalCard } from '../components/dashboard/SavingsGoalCard'
import { SpendingCard } from '../components/dashboard/SpendingCard'
import { CalendarCard } from '../components/dashboard/CalendarCard'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { selectDashboardSummary } from '../selectors/dashboardSelectors'
import { useRecords } from '../state/useRecords'

export function TodayPage() {
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
  const referenceDate = useLocalReferenceDate()
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
      <DailyContext referenceDate={referenceDate} />

      <div className="mt-4 grid grid-cols-2 items-stretch gap-3 sm:mt-5 sm:gap-4 md:grid-cols-6 xl:grid-cols-12">
        <SpendingCard
          spending={dashboard.monthlySpending}
          finance={dashboard.monthlyFinance}
          status={expenseStatus}
          incomeStatus={incomeStatus}
          error={expenseError}
          incomeError={incomeError}
          onRetry={retryExpenseSubscription}
          onRetryIncome={retryIncomeSubscription}
        />
        <RecentActivity
          items={dashboard.recentActivity}
          sourceLabel={recentActivitySource}
          emptyMessage={recentActivityEmptyMessage}
        />
        <ExerciseCard
          exercise={dashboard.exercise}
          status={exerciseStatus}
          error={exerciseError}
          onRetry={retryExerciseSubscription}
        />
        <SavingsGoalCard />
        <CalendarCard referenceDate={referenceDate} />
      </div>
    </div>
  )
}
