import type { ExerciseData } from './records'

export interface FitnessScreenshotCandidate extends Partial<ExerciseData> {
  source: 'fitness_screenshot'
  screenshotDate?: string
  screenshotTime?: string
  needsEdit: boolean
  issue?: string
}
