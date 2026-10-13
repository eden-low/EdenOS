import {
  COSMOS_SYSTEM_IDS,
  type CosmosAiRequest,
  type CosmosAiResponse,
  type CosmosAiSource,
  type CosmosObservation,
} from './cosmosAiTypes'

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function onlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function boundedString(value: unknown, maximum = 4000): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum
}

function nullableString(value: unknown, maximum = 120): value is string | null {
  return value === null || boundedString(value, maximum)
}

function numberValue(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
}

function stringArray(value: unknown, maximumItems: number, maximumLength = 1000): value is string[] {
  return Array.isArray(value) && value.length <= maximumItems && value.every((item) => boundedString(item, maximumLength))
}

function sourceBase(value: Record<string, unknown>): boolean {
  return ['exact', 'partial', 'uncertain'].includes(String(value.completeness)) &&
    stringArray(value.conventions, 8, 500) && stringArray(value.uncertainty, 8, 500)
}

function validTarot(source: Record<string, unknown>): boolean {
  const facts = record(source.facts)
  return sourceBase(source) && Boolean(facts) && onlyKeys(facts!, ['spread', 'cards']) &&
    ['single', 'three-card'].includes(String(facts!.spread)) && Array.isArray(facts!.cards) &&
    facts!.cards.length >= 1 && facts!.cards.length <= 3 && facts!.cards.every((card) => {
      const item = record(card)
      return item && onlyKeys(item, ['position', 'deckPosition', 'cardId', 'name', 'englishName', 'orientation']) &&
        boundedString(item.position, 80) && numberValue(item.deckPosition, 1, 78) && Number.isInteger(item.deckPosition) &&
        boundedString(item.cardId, 40) && boundedString(item.name, 80) && boundedString(item.englishName, 100) &&
        ['upright', 'reversed'].includes(String(item.orientation))
    })
}

function hexagram(value: unknown): boolean {
  const item = record(value)
  return Boolean(item) && onlyKeys(item!, ['number', 'name', 'englishName', 'upperTrigram', 'lowerTrigram', 'reference']) &&
    numberValue(item!.number, 1, 64) && Number.isInteger(item!.number) && boundedString(item!.name, 80) &&
    boundedString(item!.englishName, 100) && boundedString(item!.upperTrigram, 20) &&
    boundedString(item!.lowerTrigram, 20) && boundedString(item!.reference, 500)
}

function validIChing(source: Record<string, unknown>): boolean {
  const facts = record(source.facts)
  return sourceBase(source) && Boolean(facts) && onlyKeys(facts!, ['lineValues', 'primary', 'relating', 'movingLines']) &&
    Array.isArray(facts!.lineValues) && facts!.lineValues.length === 6 && facts!.lineValues.every((line) => [6, 7, 8, 9].includes(Number(line))) &&
    hexagram(facts!.primary) && hexagram(facts!.relating) && Array.isArray(facts!.movingLines) &&
    facts!.movingLines.length <= 6 && facts!.movingLines.every((line) => numberValue(line, 1, 6) && Number.isInteger(line))
}

function validBaZi(source: Record<string, unknown>): boolean {
  const facts = record(source.facts)
  const pillars = facts ? record(facts.pillars) : null
  const dayMaster = facts ? record(facts.dayMaster) : null
  const elements = facts ? record(facts.visibleElements) : null
  return sourceBase(source) && Boolean(facts && pillars && dayMaster && elements) &&
    onlyKeys(facts!, ['pillars', 'dayMaster', 'visibleElements', 'tenGods']) &&
    onlyKeys(pillars!, ['year', 'month', 'day', 'hour']) && ['year', 'month', 'day', 'hour'].every((key) => nullableString(pillars![key], 8)) &&
    onlyKeys(dayMaster!, ['character', 'element', 'yinYang']) && boundedString(dayMaster!.character, 4) &&
    boundedString(dayMaster!.element, 20) && boundedString(dayMaster!.yinYang, 20) &&
    onlyKeys(elements!, ['wood', 'fire', 'earth', 'metal', 'water']) &&
    ['wood', 'fire', 'earth', 'metal', 'water'].every((key) => numberValue(elements![key], 0, 8) && Number.isInteger(elements![key])) &&
    Array.isArray(facts!.tenGods) && facts!.tenGods.length <= 4 && facts!.tenGods.every((god) => {
      const item = record(god)
      return item && onlyKeys(item, ['pillar', 'label']) && boundedString(item.pillar, 20) && boundedString(item.label, 20)
    })
}

