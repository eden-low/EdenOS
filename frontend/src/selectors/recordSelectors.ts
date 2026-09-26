import { formatDateHeading, localDateKey } from '../lib/date'
import type {
  ExpenseRecord,
  ExerciseRecord,
  IncomeRecord,
  RecordFilter,
  TimelineGroup,
  TimelineRecord,
} from '../types/records'
import type { AnimeProgress } from '../types/anime'

export function selectTimelineGroups(
  expenses: ExpenseRecord[],
  exerciseRecords: ExerciseRecord[],
  filter: RecordFilter,
  incomes: IncomeRecord[] = [],
  animeProgress: AnimeProgress[] = [],
): TimelineGroup[] {
  const records: TimelineRecord[] = [
    ...(filter !== 'all' && filter !== 'expenses'
      ? []
      : expenses.map((record) => ({
          kind: 'expense' as const,
          occurredAt: record.occurredAt,
          record,
        }))),
    ...(filter !== 'all' && filter !== 'exercise'
      ? []
      : exerciseRecords.map((record) => ({
          kind: 'exercise' as const,
          occurredAt: record.occurredAt,
          record,
        }))),
    ...(filter !== 'all' && filter !== 'income'
      ? []
      : incomes.map((record) => ({
          kind: 'income' as const,
          occurredAt: record.occurredAt,
          record,
        }))),
    ...(filter !== 'all' && filter !== 'anime'
      ? []
      : animeProgress.map((record) => ({
          kind: 'anime' as const,
          occurredAt: new Date(record.updatedAt).toISOString(),
          record,
        }))),
  ].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt),
  )

  const groups = new Map<string, TimelineGroup>()
  for (const record of records) {
    const dateKey = localDateKey(new Date(record.occurredAt))
    const existing = groups.get(dateKey)
    if (existing) {
      existing.records.push(record)
    } else {
      groups.set(dateKey, {
        dateKey,
        label: formatDateHeading(record.occurredAt),
        records: [record],
      })
    }
  }

  return [...groups.values()]
}
