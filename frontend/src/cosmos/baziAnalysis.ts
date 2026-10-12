import {
  EARTHLY_BRANCHES,
  ELEMENT_LABELS,
  HEAVENLY_STEMS,
  tenGodFor,
  type FiveElement,
  type TenGod,
} from './baziData'
import type { BaZiChart, PillarKey } from './baziAdapter'

export interface PillarTenGod {
  pillar: PillarKey
  label: '日主' | TenGod
}

export interface BaZiAnalysis {
  dayMaster: (typeof HEAVENLY_STEMS)[keyof typeof HEAVENLY_STEMS]
  tenGods: PillarTenGod[]
  visibleElements: Record<FiveElement, number>
  visibleCharacterCount: number
}

export function analyzeBaZi(chart: BaZiChart): BaZiAnalysis {
  const dayPillar = chart.pillars.day
  if (!dayPillar) throw new Error('Day pillar is required for BaZi analysis')
  const dayMaster = HEAVENLY_STEMS[dayPillar.stem]
  const visibleElements = Object.fromEntries(
    Object.keys(ELEMENT_LABELS).map((element) => [element, 0]),
  ) as Record<FiveElement, number>
  const tenGods: PillarTenGod[] = []
  let visibleCharacterCount = 0

  for (const pillar of ['year', 'month', 'day', 'hour'] as const) {
    const value = chart.pillars[pillar]
    if (!value) continue
    visibleElements[HEAVENLY_STEMS[value.stem].element] += 1
    visibleElements[EARTHLY_BRANCHES[value.branch].element] += 1
    visibleCharacterCount += 2
    tenGods.push({ pillar, label: pillar === 'day' ? '日主' : tenGodFor(dayPillar.stem, value.stem) })
  }

  return { dayMaster, tenGods, visibleElements, visibleCharacterCount }
}
