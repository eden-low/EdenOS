import {
  MAX_BATCH_TRANSACTIONS,
  markBatchDuplicates,
  suggestedCategory,
  type BatchTransactionCandidate,
  type BatchTransactionDisposition,
} from './batchTransactions'
import { toLocalDateInput } from '../lib/date'

export type ScreenshotAmountSign = 'positive' | 'negative' | 'unsigned' | 'unknown'
export type ScreenshotTransactionKind =
  | 'payment' | 'income' | 'earnings' | 'transfer' | 'reload' | 'reward' | 'unknown'

export interface BatchScreenshotRow {
  date: string | null
  time: string | null
  description: string
  amountSen: number | null
  amountSign: ScreenshotAmountSign
  currency: string | null
  sourceText: string | null
  transactionKind: ScreenshotTransactionKind
  dispositionSuggestion: BatchTransactionDisposition | null
  dateInferred: boolean
  uncertain: boolean
  issues: string[]
}

export interface BatchScreenshotExtraction {
  rows: BatchScreenshotRow[]
  totalVisibleRows: number
  partial: boolean
  excludedRewardRows: number
  issues: string[]
}

export interface BatchScreenshotCandidateResult {
  candidates: BatchTransactionCandidate[]
  warnings: string[]
  totalVisibleRows: number
}

const signs = new Set<ScreenshotAmountSign>(['positive', 'negative', 'unsigned', 'unknown'])
const kinds = new Set<ScreenshotTransactionKind>([
  'payment', 'income', 'earnings', 'transfer', 'reload', 'reward', 'unknown',
])
const rewardPattern = /(?:\bpoints?\b|\bpts\b|rewards?|积分|積分|點數)/i
const transferPattern = /(?:go\+|quick\s+(?:cash\s+in|reload)|cash\s+in|top[ -]?up|reload|own\s+wallet|wallet\s+(?:balance\s+)?transfer|e-?wallet\s+balance|internal\s+(?:transfer|movement)|转账|轉賬|余额|餘額|转出|轉出)/i
const incomePattern = /(?:salary|payroll|wages?|received|earnings?|daily\s+earnings|refund|cashback|接收|收到|收益|退款)/i
const expensePattern = /(?:payment|purchase|merchant|paid|付款|支付|消费|消費)/i
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function validDate(value: string): boolean {
  if (!datePattern.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function shortString(value: unknown, maximum: number): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, maximum) : null
}

function stringIssues(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().replace(/\s+/g, ' ').slice(0, 160))
    .filter(Boolean)
    .slice(0, 5)
}

function suggestDisposition(row: Pick<BatchScreenshotRow,
  'description' | 'sourceText' | 'transactionKind' | 'amountSign'>): BatchTransactionDisposition | null {
  const text = `${row.description} ${row.sourceText ?? ''}`
  if (row.transactionKind === 'transfer' || row.transactionKind === 'reload' || transferPattern.test(text)) return 'ignore'
  if (row.transactionKind === 'income' || row.transactionKind === 'earnings' || incomePattern.test(text)) return 'income'
  if (row.transactionKind === 'payment' || expensePattern.test(text) || row.amountSign === 'negative') return 'expense'
  if (row.amountSign === 'positive') return 'income'
  return null
}

