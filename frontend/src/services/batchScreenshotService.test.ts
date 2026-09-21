import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ currentUser: null as null | { getIdToken: () => Promise<string> } }))
vi.mock('../lib/firebase', () => ({ firebaseInitialization: { status: 'ready', services: { auth } } }))

import { BatchScreenshotError, readBatchTransactionScreenshot } from './batchScreenshotService'

const response = {
  rows: [
    { date: '2026-09-01', time: '09:10', description: 'Merchant Payment', amountSen: 1400, amountSign: 'negative', currency: 'MYR', sourceText: '-RM14.00', transactionKind: 'payment', dateInferred: false, uncertain: false, issues: [] },
    { date: '2026-09-01', time: '10:00', description: 'GO+ Quick Cash In', amountSen: 1000, amountSign: 'positive', currency: 'MYR', sourceText: '+RM10.00', transactionKind: 'transfer', dateInferred: false, uncertain: false, issues: [] },
  ],
  totalVisibleRows: 2, partial: false, excludedRewardRows: 0, issues: [],
}

beforeEach(() => { auth.currentUser = { getIdToken: async () => 'id-token' }; vi.restoreAllMocks() })

describe('batch transaction screenshot browser boundary', () => {
  it('sends one image and Firebase token to the dedicated same-origin endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(response)))
    const result = await readBatchTransactionScreenshot(new Blob(['image'], { type: 'image/png' }))
    expect(result.candidates).toHaveLength(2)
    expect(result.candidates[1].direction).toBe('ignore')
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/.netlify/functions/batch-transactions-screenshot')
    expect(options?.headers).toEqual({ Authorization: 'Bearer id-token' })
    expect(options?.body).toBeInstanceOf(FormData)
  })

  it('returns screenshot-specific empty and limit errors', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...response, rows: [], totalVisibleRows: 0 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...response, rows: [], totalVisibleRows: 101 })))
    const image = new Blob(['image'], { type: 'image/png' })
    await expect(readBatchTransactionScreenshot(image)).rejects.toEqual(new BatchScreenshotError('no-rows'))
    await expect(readBatchTransactionScreenshot(image)).rejects.toEqual(new BatchScreenshotError('too-many'))
  })

  it('never uploads without an authenticated user', async () => {
    auth.currentUser = null
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    await expect(readBatchTransactionScreenshot(new Blob(['image'], { type: 'image/png' })))
      .rejects.toEqual(new BatchScreenshotError('auth'))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
