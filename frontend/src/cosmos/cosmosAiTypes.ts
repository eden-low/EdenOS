export const COSMOS_SYSTEM_IDS = ['tarot', 'iching', 'bazi', 'astrology', 'ziwei'] as const
export type CosmosSystemId = (typeof COSMOS_SYSTEM_IDS)[number]
export type CosmosAiMode = 'single' | 'cross' | 'dream'
export type SnapshotCompleteness = 'exact' | 'partial' | 'uncertain'
export type BirthCompatibility = 'not-applicable' | 'compatible' | 'incompatible' | 'unknown'

export const COSMOS_SYSTEM_LABELS: Record<CosmosSystemId, string> = {
  tarot: '塔罗 · Tarot',
  iching: '易经 · I Ching',
  bazi: '八字 · BaZi',
  astrology: '占星 · Astrology',
  ziwei: '紫微 · Zi Wei',
}

export interface BirthSubject {
  /** Local-only comparison material. It must never be serialized into an AI request. */
  date: string
  timeKnown: boolean
  time: string | null
  timeZone: string
}

interface SourceBase {
  completeness: SnapshotCompleteness
  conventions: string[]
  uncertainty: string[]
}

export interface TarotSource extends SourceBase {
  system: 'tarot'
  facts: {
    spread: 'single' | 'three-card'
    cards: Array<{
      position: string
      deckPosition: number
      cardId: string
      name: string
      englishName: string
      orientation: 'upright' | 'reversed'
    }>
  }
}

export interface IChingSource extends SourceBase {
  system: 'iching'
  facts: {
    lineValues: number[]
    primary: { number: number; name: string; englishName: string; upperTrigram: string; lowerTrigram: string; reference: string }
    relating: { number: number; name: string; englishName: string; upperTrigram: string; lowerTrigram: string; reference: string }
    movingLines: number[]
  }
}

export interface BaZiSource extends SourceBase {
  system: 'bazi'
  facts: {
    pillars: Record<'year' | 'month' | 'day' | 'hour', string | null>
    dayMaster: { character: string; element: string; yinYang: string }
    visibleElements: Record<'wood' | 'fire' | 'earth' | 'metal' | 'water', number>
    tenGods: Array<{ pillar: string; label: string }>
  }
}

export interface AstrologySource extends SourceBase {
  system: 'astrology'
  facts: {
    chartKind: 'exact' | 'date-only'
    placements: Array<{ planet: string; sign: string | null; possibleSigns: string[]; degree: number | null; house: number | null }>
    ascendant: { sign: string; degree: number } | null
    midheaven: { sign: string; degree: number } | null
    aspects: Array<{ first: string; second: string; type: string; separation: number; deviation: number }>
  }
}

export interface ZiWeiSource extends SourceBase {
  system: 'ziwei'
  facts: {
    lifePalaceBranch: string
    bodyPalaceBranch: string
    soulMaster: string
    bodyMaster: string
    fiveElementsBureau: string
    palaces: Array<{ name: string; branch: string; isLifePalace: boolean; isBodyPalace: boolean; majorStars: string[] }>
    transformations: Array<{ transformation: string; star: string; palace: string; branch: string }>
  }
}

export type CosmosAiSource = TarotSource | IChingSource | BaZiSource | AstrologySource | ZiWeiSource
export type CosmosReadingSnapshot = CosmosAiSource & { subject?: BirthSubject }
export type CosmosSnapshotMap = Partial<Record<CosmosSystemId, CosmosReadingSnapshot>>

export interface CosmosAiRequest {
  version: 1
  promptVersion: 'cosmos-v1'
  mode: CosmosAiMode
  question: string
  dreamText?: string
  sources: CosmosAiSource[]
  birthCompatibility: BirthCompatibility
  combinationWarningAcknowledged: boolean
  consent: true
}

export interface CosmosObservation {
  source: CosmosSystemId | 'dream'
  title: string
  reflection: string
}

export interface CosmosAiResponse {
  overallReflection: string
  observations: CosmosObservation[]
  comparison?: { sharedThemes: string[]; differences: string[] }
  dreamThemes?: Array<{ image: string; associations: string[]; alternatives: string[] }>
  alternatives: string[]
  reflectiveQuestions: string[]
  limitations: string
}

export function requestSource(snapshot: CosmosReadingSnapshot): CosmosAiSource {
  // Explicit reconstruction prevents the local-only subject from crossing the network boundary.
  const { subject: _subject, ...source } = snapshot
  return source
}

export function compareBirthSubjects(snapshots: CosmosReadingSnapshot[]): BirthCompatibility {
  const subjects = snapshots.flatMap((snapshot) => snapshot.subject ? [snapshot.subject] : [])
  if (subjects.length < 2) return 'not-applicable'
  const first = subjects[0]
  if (subjects.some((subject) => subject.date !== first.date)) return 'incompatible'
  if (subjects.some((subject) => subject.timeKnown !== first.timeKnown)) return 'incompatible'
  if (!first.timeKnown) return 'unknown'
  if (subjects.some((subject) => subject.time !== first.time)) return 'incompatible'
  if (subjects.some((subject) => subject.timeZone !== first.timeZone)) return 'incompatible'
  // Matching local civil inputs can still use different calculation conventions. This only
  // confirms input compatibility, never a universal normalized chart.
  return 'compatible'
}
