export const ZIWEI_MIN_DATE = '1970-01-01'
export const ZIWEI_MAX_DATE = '2100-12-31'

export interface ZiWeiClockTime {
  hour: number
  minute: number
}

export const ZIWEI_HOURS = [
  { index: 0, branch: '子', label: '早子时', range: '00:00–00:59' },
  { index: 1, branch: '丑', label: '丑时', range: '01:00–02:59' },
  { index: 2, branch: '寅', label: '寅时', range: '03:00–04:59' },
  { index: 3, branch: '卯', label: '卯时', range: '05:00–06:59' },
  { index: 4, branch: '辰', label: '辰时', range: '07:00–08:59' },
  { index: 5, branch: '巳', label: '巳时', range: '09:00–10:59' },
  { index: 6, branch: '午', label: '午时', range: '11:00–12:59' },
  { index: 7, branch: '未', label: '未时', range: '13:00–14:59' },
  { index: 8, branch: '申', label: '申时', range: '15:00–16:59' },
  { index: 9, branch: '酉', label: '酉时', range: '17:00–18:59' },
  { index: 10, branch: '戌', label: '戌时', range: '19:00–20:59' },
  { index: 11, branch: '亥', label: '亥时', range: '21:00–22:59' },
  { index: 12, branch: '子', label: '晚子时', range: '23:00–23:59' },
] as const

export function parseZiWeiTime(value: string): ZiWeiClockTime | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  return hour <= 23 && minute <= 59 ? { hour, minute } : null
}

export function ziWeiTimeIndex(value: string): number {
  const time = parseZiWeiTime(value)
  if (!time) throw new Error('请输入有效的本地出生时间。')
  if (time.hour === 0) return 0
  if (time.hour === 23) return 12
  return Math.floor((time.hour + 1) / 2)
}

export function ziWeiHourLabel(index: number): string {
  const item = ZIWEI_HOURS.find((hour) => hour.index === index)
  if (!item) throw new Error('Invalid Zi Wei hour index')
  return `${item.label} · ${item.range}`
}

export function isRealGregorianDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3])
  const check = new Date(Date.UTC(year, month - 1, day))
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day
}

export function validateZiWeiDate(value: string, latestDate: string): string | null {
  if (!isRealGregorianDate(value)) return '请输入有效的公历出生日期。'
  if (value < ZIWEI_MIN_DATE) return `Phase 4B 支持 ${ZIWEI_MIN_DATE} 起的出生日期。`
  if (value > ZIWEI_MAX_DATE || value > latestDate) return '出生日期不能晚于今天。'
  return null
}