function normalizeRow(value: unknown): { row: BatchScreenshotRow | null; reward: boolean; discarded: boolean } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { row: null, reward: false, discarded: true }
  }
  const raw = value as Record<string, unknown>
  const description = shortString(raw.description, 120) ?? ''
  const sourceText = shortString(raw.sourceText, 240)
  const kind = typeof raw.transactionKind === 'string' && kinds.has(raw.transactionKind as ScreenshotTransactionKind)
    ? raw.transactionKind as ScreenshotTransactionKind : 'unknown'
  if (kind === 'reward' || rewardPattern.test(`${description} ${sourceText ?? ''}`)) {
    return { row: null, reward: true, discarded: false }
  }

  const issues = stringIssues(raw.issues)
  let date = shortString(raw.date, 10)
  if (date && !validDate(date)) {
    date = null
    issues.push('The extracted transaction date was not valid.')
  }
  let time = shortString(raw.time, 5)
  if (time && !timePattern.test(time)) {
    time = null
    issues.push('The extracted transaction time was not valid.')
  }
  const amountSen = typeof raw.amountSen === 'number' && Number.isSafeInteger(raw.amountSen) && raw.amountSen > 0
    ? raw.amountSen : null
  if (amountSen === null) issues.push('Check the monetary amount.')
  if (!description) issues.push('Check the description or source.')
  const amountSign = typeof raw.amountSign === 'string' && signs.has(raw.amountSign as ScreenshotAmountSign)
    ? raw.amountSign as ScreenshotAmountSign : 'unknown'
  const currency = shortString(raw.currency, 12)
  const base = {
    date,
    time,
    description,
    amountSen,
    amountSign,
    currency,
    sourceText,
    transactionKind: kind,
    dateInferred: raw.dateInferred === true,
    uncertain: raw.uncertain !== false,
    issues: [...new Set(issues)],
  }
  return { row: { ...base, dispositionSuggestion: suggestDisposition(base) }, reward: false, discarded: false }
}

/** Validate and partially preserve a provider response. Individual bad rows do not erase usable rows. */
export function normalizeBatchScreenshotExtraction(value: unknown): BatchScreenshotExtraction | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (!Array.isArray(raw.rows)) return null
  const rows: BatchScreenshotRow[] = []
  let excludedRewardRows = typeof raw.excludedRewardRows === 'number' &&
    Number.isSafeInteger(raw.excludedRewardRows) && raw.excludedRewardRows >= 0 ? raw.excludedRewardRows : 0
  let discardedRows = 0
  for (const valueRow of raw.rows) {
    const normalized = normalizeRow(valueRow)
    if (normalized.reward) excludedRewardRows += 1
    else if (normalized.discarded) discardedRows += 1
    else if (normalized.row) rows.push(normalized.row)
  }
  const totalVisibleRows = typeof raw.totalVisibleRows === 'number' && Number.isSafeInteger(raw.totalVisibleRows) && raw.totalVisibleRows >= 0
    ? raw.totalVisibleRows : raw.rows.length
  return {
    rows,
    totalVisibleRows,
    partial: raw.partial === true || discardedRows > 0 || rows.some((row) => row.issues.length > 0),
    excludedRewardRows,
    issues: stringIssues(raw.issues),
  }
}

export function screenshotExtractionToCandidates(
  extraction: BatchScreenshotExtraction,
  today = toLocalDateInput(new Date()),
): BatchScreenshotCandidateResult {
  if (extraction.totalVisibleRows > MAX_BATCH_TRANSACTIONS || extraction.rows.length > MAX_BATCH_TRANSACTIONS) {
    throw new Error('too-many')
  }
  const candidates = extraction.rows.map<BatchTransactionCandidate>((row, index) => {
    const direction = row.dispositionSuggestion
    const categoryDirection = direction === 'income' ? 'income' : 'expense'
    const dateDefaulted = row.date === null
    return {
      tempId: `screenshot-${index + 1}`,
      sourceLine: index + 1,
      direction,
      amountSen: row.amountSen,
      amountInput: row.amountSen === null ? '' : (row.amountSen / 100).toFixed(2),
      date: row.date ?? today,
      time: row.time,
      description: row.description,
      category: suggestedCategory(categoryDirection, row.description),
      note: '',
      dateDefaulted,
      dateInferred: row.dateInferred,
      duplicate: false,
      extracted: true,
      needsReview: row.uncertain || row.issues.length > 0 || direction === null || row.amountSen === null ||
        !row.description || dateDefaulted || row.dateInferred,
      ...(row.sourceText ? { sourceText: row.sourceText } : {}),
      extractionIssues: row.issues,
    }
  })
  const warnings = [...extraction.issues]
  if (extraction.partial) warnings.push('Some rows could not be read completely. Review every extracted row.')
  if (extraction.excludedRewardRows > 0) {
    warnings.push(`${extraction.excludedRewardRows} rewards or points ${extraction.excludedRewardRows === 1 ? 'line was' : 'lines were'} excluded.`)
  }
  return { candidates: markBatchDuplicates(candidates), warnings: [...new Set(warnings)],
    totalVisibleRows: extraction.totalVisibleRows }
}
