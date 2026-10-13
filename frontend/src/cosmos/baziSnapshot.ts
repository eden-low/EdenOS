import { analyzeBaZi } from './baziAnalysis'
import { BAZI_DAY_BOUNDARY_SECT, BAZI_TIMEZONE, type BaZiChart } from './baziAdapter'
import type { BaZiSource, BirthSubject } from './cosmosAiTypes'

export function baZiSnapshot(chart: BaZiChart): BaZiSource & { subject: BirthSubject } {
  const analysis = analyzeBaZi(chart)
  return {
    system: 'bazi', completeness: chart.input.timeKnown && chart.uncertainty.length === 0 ? 'exact' : 'partial',
    conventions: [`Malaysia UTC+08:00 only; 00:00 day boundary (sect ${BAZI_DAY_BOUNDARY_SECT}); solar-term year/month boundaries; no true-solar-time correction.`],
    uncertainty: chart.input.timeKnown ? [...chart.uncertainty] : ['Birth time unknown; hour pillar omitted.', ...chart.uncertainty],
    facts: {
      pillars: { year: chart.pillars.year?.text ?? null, month: chart.pillars.month?.text ?? null, day: chart.pillars.day?.text ?? null, hour: chart.pillars.hour?.text ?? null },
      dayMaster: { character: analysis.dayMaster.character, element: analysis.dayMaster.element, yinYang: analysis.dayMaster.yinYang },
      visibleElements: { ...analysis.visibleElements }, tenGods: analysis.tenGods.map((item) => ({ ...item })),
    },
    subject: { date: chart.input.date, timeKnown: chart.input.timeKnown, time: chart.input.time, timeZone: BAZI_TIMEZONE },
  }
}
