import type { DashboardConfig } from '../types/dashboard'

export const mockDashboard: DashboardConfig = {
  greeting: 'Good morning, Eden.',
  monthlyBudgetSen: 180_000,
  weeklyExerciseTarget: 3,
  savingsGoal: {
    name: 'Savings Goal',
    allocatedSen: 320_000,
    targetSen: 500_000,
  },
}
