// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReceiptExtractionInput } from './receiptExtraction'

const mocked = vi.hoisted(() => ({ extract: vi.fn() }))
vi.mock('./geminiBatchTransactionProvider', () => ({ createGeminiBatchTransactionProvider: () => mocked.extract }))
vi.mock('./receiptOcrRuntime', () => ({ createReceiptOcrRuntime: () => ({
  verifyToken: async () => true, isConfigured: () => true,
}) }))

import { createBatchTransactionOcrRuntime } from './batchTransactionOcrRuntime'

const input = { image: new Uint8Array([1, 2, 3]), mimeType: 'image/png' } as ReceiptExtractionInput
const valid = {
  rows: [{ date: '2026-09-01', time: '09:00', description: 'Merchant', amountSen: 1400,
    amountSign: 'negative', currency: 'MYR', sourceText: '-RM14.00', transactionKind: 'payment',
    dateInferred: false, uncertain: false, issues: [] }],
  totalVisibleRows: 1, partial: false, issues: [],
}

afterEach(() => { vi.unstubAllEnvs(); mocked.extract.mockReset() })

describe('batch transaction screenshot server runtime', () => {
  it('reuses the authenticated runtime and requires the server-only Gemini key', () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    expect(createBatchTransactionOcrRuntime().isConfigured()).toBe(false)
  })

  it('normalizes a multi-row response before returning it to the browser', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    mocked.extract.mockResolvedValue(valid)
    const result = await createBatchTransactionOcrRuntime().extract(input)
    expect(result.rows[0]).toMatchObject({ amountSen: 1400, dispositionSuggestion: 'expense' })
    expect(mocked.extract).toHaveBeenCalledWith(input, 'gemini-3.1-flash-lite')
  })

  it('uses one bounded fallback when the primary response is malformed', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    mocked.extract.mockResolvedValueOnce({ invalid: true }).mockResolvedValueOnce(valid)
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      expect((await createBatchTransactionOcrRuntime().extract(input)).rows).toHaveLength(1)
      expect(mocked.extract.mock.calls.map((call) => call[1])).toEqual(['gemini-3.1-flash-lite', 'gemini-3.6-flash'])
    } finally { warning.mockRestore() }
  })

  it('returns a valid empty extraction so the browser can show a no-row error', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    mocked.extract.mockResolvedValue({ rows: [], totalVisibleRows: 0, partial: false, issues: [] })
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      expect(await createBatchTransactionOcrRuntime().extract(input)).toMatchObject({ rows: [], totalVisibleRows: 0 })
      expect(mocked.extract).toHaveBeenCalledTimes(2)
    } finally { warning.mockRestore() }
  })
})
