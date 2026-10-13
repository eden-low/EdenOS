import type { IChingSource } from './cosmosAiTypes'
import type { IChingReading } from './ichingReading'

export function iChingSnapshot(reading: IChingReading): IChingSource {
  const hexagram = (value: IChingReading['primary'], upperTrigram: string, lowerTrigram: string) => ({
    number: value.number, name: value.fullName, englishName: value.englishName, upperTrigram, lowerTrigram, reference: value.reference,
  })
  return {
    system: 'iching', completeness: 'exact', conventions: ['Three-coin method; lines stored bottom-to-top; 6 and 9 are moving lines.'], uncertainty: [],
    facts: {
      lineValues: [...reading.lines], movingLines: [...reading.movingLines],
      primary: hexagram(reading.primary, reading.upperTrigram.name, reading.lowerTrigram.name),
      relating: hexagram(reading.relating, reading.relatingUpperTrigram.name, reading.relatingLowerTrigram.name),
    },
  }
}
