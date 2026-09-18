import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ currentUser: null as null | { getIdToken: () => Promise<string> } }))
vi.mock('../lib/firebase', () => ({ firebaseInitialization: { status: 'ready', services: { auth } } }))

import { readFitnessScreenshot } from './fitnessScreenshotService'
import { ReceiptOcrError } from './receiptOcrService'

const result = {
  activity: 'Running', durationSeconds: 1800, distanceMetres: 5000,
  workoutDate: '2026-09-18', workoutTime: '07:30', reportedActiveCaloriesKcal: 382,
  reportedTotalCaloriesKcal: null, reportedAverageHeartRateBpm: null, reportedSteps: null,
  stepsScope: 'none', metricsSource: 'Apple Fitness', multipleWorkouts: false, uncertain: false,
}
beforeEach(() => { auth.currentUser = { getIdToken: async () => 'id-token' }; vi.restoreAllMocks() })

describe('fitness screenshot browser boundary', () => {
  it('sends a Firebase token and image to the same-origin server endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(result)))
    const candidate = await readFitnessScreenshot(new Blob(['image'], { type: 'image/png' }))
    expect(candidate).toMatchObject({ activity: 'Running', reportedActiveCaloriesKcal: 382 })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/.netlify/functions/fitness-screenshot')
    expect(options?.headers).toEqual({ Authorization: 'Bearer id-token' })
    expect(options?.body).toBeInstanceOf(FormData)
  })

  it('rejects malformed responses and provider/network failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{"oops":true}'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'provider' }), { status: 503 }))
      .mockRejectedValueOnce(new Error('private detail'))
    const image = new Blob(['image'], { type: 'image/png' })
    await expect(readFitnessScreenshot(image)).rejects.toEqual(new ReceiptOcrError('provider'))
    await expect(readFitnessScreenshot(image)).rejects.toEqual(new ReceiptOcrError('provider'))
    await expect(readFitnessScreenshot(image)).rejects.toEqual(new ReceiptOcrError('network'))
  })

  it('never uploads without the current Firebase user', async () => {
    auth.currentUser = null
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    await expect(readFitnessScreenshot(new Blob(['x'], { type: 'image/png' })))
      .rejects.toEqual(new ReceiptOcrError('auth'))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
