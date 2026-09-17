import { combineLocalDateTime } from '../src/lib/date'
import { parseRinggitToSen } from '../src/lib/format'
import type { ReceiptExtractionResponse } from '../src/types/receipt'

export interface ReceiptExtractionInput {
  image: Uint8Array
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface ReceiptExtractionProvider {
  extract(input: ReceiptExtractionInput, model: string): Promise<unknown>
}

export interface ValidatedReceiptExtraction {
  merchant: string | null
  amountSen: number | null
  receiptDate: string | null
  amountIssue: 'missing' | 'ambiguous' | null
  usableAmount: boolean
  schemaValid: boolean
}

export type ReceiptExtractionResult = ReceiptExtractionResponse

const blank: ValidatedReceiptExtraction = {
  merchant: null, amountSen: null, receiptDate: null,
  amountIssue: 'missing', usableAmount: false, schemaValid: false,
}

const genericMerchant = /^(?:receipt|tax invoice|invoice|thank you|total|grand total)$/i
const evidenceAmount = /(?:RM\s*)?(\d[\d,]*(?:\.\d{1,2})?)/gi

function validDate(value: string): boolean {
  return combineLocalDateTime(value, '12:00') !== null
}

function evidenceMatches(evidence: string, amountSen: number): boolean {
  if (/\b(?:subtotal|tax|sst|change|cash|discount)\b/i.test(evidence)) return false
  const matches = [...evidence.matchAll(evidenceAmount)]
    .map((match) => parseRinggitToSen(match[1].replaceAll(',', '')))
    .filter((amount): amount is number => amount !== null)
  return matches.length === 0 || (matches.length === 1 && matches[0] === amountSen)
}

export function validateReceiptExtraction(value: unknown): ValidatedReceiptExtraction {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...blank }
  const fields = value as Record<string, unknown>
  let schemaValid = true

  let merchant: string | null = null
  if (fields.merchant === null) {
    // An unknown merchant is a valid partial result.
  } else if (typeof fields.merchant === 'string') {
    const trimmed = fields.merchant.trim()
    if (trimmed.length > 80) schemaValid = false
    else if (trimmed && !genericMerchant.test(trimmed)) merchant = trimmed
  } else schemaValid = false

  let receiptDate: string | null = null
  if (fields.receiptDate === null) {
    // The form supplies its normal local date default.
  } else if (typeof fields.receiptDate === 'string' && validDate(fields.receiptDate)) {
    receiptDate = fields.receiptDate
  } else schemaValid = false

  if (fields.dateEvidence !== null &&
      (typeof fields.dateEvidence !== 'string' || fields.dateEvidence.length > 120)) schemaValid = false
  if (fields.amountEvidence !== null &&
      (typeof fields.amountEvidence !== 'string' || fields.amountEvidence.length > 120)) schemaValid = false

  const ambiguous = fields.ambiguousAmount === true
  if (typeof fields.ambiguousAmount !== 'boolean') schemaValid = false
  let amountSen: number | null = null
  if (fields.amountSen === null) {
    // A missing amount stays empty for the user to fill in.
  } else if (typeof fields.amountSen === 'number' && Number.isSafeInteger(fields.amountSen) &&
      fields.amountSen > 0) {
    amountSen = fields.amountSen
  } else schemaValid = false

  let amountIssue: 'missing' | 'ambiguous' | null = ambiguous ? 'ambiguous' : 'missing'
  if (amountSen !== null && !ambiguous) {
    if (typeof fields.amountEvidence === 'string' &&
        !evidenceMatches(fields.amountEvidence, amountSen)) {
      amountSen = null
      amountIssue = 'ambiguous'
      schemaValid = false
    } else amountIssue = null
  } else amountSen = null

  return { merchant, amountSen, receiptDate, amountIssue,
    usableAmount: amountSen !== null && schemaValid, schemaValid }
}

export interface ReceiptModelConfig {
  primary: string
  fallback: string
}

export function receiptModelConfig(env: NodeJS.ProcessEnv): ReceiptModelConfig {
  return {
    primary: env.RECEIPT_GEMINI_PRIMARY_MODEL?.trim() || 'gemini-3.6-flash',
    fallback: env.RECEIPT_GEMINI_FALLBACK_MODEL?.trim() || 'gemini-2.5-flash',
  }
}

export function isRecoverableProviderError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const details = error as { status?: unknown; code?: unknown; message?: unknown }
  if ([404, 429, 500, 502, 503, 504].includes(Number(details.status))) return true
  if (typeof details.code === 'string' &&
      /^(?:RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|NOT_FOUND)$/.test(details.code)) return true
  if (error instanceof TypeError && typeof details.message === 'string' &&
      /(?:fetch failed|network|timed? out)/i.test(details.message)) return true
  return typeof details.message === 'string' &&
    /(?:RESOURCE_EXHAUSTED|model (?:is )?(?:temporarily )?(?:unavailable|not found))/i.test(details.message)
}

function normalized(value: ValidatedReceiptExtraction, fallbackUsed: boolean): ReceiptExtractionResult {
  return { merchant: value.merchant, amountSen: value.amountSen, receiptDate: value.receiptDate,
    amountIssue: value.amountIssue, fallbackUsed }
}

export async function extractReceipt(
  provider: ReceiptExtractionProvider,
  input: ReceiptExtractionInput,
  models: ReceiptModelConfig,
): Promise<ReceiptExtractionResult> {
  let primary = { ...blank }
  try {
    primary = validateReceiptExtraction(await provider.extract(input, models.primary))
    if (primary.usableAmount) return normalized(primary, false)
  } catch (error) {
    if (!isRecoverableProviderError(error)) throw error
  }

  try {
    const fallback = validateReceiptExtraction(await provider.extract(input, models.fallback))
    if (fallback.usableAmount) return normalized(fallback, true)
    // Keep independently validated fields from either response, never an uncertain amount.
    return normalized({ ...fallback,
      merchant: fallback.merchant ?? primary.merchant,
      receiptDate: fallback.receiptDate ?? primary.receiptDate,
      amountSen: null,
      amountIssue: fallback.amountIssue === 'ambiguous' || primary.amountIssue === 'ambiguous'
        ? 'ambiguous' : 'missing',
    }, true)
  } catch (error) {
    if (!isRecoverableProviderError(error)) throw error
    if (primary.merchant || primary.receiptDate) return normalized({ ...primary,
      amountSen: null, amountIssue: primary.amountIssue ?? 'missing' }, true)
    throw new ReceiptExtractionUnavailableError()
  }
}

export class ReceiptExtractionUnavailableError extends Error {}
