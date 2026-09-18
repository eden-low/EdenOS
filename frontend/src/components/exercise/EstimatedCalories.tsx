import { useContext } from 'react'
import { estimateExerciseCalories } from '../../domain/estimatedCalories'
import { UserSettingsContext } from '../../state/userSettingsContextDefinition'
import type { ExerciseData } from '../../types/records'

export function EstimatedCalories({ exercise, compact = false }: {
  exercise: Pick<ExerciseData, 'activity' | 'durationSeconds' | 'intensity'>
  compact?: boolean
}) {
  const account = useContext(UserSettingsContext)
  if (account?.status === 'loading') return compact ? null : <p className="text-sm text-[var(--text-muted)]">Estimated Calories loading…</p>
  if (account?.status === 'error') return compact ? null : <p className="text-sm text-[var(--text-muted)]">Estimated Calories unavailable while account settings load.</p>
  const result = estimateExerciseCalories(exercise, account?.settings.bodyWeightKg ?? null)
  if (result.status === 'estimated') {
    return <p className="text-sm text-[var(--text-secondary)]">Estimated Calories · {result.roundedKcal} kcal</p>
  }
  if (compact) return null
  const message = result.status === 'missing-weight'
    ? 'Add body weight in Account to estimate calories.'
    : result.status === 'unsupported-activity'
      ? 'Estimated Calories unavailable for this activity.'
      : result.status === 'unsupported-intensity'
        ? 'Estimated Calories unavailable for this intensity.'
        : 'Estimated Calories unavailable without a valid duration.'
  return <p className="text-sm text-[var(--text-muted)]">{message}</p>
}
