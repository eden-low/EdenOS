export const ASTROLOGY_MIN_DATE = '1970-01-01'
export const ASTROLOGY_MAX_DATE = '2100-12-31'

export interface LocalDateTimeInput {
  date: string
  time: string
  timeZone: string
}

export interface ZonedCandidate {
  utcMs: number
  isoUtc: string
  offsetMinutes: number
  offsetLabel: string
}

export interface TimeZonePresentation {
  status: 'ready' | 'pending' | 'ambiguous' | 'nonexistent' | 'invalid-zone'
  names: string[]
  offsets: string[]
  timeZone: string
}

export type ZonedResolution =
  | { status: 'valid'; candidate: ZonedCandidate }
  | { status: 'ambiguous'; candidates: ZonedCandidate[] }
  | { status: 'nonexistent' }
  | { status: 'invalid-zone' }

interface LocalParts { year: number; month: number; day: number; hour: number; minute: number }

function parseDate(date: string): Pick<LocalParts, 'year' | 'month' | 'day'> | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3])
  const check = new Date(Date.UTC(year, month - 1, day))
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day ? { year, month, day } : null
}

function parseTime(time: string): Pick<LocalParts, 'hour' | 'minute'> | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hour = Number(match[1]); const minute = Number(match[2])
  return hour <= 23 && minute <= 59 ? { hour, minute } : null
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone }).format(0)
    return timeZone.includes('/') || timeZone === 'UTC'
  } catch {
    return false
  }
}

function formatter(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
}

function partsAt(utcMs: number, timeZone: string): LocalParts {
  const values = Object.fromEntries(formatter(timeZone).formatToParts(utcMs).map((part) => [part.type, part.value]))
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute) }
}

function sameParts(left: LocalParts, right: LocalParts): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day && left.hour === right.hour && left.minute === right.minute
}

export function formatUtcOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-'
  const absolute = Math.abs(minutes)
  return `UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}

export function resolveZonedDateTime(input: LocalDateTimeInput): ZonedResolution {
  const date = parseDate(input.date)
  const time = parseTime(input.time)
  if (!date || !time || !isValidIanaTimeZone(input.timeZone)) return isValidIanaTimeZone(input.timeZone) ? { status: 'nonexistent' } : { status: 'invalid-zone' }
  const wanted: LocalParts = { ...date, ...time }
  const nominalUtc = Date.UTC(wanted.year, wanted.month - 1, wanted.day, wanted.hour, wanted.minute)
  const offsets = new Set<number>()
  for (let deltaMinutes = -2160; deltaMinutes <= 2160; deltaMinutes += 30) {
    const sample = nominalUtc + deltaMinutes * 60_000
    const local = partsAt(sample, input.timeZone)
    const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute)
    offsets.add(Math.round((localAsUtc - sample) / 60_000))
  }
  const candidates = [...offsets]
    .map((offsetMinutes) => nominalUtc - offsetMinutes * 60_000)
    .filter((utcMs) => sameParts(partsAt(utcMs, input.timeZone), wanted))
    .filter((utcMs, index, values) => values.indexOf(utcMs) === index)
    .sort((a, b) => a - b)
    .map((utcMs): ZonedCandidate => {
      const offsetMinutes = Math.round((nominalUtc - utcMs) / 60_000)
      return { utcMs, isoUtc: new Date(utcMs).toISOString(), offsetMinutes, offsetLabel: formatUtcOffset(offsetMinutes) }
    })
  if (candidates.length === 0) return { status: 'nonexistent' }
  if (candidates.length > 1) return { status: 'ambiguous', candidates }
  return { status: 'valid', candidate: candidates[0] }
}

function zoneNameAt(utcMs: number, timeZone: string): string {
  const part = new Intl.DateTimeFormat('en', {
    timeZone,
    timeZoneName: 'long',
    hour: '2-digit',
  }).formatToParts(utcMs).find(({ type }) => type === 'timeZoneName')
  return part?.value ?? timeZone
}

function offsetAt(utcMs: number, timeZone: string): string {
  const local = partsAt(utcMs, timeZone)
  const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute)
  return formatUtcOffset(Math.round((localAsUtc - utcMs) / 60_000))
}

export function describeTimeZone(timeZone: string, date: string, time?: string): TimeZonePresentation {
  if (!isValidIanaTimeZone(timeZone)) return { status: timeZone ? 'invalid-zone' : 'pending', names: [], offsets: [], timeZone }
  if (!parseDate(date)) return { status: 'pending', names: [], offsets: [], timeZone }
  let instants: number[] = []
  let status: TimeZonePresentation['status'] = 'ready'
  if (time) {
    const resolution = resolveZonedDateTime({ date, time, timeZone })
    if (resolution.status === 'invalid-zone' || resolution.status === 'nonexistent') return { status: resolution.status, names: [], offsets: [], timeZone }
    instants = resolution.status === 'ambiguous' ? resolution.candidates.map(({ utcMs }) => utcMs) : [resolution.candidate.utcMs]
    if (resolution.status === 'ambiguous') status = 'ambiguous'
  } else {
    const range = utcRangeForLocalDate(date, timeZone)
    if (!range) return { status: 'nonexistent', names: [], offsets: [], timeZone }
    instants = [range.startMs, range.endMs]
  }
  const names = [...new Set(instants.map((utcMs) => zoneNameAt(utcMs, timeZone)))]
  const offsets = [...new Set(instants.map((utcMs) => offsetAt(utcMs, timeZone)))]
  return { status, names, offsets, timeZone }
}

export function utcRangeForLocalDate(date: string, timeZone: string): { startMs: number; endMs: number } | null {
  const parsed = parseDate(date)
  if (!parsed || !isValidIanaTimeZone(timeZone)) return null
  const nominalUtc = Date.UTC(parsed.year, parsed.month - 1, parsed.day)
  const matchesDate = (utcMs: number) => {
    const local = partsAt(utcMs, timeZone)
    return local.year === parsed.year && local.month === parsed.month && local.day === parsed.day
  }
  let firstSample: number | null = null
  let lastSample: number | null = null
  const sampleStep = 30 * 60_000
  for (let utcMs = nominalUtc - 18 * 3_600_000; utcMs <= nominalUtc + 42 * 3_600_000; utcMs += sampleStep) {
    if (matchesDate(utcMs)) {
      firstSample ??= utcMs
      lastSample = utcMs
    }
  }
  if (firstSample === null || lastSample === null) return null
  let startMs = firstSample
  let endMs = lastSample
  for (let utcMs = firstSample - sampleStep; utcMs <= firstSample; utcMs += 60_000) if (matchesDate(utcMs)) { startMs = utcMs; break }
  for (let utcMs = lastSample; utcMs < lastSample + sampleStep; utcMs += 60_000) if (matchesDate(utcMs)) endMs = utcMs
  return { startMs, endMs }
}

export function validateAstrologyDate(date: string, latestDate: string): string | null {
  if (!parseDate(date)) return '请输入有效的公历出生日期。'
  if (date < ASTROLOGY_MIN_DATE) return `Phase 4A 支持 ${ASTROLOGY_MIN_DATE} 起的出生日期。`
  if (date > ASTROLOGY_MAX_DATE || date > latestDate) return '出生日期不能晚于今天。'
  return null
}

export function dateInTimeZone(now: Date, timeZone: string): string {
  if (!isValidIanaTimeZone(timeZone)) return now.toISOString().slice(0, 10)
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
