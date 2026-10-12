import { astro } from 'iztro'
import {
  ZIWEI_MAJOR_STARS,
  ZIWEI_SUPPORTING_STARS,
  isZiWeiMajorStar,
  isZiWeiPalaceName,
  type ZiWeiMajorStarName,
  type ZiWeiPalaceName,
  type ZiWeiTransformation,
} from './ziweiData'
import { validateZiWeiDate, ziWeiTimeIndex } from './ziweiTime'

export const ZIWEI_ENGINE_VERSION = '2.6.2'
export const ZIWEI_FIX_LEAP = true
export const ZIWEI_CONVENTIONS = {
  yearDivide: 'normal',
  dayDivide: 'forward',
  algorithm: 'default',
} as const

export type ZiWeiTraditionalGender = '男' | '女'

export interface ZiWeiInput {
  date: string
  time: string
  gender: ZiWeiTraditionalGender
}

export interface ZiWeiStar {
  name: string
  brightness: string | null
  transformation: ZiWeiTransformation | null
}

export interface ZiWeiTransformationPlacement {
  transformation: ZiWeiTransformation
  star: string
  palace: ZiWeiPalaceName
  branch: string
}

export interface ZiWeiPalace {
  index: number
  name: ZiWeiPalaceName
  heavenlyStem: string
  earthlyBranch: string
  isLifePalace: boolean
  isBodyPalace: boolean
  majorStars: ZiWeiStar[]
  supportingStars: ZiWeiStar[]
  transformations: ZiWeiTransformationPlacement[]
}

export interface ZiWeiChart {
  input: ZiWeiInput
  timeIndex: number
  timeLabel: string
  lunarDate: string
  chineseDate: string
  zodiac: string
  lifePalaceBranch: string
  bodyPalaceBranch: string
  soulMaster: string
  bodyMaster: string
  fiveElementsBureau: string
  palaces: ZiWeiPalace[]
  transformations: ZiWeiTransformationPlacement[]
}

function normalizeTransformation(value: string | undefined): ZiWeiTransformation | null {
  return value === '禄' || value === '权' || value === '科' || value === '忌' ? value : null
}

function normalizeStar(star: { name: string; brightness?: string; mutagen?: string }): ZiWeiStar {
  return {
    name: String(star.name),
    brightness: star.brightness ? String(star.brightness) : null,
    transformation: normalizeTransformation(star.mutagen),
  }
}

function assertChartIntegrity(palaces: ZiWeiPalace[], transformations: ZiWeiTransformationPlacement[]) {
  if (palaces.length !== 12 || new Set(palaces.map(({ name }) => name)).size !== 12) throw new Error('Zi Wei engine returned an incomplete palace set')
  if (new Set(palaces.map(({ earthlyBranch }) => earthlyBranch)).size !== 12) throw new Error('Zi Wei engine returned duplicate palace branches')
  const majorStars = palaces.flatMap(({ majorStars }) => majorStars.map(({ name }) => name))
  if (majorStars.length !== 14 || new Set(majorStars).size !== 14 || !ZIWEI_MAJOR_STARS.every((star) => majorStars.includes(star))) {
    throw new Error('Zi Wei engine returned an incomplete major-star set')
  }
  if (palaces.filter(({ isLifePalace }) => isLifePalace).length !== 1 || palaces.filter(({ isBodyPalace }) => isBodyPalace).length !== 1) {
    throw new Error('Zi Wei engine returned invalid Life or Body palace markers')
  }
  if (transformations.length !== 4 || new Set(transformations.map(({ transformation }) => transformation)).size !== 4) {
    throw new Error('Zi Wei engine returned an incomplete Four Transformations set')
  }
}

export function calculateZiWei(input: ZiWeiInput, latestDate: string): ZiWeiChart {
  const dateError = validateZiWeiDate(input.date, latestDate)
  if (dateError) throw new Error(dateError)
  if (input.gender !== '男' && input.gender !== '女') throw new Error('请选择传统排盘所需的男盘或女盘参数。')
  const timeIndex = ziWeiTimeIndex(input.time)
  const result = astro.withOptions({
    type: 'solar',
    dateStr: input.date,
    timeIndex,
    gender: input.gender,
    fixLeap: ZIWEI_FIX_LEAP,
    language: 'zh-CN',
    config: ZIWEI_CONVENTIONS,
  })

  const draft = result.palaces.map((palace) => {
    const name = String(palace.name)
    if (!isZiWeiPalaceName(name)) throw new Error(`Unknown Zi Wei palace: ${name}`)
    const allStars = [...palace.majorStars, ...palace.minorStars].map(normalizeStar)
    const majorStars = allStars.filter((star): star is ZiWeiStar & { name: ZiWeiMajorStarName } => isZiWeiMajorStar(star.name))
    const supportingStars = allStars.filter((star) => ZIWEI_SUPPORTING_STARS.has(star.name) && !isZiWeiMajorStar(star.name))
    return {
      index: palace.index,
      name,
      heavenlyStem: String(palace.heavenlyStem),
      earthlyBranch: String(palace.earthlyBranch),
      isLifePalace: name === '命宫',
      isBodyPalace: palace.isBodyPalace,
      majorStars,
      supportingStars,
      transformations: [] as ZiWeiTransformationPlacement[],
    }
  })

  const transformations = draft.flatMap((palace) => [...palace.majorStars, ...palace.supportingStars]
    .filter((star): star is ZiWeiStar & { transformation: ZiWeiTransformation } => star.transformation !== null)
    .map((star) => ({ transformation: star.transformation, star: star.name, palace: palace.name, branch: palace.earthlyBranch })))
  const palaces = draft.map((palace) => ({ ...palace, transformations: transformations.filter(({ palace: name }) => name === palace.name) }))
  assertChartIntegrity(palaces, transformations)

  return {
    input: { ...input },
    timeIndex,
    timeLabel: String(result.time),
    lunarDate: String(result.lunarDate),
    chineseDate: String(result.chineseDate),
    zodiac: String(result.zodiac),
    lifePalaceBranch: String(result.earthlyBranchOfSoulPalace),
    bodyPalaceBranch: String(result.earthlyBranchOfBodyPalace),
    soulMaster: String(result.soul),
    bodyMaster: String(result.body),
    fiveElementsBureau: String(result.fiveElementsClass),
    palaces,
    transformations,
  }
}
