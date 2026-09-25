import { parseRinggitToSen } from '../lib/format'
import type { AppPage } from '../components/layout/Navigation'
import type { ExpenseData, IncomeData } from '../types/records'

export type CommandIntent =
  | { kind: 'navigation'; page: AppPage; label: string }
  | { kind: 'expense'; data: ExpenseData }
  | { kind: 'income'; data: IncomeData }
  | { kind: 'exercise'; activity: string }
  | { kind: 'anime-search'; query: string }
  | { kind: 'empty' }

const destinations: Array<{ aliases: string[]; page: AppPage; label: string }> = [
  { aliases: ['home', 'today', 'dashboard'], page: 'today', label: 'Today' },
  { aliases: ['expenses', 'expense', 'finance'], page: 'expenses', label: 'Finance' },
  { aliases: ['exercise', 'workouts', 'movement'], page: 'exercise', label: 'Exercise' },
  { aliases: ['records', 'activity'], page: 'records', label: 'Records' },
  { aliases: ['weekly review', 'review'], page: 'review', label: 'Weekly Review' },
  { aliases: ['anime', 'catalogue'], page: 'anime', label: 'Anime' },
]

function occurredNow(referenceDate: Date): string {
  const date = new Date(referenceDate)
  date.setSeconds(0, 0)
  return date.toISOString()
}

function moneyCommand(input: string, direction: 'expense' | 'income', referenceDate: Date): CommandIntent | null {
  const match = new RegExp(`^(?:add\\s+)?${direction}\\s+(?:rm\\s*)?(\\d+(?:\\.\\d{1,2})?)\\s+(.+)$`, 'i').exec(input)
  if (!match) return null
  const amountSen = parseRinggitToSen(match[1])
  const description = match[2].trim()
  if (!amountSen || !description) return null
  if (direction === 'expense') {
    return { kind: 'expense', data: { amountSen, category: 'food', title: description, occurredAt: occurredNow(referenceDate), source: 'text' } }
  }
  return { kind: 'income', data: { amountSen, category: /salary|payroll|wage/i.test(description) ? 'salary' : 'other', description, occurredAt: occurredNow(referenceDate) } }
}

function normalizeActivity(value: string): string {
  const normalized = value.trim()
  if (/^(run|running)$/i.test(normalized)) return 'Running'
  if (/^(gym|workout)$/i.test(normalized)) return 'Gym'
  if (/^badminton$/i.test(normalized)) return 'Badminton'
  return normalized.slice(0, 80)
}

export function parseCommand(input: string, referenceDate = new Date()): CommandIntent {
  const query = input.trim().replace(/\s+/g, ' ')
  if (!query) return { kind: 'empty' }
  const expense = moneyCommand(query, 'expense', referenceDate)
  if (expense) return expense
  const income = moneyCommand(query, 'income', referenceDate)
  if (income) return income
  const exercise = /^(?:log|add)\s+(?:exercise\s+)?(.+)$/i.exec(query)
  if (exercise && !/^expense\b|^income\b/i.test(exercise[1])) return { kind: 'exercise', activity: normalizeActivity(exercise[1]) }
  const destination = destinations.find((item) => item.aliases.includes(query.toLowerCase()))
  if (destination) return { kind: 'navigation', page: destination.page, label: destination.label }
  return { kind: 'anime-search', query }
}

export function matchingDestinations(input: string): Array<{ page: AppPage; label: string }> {
  const query = input.trim().toLowerCase()
  if (!query) return destinations.map(({ page, label }) => ({ page, label }))
  return destinations
    .filter((item) => item.label.toLowerCase().includes(query) || item.aliases.some((alias) => alias.includes(query)))
    .map(({ page, label }) => ({ page, label }))
}
