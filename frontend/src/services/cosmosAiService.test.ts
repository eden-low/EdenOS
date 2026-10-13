import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getIdToken, auth } = vi.hoisted(() => ({ getIdToken: vi.fn(async () => 'id-token'), auth: { currentUser: null as null | { getIdToken: () => Promise<string> } } }))
vi.mock('../lib/firebase', () => ({ firebaseInitialization: { status: 'ready', services: { auth } } }))
import { requestCosmosInterpretation, CosmosAiError } from './cosmosAiService'
import type { CosmosAiRequest, CosmosAiResponse } from '../cosmos/cosmosAiTypes'

const request: CosmosAiRequest = { version: 1, promptVersion: 'cosmos-v1', mode: 'dream', question: '请反思。', dreamText: '梦见一扇门。', sources: [], birthCompatibility: 'not-applicable', combinationWarningAcknowledged: true, consent: true }
const result: CosmosAiResponse = { overallReflection: '反思', observations: [{ source: 'dream', title: '门', reflection: '过渡' }], dreamThemes: [{ image: '门', associations: ['过渡'], alternatives: ['边界'] }], alternatives: [], reflectiveQuestions: ['一？', '二？', '三？'], limitations: '限制' }

beforeEach(() => { auth.currentUser = { getIdToken }; getIdToken.mockClear(); vi.restoreAllMocks() })

describe('Cosmos AI browser boundary', () => {
  it('sends one authenticated same-origin JSON request with no-store', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }))
    expect(await requestCosmosInterpretation(request)).toEqual(result)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe('/.netlify/functions/cosmos-reading')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', cache: 'no-store', headers: { Authorization: 'Bearer id-token', 'Content-Type': 'application/json' } })
  })

  it('does not send without a signed-in Firebase identity', async () => {
    auth.currentUser = null
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    await expect(requestCosmosInterpretation(request)).rejects.toEqual(new CosmosAiError('auth'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps server, malformed response, and network failures without exposing details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ code: 'quota', detail: 'private' }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ unexpected: 'value' }), { status: 200 }))
      .mockRejectedValueOnce(new Error('private transport detail'))
    await expect(requestCosmosInterpretation(request)).rejects.toEqual(new CosmosAiError('quota'))
    await expect(requestCosmosInterpretation(request)).rejects.toEqual(new CosmosAiError('malformed-response'))
    await expect(requestCosmosInterpretation(request)).rejects.toEqual(new CosmosAiError('network'))
  })
})
