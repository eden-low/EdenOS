import type { BirthSubject, ZiWeiSource } from './cosmosAiTypes'
import type { ZiWeiChart } from './ziweiAdapter'

export function ziWeiSnapshot(chart: ZiWeiChart, timeZone: string): ZiWeiSource & { subject: BirthSubject } {
  return {
    system: 'ziwei', completeness: 'exact',
    conventions: ['iztro 2.6.2 solar-date chart; lunar New Year boundary; fixLeap=true; late Zi hour 23:00–23:59 belongs to the next day; local civil time is not converted into a universal chart convention.'],
    uncertainty: [],
    facts: {
      lifePalaceBranch: chart.lifePalaceBranch, bodyPalaceBranch: chart.bodyPalaceBranch,
      soulMaster: chart.soulMaster, bodyMaster: chart.bodyMaster, fiveElementsBureau: chart.fiveElementsBureau,
      palaces: chart.palaces.map((palace) => ({ name: palace.name, branch: palace.earthlyBranch,
        isLifePalace: palace.isLifePalace, isBodyPalace: palace.isBodyPalace, majorStars: palace.majorStars.map((star) => star.name) })),
      transformations: chart.transformations.map((item) => ({ ...item })),
    },
    subject: { date: chart.input.date, timeKnown: true, time: chart.input.time, timeZone },
  }
}
