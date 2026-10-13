import type { CosmosAiRequest } from '../src/cosmos/cosmosAiTypes'

export const COSMOS_PROMPT_VERSION = 'cosmos-v1' as const

export const cosmosSystemInstruction = `You are EdenOS Ask Cosmos. Write primarily in natural Chinese, retaining useful English terms.
The supplied symbolic data is verified output from EdenOS deterministic local calculation engines. Never add, infer, or invent cards, orientations, hexagrams, moving lines, pillars, planets, signs, houses, aspects, stars, palaces, transformations, or missing birth details.
Separate supplied computed facts from traditional symbolic interpretation. Identify which source supports each observation. Treat Tarot, I Ching, BaZi, Western Astrology, and Zi Wei Dou Shu as distinct traditions with different conventions. Shared themes are comparisons, not scientific confirmation. Preserve contradictions and differences rather than forcing agreement.
Availability in one browser session, or compatible local birth inputs, does not prove that multiple charts describe the same person. Never make that claim.
Use tentative, reflective language. Do not claim hidden knowledge, supernatural proof, certain fate, exact prediction, medical or mental-health diagnosis, legal determination, investment instruction, or a deterministic life decision. For high-stakes topics, be supportive and recommend independent evidence or qualified professional advice.
For incomplete data, state exactly what is unavailable. Do not invent classical quotations. For dreams, discuss images, cultural or symbolic associations, alternatives, and reflective questions; do not claim objective prediction, diagnosis, or supernatural cause.
Return only JSON matching the response schema. Keep every section grounded, specific, and free of mystical filler.`

export function assembleCosmosPrompt(request: CosmosAiRequest): string {
  const requestSummary = {
    promptVersion: request.promptVersion,
    mode: request.mode,
    userQuestion: request.question,
    ...(request.dreamText ? { dreamText: request.dreamText } : {}),
    selectedSystems: request.sources.map(({ system }) => system),
    birthCompatibility: request.birthCompatibility,
    sources: request.sources,
  }
  const sectionRule = request.mode === 'cross'
    ? 'Include comparison with both sharedThemes and differences. Do not include dreamThemes.'
    : request.mode === 'dream'
      ? 'Include dreamThemes. Use dream as the only observation source. Do not include comparison.'
      : 'Do not include comparison or dreamThemes.'
  return `Interpret this request using only the supplied facts. ${sectionRule}\n${JSON.stringify(requestSummary)}`
}

export const cosmosResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    overallReflection: { type: 'string' },
    observations: {
      type: 'array', minItems: 1, maxItems: 6,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          source: { type: 'string', enum: ['tarot', 'iching', 'bazi', 'astrology', 'ziwei', 'dream'] },
          title: { type: 'string' },
          reflection: { type: 'string' },
        },
        required: ['source', 'title', 'reflection'],
      },
    },
    comparison: {
      type: 'object', additionalProperties: false,
      properties: {
        sharedThemes: { type: 'array', maxItems: 6, items: { type: 'string' } },
        differences: { type: 'array', maxItems: 6, items: { type: 'string' } },
      },
      required: ['sharedThemes', 'differences'],
    },
    dreamThemes: {
      type: 'array', minItems: 1, maxItems: 8,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          image: { type: 'string' },
          associations: { type: 'array', maxItems: 5, items: { type: 'string' } },
          alternatives: { type: 'array', maxItems: 5, items: { type: 'string' } },
        },
        required: ['image', 'associations', 'alternatives'],
      },
    },
    alternatives: { type: 'array', maxItems: 5, items: { type: 'string' } },
    reflectiveQuestions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
    limitations: { type: 'string' },
  },
  required: ['overallReflection', 'observations', 'alternatives', 'reflectiveQuestions', 'limitations'],
} as const
