import { describe, expect, it } from 'vitest'
import type { ExpenseRecord, ExerciseRecord } from '../types/records'
import { selectTimelineGroups } from './recordSelectors'

const morning = new Date(2026, 8, 17, 9).toISOString()
const evening = new Date(2026, 8, 17, 18).toISOString()
const previousDay = new Date(2026, 8, 16, 23).toISOString()

const expenses: ExpenseRecord[] = [
  {
    id: 'lunch', amountSen: 1250, category: 'food', title: 'Lunch',
    source: 'manual', occurredAt: morning, createdAt: morning, updatedAt: morning,
  },
]
const exercises: ExerciseRecord[] = [
  {
    id: 'walk', activity: 'Walk', durationSeconds: 1800, source: 'manual',
    occurredAt: evening, createdAt: evening, updatedAt: evening,
  },
  {
    id: 'run', activity: 'Run', durationSeconds: 1200, source: 'manual',
    occurredAt: previousDay, createdAt: previousDay, updatedAt: previousDay,
  },
]

describe('Records timeline', () => {
  it('groups both domains by local day in descending time order', () => {
    const groups = selectTimelineGroups(expenses, exercises, 'all')
    expect(groups.map((group) => group.dateKey)).toEqual(['2026-09-17', '2026-09-16'])
    expect(groups[0].records.map((item) => item.record.id)).toEqual(['walk', 'lunch'])
  })

  it('keeps Expense and Exercise filters independent', () => {
    expect(selectTimelineGroups(expenses, exercises, 'expenses')
      .flatMap((group) => group.records.map((item) => item.record.id))).toEqual(['lunch'])
    expect(selectTimelineGroups(expenses, exercises, 'exercise')
      .flatMap((group) => group.records.map((item) => item.record.id))).toEqual(['walk', 'run'])
  })
})
