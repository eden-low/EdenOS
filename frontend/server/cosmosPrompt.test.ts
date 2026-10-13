// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { CosmosAiRequest } from '../src/cosmos/cosmosAiTypes'
import { COSMOS_PROMPT_VERSION, assembleCosmosPrompt, cosmosSystemInstruction } from './cosmosPrompt'

const request: CosmosAiRequest = {
  version: 1, promptVersion: 'cosmos-v1', mode: 'single', question: '这张牌有哪些反思角度？', birthCompatibility: 'not-applicable',
  combinationWarningAcknowledged: true, consent: true,
  sources: [{ system: 'tarot', completeness: 'exact', conventions: ['Synthetic convention'], uncertainty: [], facts: {
    spread: 'single', cards: [{ position: 'Single', deckPosition: 8, cardId: 'major-07', name: '战车', englishName: 'The Chariot', orientation: 'reversed' }],
  } }],
}

describe('Cosmos prompt assembly', () => {
  it('pins a version and submits the exact structured local result with mode-specific output rules', () => {
    const prompt = assembleCosmosPrompt(request)
    expect(COSMOS_PROMPT_VERSION).toBe('cosmos-v1')
    expect(prompt).toContain('Do not include comparison or dreamThemes.')
    expect(prompt).toContain('"cardId":"major-07"')
    expect(prompt).toContain('"orientation":"reversed"')
    expect(prompt).toContain('这张牌有哪些反思角度？')
  })

  it('forbids invented facts, forced agreement, identity assumptions, and deterministic advice', () => {
    expect(cosmosSystemInstruction).toContain('Never add, infer, or invent')
    expect(cosmosSystemInstruction).toContain('not scientific confirmation')
    expect(cosmosSystemInstruction).toContain('does not prove that multiple charts describe the same person')
    expect(cosmosSystemInstruction).toContain('medical or mental-health diagnosis')
  })
})