function validAstrology(source: Record<string, unknown>): boolean {
  const facts = record(source.facts)
  if (!sourceBase(source) || !facts || !onlyKeys(facts, ['chartKind', 'placements', 'ascendant', 'midheaven', 'aspects']) ||
      !['exact', 'date-only'].includes(String(facts.chartKind)) || !Array.isArray(facts.placements) || facts.placements.length !== 10) return false
  const placements = facts.placements.every((placement) => {
    const item = record(placement)
    return item && onlyKeys(item, ['planet', 'sign', 'possibleSigns', 'degree', 'house']) && boundedString(item.planet, 20) &&
      nullableString(item.sign, 20) && stringArray(item.possibleSigns, 2, 20) &&
      (item.degree === null || numberValue(item.degree, 0, 30)) &&
      (item.house === null || numberValue(item.house, 1, 12) && Number.isInteger(item.house))
  })
  const angle = (value: unknown) => {
    if (value === null) return true
    const item = record(value)
    return Boolean(item && onlyKeys(item, ['sign', 'degree']) && boundedString(item.sign, 20) && numberValue(item.degree, 0, 30))
  }
  return placements && angle(facts.ascendant) && angle(facts.midheaven) && Array.isArray(facts.aspects) && facts.aspects.length <= 45 && facts.aspects.every((aspect) => {
    const item = record(aspect)
    return item && onlyKeys(item, ['first', 'second', 'type', 'separation', 'deviation']) &&
      boundedString(item.first, 20) && boundedString(item.second, 20) && boundedString(item.type, 30) &&
      numberValue(item.separation, 0, 180) && numberValue(item.deviation, 0, 10)
  })
}

function validZiWei(source: Record<string, unknown>): boolean {
  const facts = record(source.facts)
  return sourceBase(source) && Boolean(facts) &&
    onlyKeys(facts!, ['lifePalaceBranch', 'bodyPalaceBranch', 'soulMaster', 'bodyMaster', 'fiveElementsBureau', 'palaces', 'transformations']) &&
    ['lifePalaceBranch', 'bodyPalaceBranch', 'soulMaster', 'bodyMaster', 'fiveElementsBureau'].every((key) => boundedString(facts![key], 40)) &&
    Array.isArray(facts!.palaces) && facts!.palaces.length === 12 && facts!.palaces.every((palace) => {
      const item = record(palace)
      return item && onlyKeys(item, ['name', 'branch', 'isLifePalace', 'isBodyPalace', 'majorStars']) &&
        boundedString(item.name, 20) && boundedString(item.branch, 10) && typeof item.isLifePalace === 'boolean' &&
        typeof item.isBodyPalace === 'boolean' && stringArray(item.majorStars, 4, 20)
    }) && Array.isArray(facts!.transformations) && facts!.transformations.length === 4 && facts!.transformations.every((transformation) => {
      const item = record(transformation)
      return item && onlyKeys(item, ['transformation', 'star', 'palace', 'branch']) &&
        boundedString(item.transformation, 4) && boundedString(item.star, 20) && boundedString(item.palace, 20) && boundedString(item.branch, 10)
    })
}

function validSource(value: unknown): value is CosmosAiSource {
  const source = record(value)
  if (!source || !onlyKeys(source, ['system', 'completeness', 'conventions', 'uncertainty', 'facts'])) return false
  if (source.system === 'tarot') return validTarot(source)
  if (source.system === 'iching') return validIChing(source)
  if (source.system === 'bazi') return validBaZi(source)
  if (source.system === 'astrology') return validAstrology(source)
  if (source.system === 'ziwei') return validZiWei(source)
  return false
}

