import { parseRinggitToSen } from '../lib/format'

export const currencyCodes = ['MYR', 'USD', 'SGD', 'JPY', 'EUR', 'GBP', 'AUD', 'CNY', 'HKD', 'THB', 'IDR', 'KRW', 'TWD', 'INR', 'CAD', 'CHF', 'NZD'] as const
export type CurrencyCode = typeof currencyCodes[number]
export interface ReferenceRate { base: string; quote: 'MYR'; rate: string; date: string }
/** Form state only. Never part of an ExpenseData/IncomeData record. */
export interface ConversionDraft {
  currency: string
  mode: 'latest' | 'historical'
  bankMyr: string
  reference?: ReferenceRate
  referenceKey?: string
}
export function newConversion(currency = 'MYR'): ConversionDraft { return { currency, mode: 'historical', bankMyr: '' } }
export function currencyDecimals(currency: string): number { return ['JPY', 'KRW'].includes(currency) ? 0 : 2 }
export function validRateDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function referenceKey(draft: ConversionDraft, date: string): string { return `${draft.currency}:${draft.mode === 'historical' ? date : 'latest'}` }
export function isReferenceFresh(rate: ReferenceRate, targetDate: string): boolean {
  if (!validRateDate(rate.date) || !validRateDate(targetDate)) return false
  const days = (Date.parse(targetDate) - Date.parse(rate.date)) / 86400000
  // Weekends and short publication holidays are allowed, with the actual date visible.
  return days >= 0 && days <= 7
}
function decimal(value: string, precision: number): { units: bigint; scale: bigint } | null {
  if (value.length > 30 || !new RegExp(`^\\d+(?:\\.\\d{1,${precision}})?$`).test(value.trim())) return null
  const [whole, fraction = ''] = value.trim().split('.')
  if (fraction.length > precision) return null
  const units = BigInt(whole + fraction)
  return units > 0n ? { units, scale: 10n ** BigInt(fraction.length) } : null
}
export function convertToSen(amount: string, currency: string, rate: string): number | null {
  // BigInt rational arithmetic, with one half-up rounding at the final MYR sen.
  const original = currencyDecimals(currency) === 0
    ? (/^\d+$/.test(amount.trim()) && amount.length <= 30 ? { units: BigInt(amount), scale: 1n } : null)
    : decimal(amount, currencyDecimals(currency))
  const multiplier = decimal(rate, 15)
  if (!original || original.units <= 0n || !multiplier) return null
  const numerator = original.units * multiplier.units * 100n
  const denominator = original.scale * multiplier.scale
  const rounded = (numerator + denominator / 2n) / denominator
  return rounded > 0n && rounded <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(rounded) : null
}
export function resolvedAmountSen(amount: string, draft: ConversionDraft | undefined, date: string, today = new Date().toISOString().slice(0, 10)): number | null {
  if (!draft || draft.currency === 'MYR') return parseRinggitToSen(amount)
  if (!draft.currency) return null
  if (draft.bankMyr.trim()) return parseRinggitToSen(draft.bankMyr)
  const rate = draft.reference
  if (!rate || draft.referenceKey !== referenceKey(draft, date) || rate.base !== draft.currency || rate.quote !== 'MYR' ||
    !isReferenceFresh(rate, draft.mode === 'historical' ? date : today)) return null
  return convertToSen(amount, draft.currency, rate.rate)
}
/** Deliberately conservative: bare $ / ¥ and conflicting codes are not currencies. */
export function detectCurrency(text: string): string | null {
  const codes = new Set((text.toUpperCase().match(/(?<![A-Z])[A-Z]{3}(?![A-Z])/g) ?? []).filter((code) => (currencyCodes as readonly string[]).includes(code)))
  if (/\bRM\s*\d/i.test(text)) codes.add('MYR')
  if (/US\$/.test(text)) codes.add('USD')
  if (/(?<![A-Z])S\$/.test(text)) codes.add('SGD')
  if (/€/.test(text)) codes.add('EUR')
  if (/£/.test(text)) codes.add('GBP')
  return codes.size === 1 ? [...codes][0] : null
}

export function hasForeignCurrencyHint(text: string): boolean {
  const currency = detectCurrency(text)
  return currency !== null && currency !== 'MYR' || /[$€£¥]|\b(?!MYR\b)[A-Z]{3}\s*[+-]?\d/.test(text)
}

export function amountFromEvidence(text: string): string | undefined {
  const values = text.match(/\d[\d,]*(?:\.\d+)?/g)
  return values?.length === 1 ? values[0].replaceAll(',', '') : undefined
}

export function minorUnitsToInput(units: number | null, currency: string | null): string {
  if (units === null) return ''
  if (currency && currencyDecimals(currency) === 0) return String(units)
  return `${Math.floor(units / 100)}.${String(units % 100).padStart(2, '0')}`
}
