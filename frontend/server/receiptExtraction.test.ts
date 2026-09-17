// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  extractReceipt, receiptModelConfig, validateReceiptExtraction,
  type ReceiptExtractionProvider,
} from './receiptExtraction'

const input = { image: new Uint8Array([1, 2]), mimeType: 'image/png' as const }
const models = receiptModelConfig({})
const receipt = {
  merchant: 'ABC Cafe', amountSen: 1270, receiptDate: '2026-09-17',
  amountEvidence: 'GRAND TOTAL RM 12.70', dateEvidence: '17/09/2026',
  ambiguousAmount: false,
}

function provider(...responses: Array<unknown | Error>) {
  const extract = vi.fn(async () => {
    const next = responses.shift()
    if (next instanceof Error) throw next
    return next
  })
  return { extract } as ReceiptExtractionProvider & { extract: typeof extract }
}

function apiError(status: number): Error {
  return Object.assign(new Error('provider failure'), { status })
}

describe('receipt structured validation', () => {
  it('accepts integer sen, a real local date and matching total evidence', () => {
    expect(validateReceiptExtraction(receipt)).toMatchObject({
      merchant: 'ABC Cafe', amountSen: 1270, receiptDate: '2026-09-17', usableAmount: true,
    })
    expect(validateReceiptExtraction({ ...receipt, amountSen: 1590,
      amountEvidence: 'GRAND TOTAL RM 15.90' }).usableAmount).toBe(true)
  })

  it.each([12.7, 0, -1, Number.MAX_SAFE_INTEGER + 1, NaN])(
    'rejects invalid amountSen %s', (amountSen) => {
      expect(validateReceiptExtraction({ ...receipt, amountSen }).amountSen).toBeNull()
    },
  )

  it('rejects impossible dates while preserving independently valid fields', () => {
    expect(validateReceiptExtraction({ ...receipt, receiptDate: '2026-02-31' }))
      .toMatchObject({ receiptDate: null, merchant: 'ABC Cafe', schemaValid: false })
  })

  it('normalizes an empty merchant and rejects overlong merchant names', () => {
    expect(validateReceiptExtraction({ ...receipt, merchant: '  ' }).merchant).toBeNull()
    expect(validateReceiptExtraction({ ...receipt, merchant: 'x'.repeat(81) }))
      .toMatchObject({ merchant: null, schemaValid: false })
  })

  it('does not trust an amount that conflicts with its image evidence', () => {
    expect(validateReceiptExtraction({ ...receipt, amountSen: 1580,
      amountEvidence: 'GRAND TOTAL RM 15.90' }))
      .toMatchObject({ amountSen: null, amountIssue: 'ambiguous', usableAmount: false })
  })

  it('does not use a subtotal or tax line as final-amount evidence', () => {
    expect(validateReceiptExtraction({ ...receipt, amountEvidence: 'SUBTOTAL RM 12.70' }).amountSen).toBeNull()
    expect(validateReceiptExtraction({ ...receipt, amountEvidence: 'TAX RM 12.70' }).amountSen).toBeNull()
  })

  it('never passes an ambiguous amount to the candidate', () => {
    expect(validateReceiptExtraction({ ...receipt, ambiguousAmount: true }))
      .toMatchObject({ amountSen: null, amountIssue: 'ambiguous' })
  })

  it('rejects malformed structured data', () => {
    expect(validateReceiptExtraction({ ...receipt, ambiguousAmount: 'false' }).schemaValid).toBe(false)
    expect(validateReceiptExtraction(null).usableAmount).toBe(false)
  })
})

describe('two-model receipt router', () => {
  it('uses the pinned defaults and honors explicit model overrides', () => {
    expect(models).toEqual({ primary: 'gemini-3.6-flash', fallback: 'gemini-2.5-flash' })
    expect(receiptModelConfig({ RECEIPT_GEMINI_PRIMARY_MODEL: 'primary-test',
      RECEIPT_GEMINI_FALLBACK_MODEL: 'fallback-test' }))
      .toEqual({ primary: 'primary-test', fallback: 'fallback-test' })
  })

  it('accepts a valid primary result in one call', async () => {
    const source = provider(receipt)
    expect(await extractReceipt(source, input, models)).toMatchObject({ amountSen: 1270, fallbackUsed: false })
    expect(source.extract).toHaveBeenCalledOnce()
    expect(source.extract).toHaveBeenCalledWith(input, 'gemini-3.6-flash')
  })

  it.each([429, 500, 502, 503, 504, 404])('falls back for recoverable provider status %s', async (status) => {
    const source = provider(apiError(status), receipt)
    expect(await extractReceipt(source, input, models)).toMatchObject({ amountSen: 1270, fallbackUsed: true })
    expect(source.extract).toHaveBeenCalledTimes(2)
    expect(source.extract).toHaveBeenLastCalledWith(input, 'gemini-2.5-flash')
  })

  it('falls back for resource exhaustion and a transient network error', async () => {
    const exhausted = provider(Object.assign(new Error('quota'), { code: 'RESOURCE_EXHAUSTED' }), receipt)
    expect(await extractReceipt(exhausted, input, models)).toMatchObject({ fallbackUsed: true })
    const network = provider(new TypeError('fetch failed'), receipt)
    expect(await extractReceipt(network, input, models)).toMatchObject({ fallbackUsed: true })
  })

  it.each([
    ['invalid structured output', null],
    ['missing amount', { ...receipt, amountSen: null }],
    ['ambiguous amount', { ...receipt, ambiguousAmount: true }],
    ['evidence conflict', { ...receipt, amountSen: 1260 }],
    ['schema failure', { ...receipt, receiptDate: '2026-02-31' }],
  ])('falls back for %s', async (_name, primary) => {
    const source = provider(primary, receipt)
    expect(await extractReceipt(source, input, models)).toMatchObject({ amountSen: 1270, fallbackUsed: true })
    expect(source.extract).toHaveBeenCalledTimes(2)
  })

  it.each(['merchant', 'receiptDate'])('does not fall back when only %s is missing', async (field) => {
    const source = provider({ ...receipt, [field]: null })
    expect(await extractReceipt(source, input, models)).toMatchObject({ amountSen: 1270, fallbackUsed: false })
    expect(source.extract).toHaveBeenCalledOnce()
  })

  it.each([400, 401, 403])('does not retry a client/config error %s', async (status) => {
    const source = provider(apiError(status), receipt)
    await expect(extractReceipt(source, input, models)).rejects.toMatchObject({ status })
    expect(source.extract).toHaveBeenCalledOnce()
  })

  it('returns a recoverable unavailable failure after two rate limits', async () => {
    const source = provider(apiError(429), apiError(429))
    await expect(extractReceipt(source, input, models)).rejects.toThrow()
    expect(source.extract).toHaveBeenCalledTimes(2)
  })

  it('keeps a partial candidate without inventing an amount', async () => {
    const source = provider({ ...receipt, amountSen: null },
      { ...receipt, merchant: null, amountSen: null, receiptDate: null })
    expect(await extractReceipt(source, input, models)).toEqual({
      merchant: 'ABC Cafe', amountSen: null, receiptDate: '2026-09-17',
      amountIssue: 'missing', fallbackUsed: true,
    })
    expect(source.extract).toHaveBeenCalledTimes(2)
  })
})
