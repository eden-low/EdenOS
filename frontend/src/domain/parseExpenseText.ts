import { parseRinggitToSen } from '../lib/format'
import type { ExpenseData } from '../types/records'

export type ExpenseTextParseFailure =
  | 'empty'
  | 'missing-amount'
  | 'invalid-amount'
  | 'non-positive-amount'
  | 'amount-too-large'
  | 'missing-description'
  | 'ambiguous'

export type ExpenseTextParseResult =
  | { ok: true; data: ExpenseData }
  | { ok: false; reason: ExpenseTextParseFailure }

export function parseExpenseText(input: string, referenceDate: Date): ExpenseTextParseResult {
  const normalized = input.trim().replace(/\s+/g, ' ')
  if (!normalized) return { ok: false, reason: 'empty' }

  const parts = normalized.split(' ')
  const dateWord = parts.at(-1)?.toLowerCase()
  if (dateWord === 'today' || dateWord === 'yesterday') parts.pop()
  if (parts.some((part) => /^(today|yesterday)$/i.test(part))) {
    return { ok: false, reason: 'ambiguous' }
  }

  let amountText = parts.pop() ?? ''
  if (/^rm$/i.test(amountText)) return { ok: false, reason: 'missing-amount' }
  if (/^rm$/i.test(parts.at(-1) ?? '')) {
    parts.pop()
  } else if (/^rm/i.test(amountText)) {
    amountText = amountText.slice(2)
  }

  const title = parts.join(' ').trim()
  if (parts.some((part) => /\d/.test(part) || /^rm$/i.test(part))) {
    return { ok: false, reason: 'ambiguous' }
  }
  if (!/\d/.test(amountText)) return { ok: false, reason: 'missing-amount' }
  if (/^-\d+(?:\.\d{1,2})?$/.test(amountText)) {
    return { ok: false, reason: 'non-positive-amount' }
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountText)) {
    return { ok: false, reason: 'invalid-amount' }
  }

  const amountSen = parseRinggitToSen(amountText)
  if (amountSen === null) {
    return /^0+(?:\.0{1,2})?$/.test(amountText)
      ? { ok: false, reason: 'non-positive-amount' }
      : { ok: false, reason: 'amount-too-large' }
  }
  if (!title || !/\p{L}/u.test(title)) {
    return { ok: false, reason: 'missing-description' }
  }
  if (Number.isNaN(referenceDate.getTime())) {
    return { ok: false, reason: 'ambiguous' }
  }

  const occurredAt = new Date(referenceDate)
  if (dateWord === 'yesterday') occurredAt.setDate(occurredAt.getDate() - 1)
  occurredAt.setSeconds(0, 0)

  return {
    ok: true,
    data: {
      amountSen,
      category: 'food',
      title,
      occurredAt: occurredAt.toISOString(),
      source: 'text',
    },
  }
}
