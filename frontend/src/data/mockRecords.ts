import type { ExpenseRecord, ExerciseRecord } from '../types/records'

export const mockExpenseRecords: ExpenseRecord[] = [
  {
    id: 'expense-lunch-sep-10',
    amountSen: 3_000,
    category: 'food',
    title: 'Lunch',
    occurredAt: '2026-09-10T12:35:00+08:00',
    createdAt: '2026-09-10T12:39:00+08:00',
    updatedAt: '2026-09-10T12:39:00+08:00',
    source: 'manual',
  },
  {
    id: 'expense-home-supplies-sep-09',
    amountSen: 30_000,
    category: 'shopping',
    title: 'Home supplies',
    note: 'Household restock',
    occurredAt: '2026-09-09T18:20:00+08:00',
    createdAt: '2026-09-09T18:24:00+08:00',
    updatedAt: '2026-09-09T18:24:00+08:00',
    source: 'manual',
  },
  {
    id: 'expense-groceries-sep-07',
    amountSen: 22_000,
    category: 'food',
    title: 'Groceries',
    occurredAt: '2026-09-07T19:10:00+08:00',
    createdAt: '2026-09-07T19:18:00+08:00',
    updatedAt: '2026-09-07T19:18:00+08:00',
    source: 'manual',
  },
  {
    id: 'expense-train-pass-sep-03',
    amountSen: 8_000,
    category: 'transport',
    title: 'Train pass',
    occurredAt: '2026-09-03T08:10:00+08:00',
    createdAt: '2026-09-03T08:12:00+08:00',
    updatedAt: '2026-09-03T08:12:00+08:00',
    source: 'manual',
  },
]

export const mockExerciseRecords: ExerciseRecord[] = [
  {
    id: 'exercise-swimming-sep-09',
    activity: 'Swimming',
    distanceMetres: 1_000,
    durationMinutes: 58,
    occurredAt: '2026-09-09T18:15:00+08:00',
    createdAt: '2026-09-09T19:20:00+08:00',
    updatedAt: '2026-09-09T19:20:00+08:00',
    source: 'manual',
  },
  {
    id: 'exercise-evening-walk-sep-07',
    activity: 'Evening walk',
    distanceMetres: 2_400,
    durationMinutes: 35,
    occurredAt: '2026-09-07T19:30:00+08:00',
    createdAt: '2026-09-07T20:12:00+08:00',
    updatedAt: '2026-09-07T20:12:00+08:00',
    source: 'manual',
  },
]
