import { Solar } from 'lunar-typescript'
import { isEarthlyBranch, isHeavenlyStem, type EarthlyBranch, type HeavenlyStem } from './baziData'

export const BAZI_TIMEZONE = 'Asia/Kuala_Lumpur'
export const BAZI_TIMEZONE_LABEL = 'Malaysia Time · UTC+08:00'
export const BAZI_MIN_DATE = '1982-01-01'
export const BAZI_MAX_LIBRARY_DATE = '2099-12-31'
export const BAZI_DAY_BOUNDARY_SECT = 2

export type PillarKey = 'year' | 'month' | 'day' | 'hour'

export interface BaZiPillar {
  stem: HeavenlyStem
  branch: EarthlyBranch
  text: string
}

export interface BaZiInput {
  date: string
  timeKnown: boolean
  time?: string
}

export interface BaZiChart {
  input: Required<Pick<BaZiInput, 'date' | 'timeKnown'>> & { time: string | null }
  timezone: typeof BAZI_TIMEZONE
  pillars: Record<PillarKey, BaZiPillar | null>
  uncertainty: string[]
}

export type ValidationResult = { ok: true; date: DateParts; time: TimeParts | null } | { ok: false; error: string }

interface DateParts { year: number; month: number; day: number }
interface TimeParts { hour: number; minute: number }

function parseDate(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null
  return { year, month, day }
}

function parseTime(value: string): TimeParts | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

export function malaysiaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BAZI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export function validateBaZiInput(input: BaZiInput, latestDate = malaysiaToday()): ValidationResult {
  const date = parseDate(input.date)
  if (!date) return { ok: false, error: '请输入有效的公历出生日期。' }
  if (input.date < BAZI_MIN_DATE) return { ok: false, error: 'Phase 3A 支持 1982-01-01 起的现代马来西亚日期。' }
  if (input.date > BAZI_MAX_LIBRARY_DATE || input.date > latestDate) return { ok: false, error: '出生日期不能晚于今天。' }
  if (!input.timeKnown) return { ok: true, date, time: null }
  const time = parseTime(input.time ?? '')
  if (!time) return { ok: false, error: '已选择“知道出生时间”时，请输入有效的小时与分钟。' }
  return { ok: true, date, time }
}

function readPillars(date: DateParts, time: TimeParts): Record<PillarKey, BaZiPillar> {
  const eightChar = Solar.fromYmdHms(date.year, date.month, date.day, time.hour, time.minute, 0).getLunar().getEightChar()
  eightChar.setSect(BAZI_DAY_BOUNDARY_SECT)
  return {
    year: toPillar(eightChar.getYear()),
    month: toPillar(eightChar.getMonth()),
    day: toPillar(eightChar.getDay()),
    hour: toPillar(eightChar.getTime()),
  }
}

function toPillar(text: string): BaZiPillar {
  const stem = text.slice(0, 1)
  const branch = text.slice(1, 2)
  if (!isHeavenlyStem(stem) || !isEarthlyBranch(branch)) throw new Error(`Invalid pillar returned by calendar engine: ${text}`)
  return { stem, branch, text: `${stem}${branch}` }
}

export function calculateBaZi(input: BaZiInput, latestDate = malaysiaToday()): BaZiChart {
  const validation = validateBaZiInput(input, latestDate)
  if (!validation.ok) throw new Error(validation.error)
  const { date, time } = validation

  if (time) {
    return {
      input: { date: input.date, timeKnown: true, time: input.time ?? null },
      timezone: BAZI_TIMEZONE,
      pillars: readPillars(date, time),
      uncertainty: [],
    }
  }

  const start = readPillars(date, { hour: 0, minute: 0 })
  const end = readPillars(date, { hour: 23, minute: 59 })
  const uncertainty: string[] = []
  const year = start.year.text === end.year.text ? start.year : null
  const month = start.month.text === end.month.text ? start.month : null
  if (!year) uncertainty.push('这一天跨越立春；不知道出生时间时，年柱无法确定。')
  if (!month) uncertainty.push('这一天跨越月令交节；不知道出生时间时，月柱无法确定。')

  return {
    input: { date: input.date, timeKnown: false, time: null },
    timezone: BAZI_TIMEZONE,
    pillars: { year, month, day: start.day, hour: null },
    uncertainty,
  }
}
