import { useMemo } from 'react'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { ExerciseCard } from '../components/dashboard/ExerciseCard'
import { PendingDrafts } from '../components/dashboard/PendingDrafts'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { SavingsGoalCard } from '../components/dashboard/SavingsGoalCard'
import { DailySpendingCards, SpendingCard } from '../components/dashboard/SpendingCard'
import { mockDashboard } from '../data/mockDashboard'
import { selectDashboardSummary } from '../selectors/dashboardSelectors'
import { useRecords } from '../state/useRecords'

export function TodayPage() {
  const { expenses, exerciseRecords, drafts } = useRecords()
  const dashboard = useMemo(
    () => selectDashboardSummary(mockDashboard, expenses, exerciseRecords, drafts),
    [drafts, exerciseRecords, expenses],
  )

  return (
    <div className="mx-auto w-full max-w-[80rem] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <DashboardHeader greeting={dashboard.greeting} displayDate={dashboard.displayDate} />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-6 xl:grid-cols-12">
        <SavingsGoalCard goal={dashboard.savingsGoal} />
        <SpendingCard budget={dashboard.monthlyBudget} />
        <DailySpendingCards budget={dashboard.monthlyBudget} />
        <ExerciseCard exercise={dashboard.exercise} />
        <RecentActivity items={dashboard.recentActivity} />
        <PendingDrafts count={dashboard.pendingDraftCount} />
      </div>
    </div>
  )
}
