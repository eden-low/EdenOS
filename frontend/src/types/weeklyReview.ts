export interface WeeklyReviewReflection {
  wentWell: string
  improve: string
  nextFocus: string
  updatedAt: number
}

export type WeeklyReviewReflectionData = Omit<WeeklyReviewReflection, 'updatedAt'>
