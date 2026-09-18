import { parseDurationToSeconds } from '../lib/format'
import type { ExerciseData } from '../types/records'

export type ExerciseTextCandidate = Pick<ExerciseData, 'occurredAt' | 'source'> &
  Partial<Pick<ExerciseData, 'activity' | 'durationSeconds'>>

export type ExerciseTextParseResult =
  | { kind: 'empty' }
  | { kind: 'complete'; data: ExerciseData }
  | { kind: 'partial'; candidate: ExerciseTextCandidate }

const activityAliases = [
  { pattern: /^打羽毛球(?=$|[\s\d一半,，:：])/u, activity: 'Badminton' },
  { pattern: /^羽毛球(?=$|[\s\d一半,，:：])/u, activity: 'Badminton' },
  { pattern: /^badminton(?=$|[^a-z])/i, activity: 'Badminton' },
  { pattern: /^跑步(?=$|[\s\d一半,，:：])/u, activity: 'Running' },
  { pattern: /^running(?=$|[^a-z])/i, activity: 'Running' },
  { pattern: /^run(?=$|[^a-z])/i, activity: 'Running' },
  { pattern: /^健身(?=$|[\s\d一半,，:：])/u, activity: 'Gym' },
  { pattern: /^gym(?=$|[^a-z])/i, activity: 'Gym' },
] as const

export function parseExerciseText(input: string, referenceDate: Date): ExerciseTextParseResult {
  const text = input.trim().replace(/\s+/g, ' ')
  if (!text) return { kind: 'empty' }

  const occurredAt = new Date(referenceDate)
  if (Number.isNaN(occurredAt.getTime())) return { kind: 'empty' }
  occurredAt.setSeconds(0, 0)

  const base: ExerciseTextCandidate = { occurredAt: occurredAt.toISOString(), source: 'text' }
  const alias = activityAliases.find(({ pattern }) => pattern.test(text))
  if (alias) {
    const durationText = text.replace(alias.pattern, '').replace(/^[\s,，:：]+/u, '').trim()
    const durationSeconds = parseDurationToSeconds(durationText)
    if (durationSeconds !== null) {
      return {
        kind: 'complete',
        data: { ...base, activity: alias.activity, durationSeconds },
      }
    }
    return { kind: 'partial', candidate: { ...base, activity: alias.activity } }
  }

  // Keep unfamiliar activity wording for the user to check, without treating it as an alias.
  const durationStart = text.search(/\d|一个半|一小时|半小时/u)
  const activityText = (durationStart < 0 ? text : text.slice(0, durationStart))
    .replace(/[\s,，:：]+$/u, '').trim()
  const durationText = durationStart < 0 ? '' : text.slice(durationStart).trim()
  const activity = activityText.length <= 80 && /\p{L}/u.test(activityText)
    ? activityText
    : undefined
  const durationSeconds = parseDurationToSeconds(durationText)

  return {
    kind: 'partial',
    candidate: {
      ...base,
      ...(activity ? { activity } : {}),
      ...(durationSeconds === null ? {} : { durationSeconds }),
    },
  }
}
