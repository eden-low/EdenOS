import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  SportShoe,
  Waves,
  type LucideIcon,
} from 'lucide-react'

const activityIconMappings: Array<{ keywords: string[]; icon: LucideIcon }> = [
  { keywords: ['swimming', 'swim'], icon: Waves },
  { keywords: ['badminton', 'tennis', 'racket'], icon: SportShoe },
  { keywords: ['running', 'run', 'jogging'], icon: Footprints },
  { keywords: ['walking', 'walk', 'hiking'], icon: Footprints },
  { keywords: ['cycling', 'bike', 'bicycle'], icon: Bike },
  { keywords: ['gym', 'strength', 'weights', 'weightlifting'], icon: Dumbbell },
]

export function getExerciseActivityIcon(activity: string): LucideIcon {
  const normalizedWords = new Set(
    activity
      .trim()
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .filter(Boolean),
  )

  return (
    activityIconMappings.find(({ keywords }) =>
      keywords.some((keyword) => normalizedWords.has(keyword)),
    )?.icon ?? Activity
  )
}
