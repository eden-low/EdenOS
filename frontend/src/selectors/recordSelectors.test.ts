import { describe, expect, it } from 'vitest'
import type { ExpenseRecord, ExerciseRecord, IncomeRecord } from '../types/records'
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
    expect(groups[0].records.map((item) => 'id' in item.record ? item.record.id : item.record.externalId)).toEqual(['walk', 'lunch'])
  })

  it('keeps Expense and Exercise filters independent', () => {
    expect(selectTimelineGroups(expenses, exercises, 'expenses')
      .flatMap((group) => group.records.map((item) => 'id' in item.record ? item.record.id : item.record.externalId))).toEqual(['lunch'])
    expect(selectTimelineGroups(expenses, exercises, 'exercise')
      .flatMap((group) => group.records.map((item) => 'id' in item.record ? item.record.id : item.record.externalId))).toEqual(['walk', 'run'])
  })

  it('includes Income in All and isolates the Income filter', () => {
    const income: IncomeRecord = {
      id: 'salary', amountSen: 100000, category: 'salary', description: 'Salary',
      occurredAt: evening, createdAt: evening, updatedAt: evening,
    }
    expect(selectTimelineGroups([], [], 'all', [income])[0].records[0].kind).toBe('income')
    expect(selectTimelineGroups(expenses, exercises, 'income', [income])
      .flatMap((group) => group.records.map((item) => 'id' in item.record ? item.record.id : item.record.externalId))).toEqual(['salary'])
  })

  it('adds latest Anime progress without claiming episode history', () => {
    const anime = { externalId: 'frieren', animeId: 'frieren', title: 'Frieren', currentEpisode: 4, positionSeconds: 0, durationSeconds: 0, watchedEpisodes: [1, 2, 3], trackingStatus: 'watching' as const, updatedAt: new Date(evening).getTime() + 1, }
    const records = selectTimelineGroups(expenses, exercises, 'all', [], [anime]).flatMap((group) => group.records)
    expect(records[0]).toMatchObject({ kind: 'anime', record: { title: 'Frieren', currentEpisode: 4 } })
  })

  it('includes Income in All and isolates the Income filter', () => {
    const income: IncomeRecord = {
      id: 'salary', amountSen: 100000, category: 'salary', description: 'Salary',
      occurredAt: evening, createdAt: evening, updatedAt: evening,
    }
    expect(selectTimelineGroups([], [], 'all', [income])[0].records[0].kind).toBe('income')
    expect(selectTimelineGroups(expenses, exercises, 'income', [income])
      .flatMap((group) => group.records)).toMatchObject([
      { kind: 'income', record: { id: 'salary' } },
    ])
  })
})
