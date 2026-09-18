import { GoogleGenAI, Type } from '@google/genai'
import type { ReceiptExtractionInput } from './receiptExtraction'

const nullableString = { anyOf: [{ type: Type.STRING }, { type: Type.NULL }] }
const nullableInteger = { anyOf: [{ type: Type.INTEGER }, { type: Type.NULL }] }
const instruction = `Read ONE workout detail screenshot from Apple Fitness or Apple Health. Return only fields visibly attributable to that workout. Never invent a field. Numeric output units: whole durationSeconds, whole distanceMetres, whole kcal, bpm, and steps. If distance or calories have decimal units, round to the nearest whole target unit. A daily step count does NOT belong to the workout: set stepsScope to daily and do not attach it. Set stepsScope to workout only when explicitly workout-specific. For any ambiguous value use null and set uncertain true. If multiple workouts are displayed, set multipleWorkouts true and all workout fields null. Return workoutDate as YYYY-MM-DD and workoutTime as 24-hour HH:mm only when both are explicit; never resolve relative dates such as Today. Recognize Apple Fitness, Apple Health or otherwise use Fitness screenshot for metricsSource. No medical claims or explanation.`
const schema = {
  type: Type.OBJECT,
  properties: {
    activity: nullableString,
    durationSeconds: nullableInteger,
    distanceMetres: nullableInteger,
    workoutDate: nullableString,
    workoutTime: nullableString,
    reportedActiveCaloriesKcal: nullableInteger,
    reportedTotalCaloriesKcal: nullableInteger,
    reportedAverageHeartRateBpm: nullableInteger,
    reportedSteps: nullableInteger,
    stepsScope: { type: Type.STRING, enum: ['workout', 'daily', 'unclear', 'none'] },
    metricsSource: { type: Type.STRING, enum: ['Apple Fitness', 'Apple Health', 'Fitness screenshot'] },
    multipleWorkouts: { type: Type.BOOLEAN },
    uncertain: { type: Type.BOOLEAN },
  },
  required: ['activity', 'durationSeconds', 'distanceMetres', 'workoutDate', 'workoutTime',
    'reportedActiveCaloriesKcal', 'reportedTotalCaloriesKcal', 'reportedAverageHeartRateBpm',
    'reportedSteps', 'stepsScope', 'metricsSource', 'multipleWorkouts', 'uncertain'],
}

export function createGeminiFitnessProvider(apiKey: string) {
  const client = new GoogleGenAI({ apiKey })
  return async (input: ReceiptExtractionInput, model: string): Promise<unknown> => {
    const response = await client.models.generateContent({
      model,
      contents: [
        { inlineData: { mimeType: input.mimeType, data: Buffer.from(input.image).toString('base64') } },
        { text: instruction },
      ],
      config: { responseMimeType: 'application/json', responseJsonSchema: schema },
    })
    try { return response.text ? JSON.parse(response.text) as unknown : null } catch { return null }
  }
}
