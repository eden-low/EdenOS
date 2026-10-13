import { GoogleGenAI } from '@google/genai'
import type { CosmosAiRequest } from '../src/cosmos/cosmosAiTypes'
import { assembleCosmosPrompt, cosmosResponseJsonSchema, cosmosSystemInstruction } from './cosmosPrompt'

export interface CosmosInterpretationProvider {
  interpret(request: CosmosAiRequest, model: string): Promise<unknown>
}

export function createGeminiCosmosProvider(apiKey: string): CosmosInterpretationProvider {
  const client = new GoogleGenAI({ apiKey })
  return {
    async interpret(request, model) {
      const response = await client.models.generateContent({
        model,
        contents: assembleCosmosPrompt(request),
        config: {
          systemInstruction: cosmosSystemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: cosmosResponseJsonSchema,
          maxOutputTokens: 3000,
          temperature: 0.45,
          httpOptions: { timeout: 20_000, retryOptions: { attempts: 1 } },
        },
      })
      if (!response.text || response.text.length > 32_000) return null
      try { return JSON.parse(response.text) as unknown } catch { return null }
    },
  }
}