export function validateCosmosAiRequest(value: unknown): CosmosAiRequest | null {
  const item = record(value)
  if (!item || !onlyKeys(item, ['version', 'promptVersion', 'mode', 'question', 'dreamText', 'sources', 'birthCompatibility', 'combinationWarningAcknowledged', 'consent']) ||
      item.version !== 1 || item.promptVersion !== 'cosmos-v1' || !['single', 'cross', 'dream'].includes(String(item.mode)) ||
      !boundedString(item.question, 1200) || !Array.isArray(item.sources) || item.sources.length > 5 ||
      !item.sources.every(validSource) || new Set(item.sources.map((source) => source.system)).size !== item.sources.length ||
      !['not-applicable', 'compatible', 'incompatible', 'unknown'].includes(String(item.birthCompatibility)) ||
      typeof item.combinationWarningAcknowledged !== 'boolean' || item.consent !== true) return null
  if (item.mode === 'single' && item.sources.length !== 1) return null
  if (item.mode === 'cross' && (item.sources.length < 2 || item.sources.length > 5)) return null
  if (item.mode === 'dream' && item.sources.length !== 0) return null
  if (item.mode === 'dream' ? !boundedString(item.dreamText, 4000) : item.dreamText !== undefined) return null
  if (item.mode === 'cross' && ['incompatible', 'unknown'].includes(String(item.birthCompatibility)) && item.combinationWarningAcknowledged !== true) return null
  return item as unknown as CosmosAiRequest
}

export function validateCosmosAiResponse(value: unknown): CosmosAiResponse | null {
  const item = record(value)
  if (!item || !onlyKeys(item, ['overallReflection', 'observations', 'comparison', 'dreamThemes', 'alternatives', 'reflectiveQuestions', 'limitations']) ||
      !boundedString(item.overallReflection) || !boundedString(item.limitations, 1600) ||
      !stringArray(item.alternatives, 5, 1200) || !stringArray(item.reflectiveQuestions, 3, 600) ||
      item.reflectiveQuestions.length !== 3 || !Array.isArray(item.observations) || item.observations.length < 1 || item.observations.length > 6) return null
  const observations: CosmosObservation[] = []
  for (const observation of item.observations) {
    const fields = record(observation)
    if (!fields || !onlyKeys(fields, ['source', 'title', 'reflection']) ||
        ![...COSMOS_SYSTEM_IDS, 'dream'].includes(fields.source as never) ||
        !boundedString(fields.title, 160) || !boundedString(fields.reflection)) return null
    observations.push({ source: fields.source as CosmosObservation['source'], title: fields.title, reflection: fields.reflection })
  }
  let comparison: CosmosAiResponse['comparison']
  if (item.comparison !== undefined) {
    const fields = record(item.comparison)
    if (!fields || !onlyKeys(fields, ['sharedThemes', 'differences']) ||
        !stringArray(fields.sharedThemes, 6) || !stringArray(fields.differences, 6)) return null
    comparison = { sharedThemes: fields.sharedThemes, differences: fields.differences }
  }
  let dreamThemes: CosmosAiResponse['dreamThemes']
  if (item.dreamThemes !== undefined) {
    if (!Array.isArray(item.dreamThemes) || item.dreamThemes.length < 1 || item.dreamThemes.length > 8) return null
    dreamThemes = []
    for (const theme of item.dreamThemes) {
      const fields = record(theme)
      if (!fields || !onlyKeys(fields, ['image', 'associations', 'alternatives']) ||
          !boundedString(fields.image, 240) || !stringArray(fields.associations, 5, 800) || !stringArray(fields.alternatives, 5, 800)) return null
      dreamThemes.push({ image: fields.image, associations: fields.associations, alternatives: fields.alternatives })
    }
  }
  return { overallReflection: item.overallReflection, observations,
    ...(comparison ? { comparison } : {}), ...(dreamThemes ? { dreamThemes } : {}),
    alternatives: item.alternatives, reflectiveQuestions: item.reflectiveQuestions, limitations: item.limitations }
}
