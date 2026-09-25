import type { WeeklyReviewReflection, WeeklyReviewReflectionData } from '../types/weeklyReview'

export interface WeeklyReviewRepository {
  subscribe(weekKey: string, observer: { next: (reflection: WeeklyReviewReflection | null) => void; error: (error: unknown) => void }): () => void
  save(weekKey: string, reflection: WeeklyReviewReflectionData): Promise<void>
}
