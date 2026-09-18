// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReceiptExtractionInput } from './receiptExtraction'

const mocked = vi.hoisted(() => ({ extract: vi.fn() }))
vi.mock('./geminiFitnessProvider', () => ({ createGeminiFitnessProvider: () => mocked.extract }))
vi.mock('./receiptOcrRuntime', () => ({ createReceiptOcrRuntime: () => ({
  verifyToken: async () => true, isConfigured: () => true,
}) }))

import { createFitnessOcrRuntime } from './fitnessOcrRuntime'

const input = { image: new Uint8Array([1, 2, 3]), mimeType: 'image/png' } as ReceiptExtractionInput
const valid = {
  activity: 'Running', durationSeconds: 1800, distanceMetres: null,
  workoutDate: null, workoutTime: null, reportedActiveCaloriesKcal: 382,
  reportedTotalCaloriesKcal: null, reportedAverageHeartRateBpm: null, reportedSteps: null,
  stepsScope: 'none', metricsSource: 'Apple Fitness', multipleWorkouts: false, uncertain: true,
}
afterEach(() => { vi.unstubAllEnvs(); mocked.extract.mockReset() })

describe('fitness extraction server runtime', () => {
  it('requires a server-only Gemini key', () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    expect(createFitnessOcrRuntime().isConfigured()).toBe(false)
  })

  it('returns validated extraction from a mocked Gemini response', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    mocked.extract.mockResolvedValue(valid)
    expect(await createFitnessOcrRuntime().extract(input)).toEqual(valid)
    expect(mocked.extract).toHaveBeenCalledOnce()
    expect(mocked.extract).toHaveBeenCalledWith(input, 'gemini-3.6-flash')
  })

  it('tries the Receipt fallback model when the primary response is unusable', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    mocked.extract.mockResolvedValueOnce({ activity: 'Running' }).mockResolvedValueOnce(valid)
    expect(await createFitnessOcrRuntime().extract(input)).toEqual(valid)
    expect(mocked.extract).toHaveBeenCalledTimes(2)
    expect(mocked.extract.mock.calls.map((call) => call[1])).toEqual(['gemini-3.6-flash', 'gemini-2.5-flash'])
  })

  it('keeps readable fields when Gemini returns a relative date', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    mocked.extract.mockResolvedValue({ ...valid, workoutDate: 'Today' })
    const result = await createFitnessOcrRuntime().extract(input)
    expect(result).toMatchObject({ activity: 'Running', durationSeconds: 1800,
      workoutDate: null, uncertain: true })
    expect(mocked.extract).toHaveBeenCalledOnce()
  })

  it('reports provider status without logging its message or credentials', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mocked.extract.mockRejectedValue({ status: 429, message: 'secret-sensitive-message' })
    try {
      await expect(createFitnessOcrRuntime().extract(input)).rejects.toThrow('unavailable')
      expect(warning).toHaveBeenCalledWith('Fitness extraction provider failed',
        { role: 'primary', status: 429, code: undefined })
      expect(JSON.stringify(warning.mock.calls)).not.toContain('secret-sensitive-message')
    } finally { warning.mockRestore() }
  })

  it('rejects two malformed responses without persisting anything', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    mocked.extract.mockResolvedValue({ invalid: true })
    await expect(createFitnessOcrRuntime().extract(input)).rejects.toThrow('Malformed fitness extraction')
  })
})
