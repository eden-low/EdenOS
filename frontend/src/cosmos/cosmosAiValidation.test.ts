import { describe, expect, it } from 'vitest'
import { validateCosmosAiRequest } from './cosmosAiValidation'
import type { CosmosAiRequest, TarotSource } from './cosmosAiTypes'

const tarot: TarotSource = {
  system: 'tarot', completeness: 'exact', conventions: ['Synthetic test convention'], uncertainty: [],
  facts: { spread: 'single', cards: [{ position: 'Single', deckPosition: 1, cardId: 'major-00', name: '测试牌', englishName: 'Test Card', orientation: 'upright' }] },
}

function request(changes: Partial<CosmosAiRequest> = {}): CosmosAiRequest {
  return { version: 1, promptVersion: 'cosmos-v1', mode: 'single', question: '请提供整体反思。', sources: [tarot],
    birthCompatibility: 'not-applicable', combinationWarningAcknowledged: true, consent: true, ...changes }
}

describe('Cosmos AI request validation', () => {
  it('accepts valid single-system, multi-system, and dream requests', () => {
    expect(validateCosmosAiRequest(request())).not.toBeNull()
    const second = { ...tarot, system: 'iching' as const, facts: {
      lineValues: [7, 8, 7, 8, 7, 8], primary: { number: 64, name: '未济', englishName: 'Before Completion', upperTrigram: '离', lowerTrigram: '坎', reference: '火在水上。' },
      relating: { number: 64, name: '未济', englishName: 'Before Completion', upperTrigram: '离', lowerTrigram: '坎', reference: '火在水上。' }, movingLines: [],
    } }
    expect(validateCosmosAiRequest(request({ mode: 'cross', sources: [tarot, second], birthCompatibility: 'compatible' }))).not.toBeNull()
    expect(validateCosmosAiRequest(request({ mode: 'dream', sources: [], dreamText: '梦见一条安静的河。' }))).not.toBeNull()
  })

  it('rejects empty or excessive text, invalid systems, and malformed context', () => {
    expect(validateCosmosAiRequest(request({ question: '' }))).toBeNull()
    expect(validateCosmosAiRequest(request({ question: 'a'.repeat(1201) }))).toBeNull()
    expect(validateCosmosAiRequest({ ...request(), sources: [{ ...tarot, system: 'unknown' }] })).toBeNull()
    expect(validateCosmosAiRequest({ ...request(), sources: [{ ...tarot, facts: { spread: 'single', cards: [] } }] })).toBeNull()
  })

  it('accepts explicit uncertainty but rejects unacknowledged mismatched birth contexts', () => {
    const uncertain = { ...tarot, completeness: 'uncertain' as const, uncertainty: ['Synthetic uncertainty'] }
    expect(validateCosmosAiRequest(request({ sources: [uncertain] }))).not.toBeNull()
    expect(validateCosmosAiRequest(request({ mode: 'cross', sources: [tarot, uncertain], birthCompatibility: 'incompatible', combinationWarningAcknowledged: false }))).toBeNull()
  })

  it('rejects raw birth fields even when otherwise valid', () => {
    expect(validateCosmosAiRequest({ ...request(), sources: [{ ...tarot, subject: { date: '2000-01-01' } }] })).toBeNull()
  })
})
