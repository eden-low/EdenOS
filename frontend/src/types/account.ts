export interface GuestDataSummary {
  expensesCount: number
  incomesCount: number
  exercisesCount: number
  hasBodyWeight: boolean
  hasHeight: boolean
  hasBudget: boolean
  hasSavingsGoal: boolean
  animeProgressCount: number
  animeCloudProgressCount: number
  otherBlockingData: string[]
  hasBlockingData: boolean
}

export type ConnectGoogleResult =
  | { status: 'connected' | 'cancelled' }
  | { status: 'existing-account'; summary: GuestDataSummary }
  | { status: 'existing-unavailable' }

export type ContinueExistingGoogleResult =
  | { status: 'connected' | 'cancelled' }
  | { status: 'blocked'; summary: GuestDataSummary }
