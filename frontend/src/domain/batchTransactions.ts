import { isExpenseCategory } from './expense'
import { isIncomeCategory } from './income'
import { toLocalDateInput } from '../lib/date'
import type { ExpenseCategory, IncomeCategory } from '../types/records'

export const MAX_BATCH_TRANSACTIONS = 100

export type BatchTransactionDirection = 'income' | 'expense'
export type BatchTransactionCategory = ExpenseCategory | IncomeCategory

export interface BatchTransactionCandidate {
  tempId: string
  sourceLine: number
  direction: BatchTransactionDirection | null
  amountSen: number | null
  amountInput: string
  date: string
  description: string
  category: BatchTransactionCategory
  note: string
  dateDefaulted: boolean
  duplicate: boolean
}

export interface BatchParseResult {
  candidates: BatchTransactionCandidate[]
  inputRowCount: number
  error: string | null
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const isoDateSearchPattern = /\b\d{4}-\d{2}-\d{2}\b/

function validDateKey(value: string): boolean {
  if (!isoDatePattern.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function parseSignedRinggit(value: string): { amountSen: number; direction: BatchTransactionDirection } | null {
  const match = /^([+-])?\s*(?:RM\s*)?(\d+(?:\.\d{1,2})?)$/i.exec(value.trim())
  if (!match) return null
  const [whole, fraction = ''] = match[2].split('.')
  const amountSen = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(amountSen) || amountSen <= 0) return null
  return { amountSen, direction: match[1] === '-' ? 'expense' : 'income' }
}

function normalizeDescription(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function suggestedCategory(direction: BatchTransactionDirection, description: string): BatchTransactionCategory {
  const value = description.toLowerCase()
  if (direction === 'income') {
    if (/salary|payroll|wage/.test(value)) return 'salary'
    if (/freelance|client|contract/.test(value)) return 'freelance'
    if (/business|sales|commission/.test(value)) return 'business'
    if (/dividend|interest|investment/.test(value)) return 'investment'
    if (/gift|allowance/.test(value)) return 'gift'
    if (/refund|reimbursement/.test(value)) return 'refund'
    return 'other'
  }
  if (/lunch|dinner|breakfast|food|grocer|restaurant|cafe|coffee/.test(value)) return 'food'
  if (/grab|uber|taxi|transport|train|bus|petrol|fuel|parking/.test(value)) return 'transport'
  if (/rent|mortgage|housing|utility|electric|water bill/.test(value)) return 'housing'
  if (/doctor|clinic|hospital|health|medicine|pharmacy/.test(value)) return 'health'
  if (/school|course|book|education|tuition/.test(value)) return 'education'
  if (/movie|game|concert|entertainment/.test(value)) return 'entertainment'
  if (/shop|clothes|clothing|purchase/.test(value)) return 'shopping'
  return 'other'
}

function explicitDirection(value: string): BatchTransactionDirection | null {
  if (/^income\b/i.test(value.trim())) return 'income'
  if (/^expense\b/i.test(value.trim())) return 'expense'
  return null
}

function stripDirectionLabel(value: string): string {
  return value.replace(/^\s*(?:income|expense)\b\s*[:,-]?\s*/i, '')
}

function parseDelimitedLine(line: string) {
  const separator = line.includes('\t') ? '\t' : ','
  const cells = line.split(separator).map((cell) => cell.trim()).filter(Boolean)
  const dateCell = cells.find((cell) => isoDatePattern.test(cell))
  const amountCell = cells.find((cell) => parseSignedRinggit(cell) !== null)
    ?? cells.find((cell) => /[+-]?\d/.test(cell))
  const labelledCell = cells.find((cell) => explicitDirection(cell) !== null)
  const description = normalizeDescription(cells
    .filter((cell) => cell !== dateCell && cell !== amountCell && cell !== labelledCell)
    .map(stripDirectionLabel)
    .join(' '))
  return {
    rawDate: dateCell ?? null,
    rawAmount: amountCell ?? '',
    description: description || normalizeDescription(stripDirectionLabel(labelledCell ?? '')),
    labelledDirection: labelledCell ? explicitDirection(labelledCell) : explicitDirection(line),
  }
}

function parseTextLine(line: string) {
  const dateMatch = line.match(isoDateSearchPattern)
  const rawDate = dateMatch?.[0] ?? null
  let remainder = rawDate ? line.replace(rawDate, ' ') : line
  const labelledDirection = explicitDirection(remainder)
  remainder = stripDirectionLabel(remainder)
  const amountMatch = remainder.match(/(?:^|\s)([+-]?\s*(?:RM\s*)?\S+)\s*$/i)
  const rawAmount = amountMatch?.[1]?.replace(/\s+/g, ' ').trim() ?? ''
  if (amountMatch) remainder = remainder.slice(0, amountMatch.index).trim()
  return {
    rawDate,
    rawAmount,
    description: normalizeDescription(remainder.replace(/[;,]+$/g, '')),
    labelledDirection,
  }
}

function parseLine(line: string, sourceLine: number, today: string): BatchTransactionCandidate {
  const parsed = line.includes(',') || line.includes('\t') ? parseDelimitedLine(line) : parseTextLine(line)
  const money = parseSignedRinggit(parsed.rawAmount)
  const conflict = Boolean(parsed.labelledDirection && money && parsed.labelledDirection !== money.direction)
  const direction = conflict ? null : (parsed.labelledDirection ?? money?.direction ?? null)
  const dateIsPresent = parsed.rawDate !== null
  const date = dateIsPresent ? (validDateKey(parsed.rawDate!) ? parsed.rawDate! : '') : today
  return {
    tempId: `batch-${sourceLine}`,
    sourceLine,
    direction,
    amountSen: money?.amountSen ?? null,
    amountInput: money ? (money.amountSen / 100).toFixed(2) : parsed.rawAmount,
    date,
    description: parsed.description,
    category: suggestedCategory(direction ?? 'expense', parsed.description),
    note: '',
    dateDefaulted: !dateIsPresent,
    duplicate: false,
  }
}

function duplicateKey(candidate: BatchTransactionCandidate): string | null {
  if (!candidate.direction || candidate.amountSen === null || !validDateKey(candidate.date) || !candidate.description.trim()) return null
  return [candidate.date, candidate.direction, candidate.amountSen, normalizeDescription(candidate.description).toLowerCase()].join('|')
}

export function markBatchDuplicates(candidates: BatchTransactionCandidate[]): BatchTransactionCandidate[] {
  const counts = new Map<string, number>()
  for (const candidate of candidates) {
    const key = duplicateKey(candidate)
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return candidates.map((candidate) => {
    const key = duplicateKey(candidate)
    return { ...candidate, duplicate: key !== null && (counts.get(key) ?? 0) > 1 }
  })
}

export function candidateIssues(candidate: BatchTransactionCandidate): string[] {
  const issues: string[] = []
  if (!candidate.direction) issues.push('Choose Income or Expense.')
  if (candidate.amountSen === null) issues.push('Enter a valid amount greater than RM 0 with no more than 2 decimal places.')
  if (!validDateKey(candidate.date)) issues.push('Choose a valid date.')
  if (!candidate.description.trim()) issues.push('Add a description or source.')
  if (candidate.direction === 'expense' && !isExpenseCategory(candidate.category)) issues.push('Choose an Expense category.')
  if (candidate.direction === 'income' && !isIncomeCategory(candidate.category)) issues.push('Choose an Income category.')
  return issues
}

export function isBatchCandidateValid(candidate: BatchTransactionCandidate): boolean {
  return candidateIssues(candidate).length === 0
}

export function parseBatchTransactions(input: string, today = toLocalDateInput(new Date())): BatchParseResult {
  const rows = input.split(/\r?\n/)
    .map((value, index) => ({ value: value.trim(), sourceLine: index + 1 }))
    .filter((row) => row.value.replace(/[\s,;\t]/g, '').length > 0)
  if (rows.length === 0) return { candidates: [], inputRowCount: 0, error: 'Paste at least one transaction row.' }
  if (rows.length > MAX_BATCH_TRANSACTIONS) {
    return { candidates: [], inputRowCount: rows.length, error: `Batch Import V1 accepts up to ${MAX_BATCH_TRANSACTIONS} transactions at a time. No rows were prepared.` }
  }
  const candidates = markBatchDuplicates(rows.map((row) => parseLine(row.value, row.sourceLine, today)))
  return { candidates, inputRowCount: rows.length, error: null }
}

export function updateCandidateDirection(candidate: BatchTransactionCandidate, direction: BatchTransactionDirection): BatchTransactionCandidate {
  const category = direction === 'expense' && isExpenseCategory(candidate.category)
    ? candidate.category
    : direction === 'income' && isIncomeCategory(candidate.category)
      ? candidate.category
      : suggestedCategory(direction, candidate.description)
  return { ...candidate, direction, category }
}

export function updateCandidateAmount(candidate: BatchTransactionCandidate, amountInput: string): BatchTransactionCandidate {
  const money = amountInput.trim().startsWith('-') ? null : parseSignedRinggit(amountInput)
  return { ...candidate, amountInput, amountSen: money?.amountSen ?? null }
}
