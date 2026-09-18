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
  })

  it('tries the existing fallback model when the first response is malformed', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    mocked.extract.mockResolvedValueOnce({ activity: 'Running' }).mockResolvedValueOnce(valid)
    expect(await createFitnessOcrRuntime().extract(input)).toEqual(valid)
    expect(mocked.extract).toHaveBeenCalledTimes(2)
  })

  it('rejects two malformed responses without persisting anything', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    mocked.extract.mockResolvedValue({ invalid: true })
    await expect(createFitnessOcrRuntime().extract(input)).rejects.toThrow('Malformed fitness extraction')
  })
})
