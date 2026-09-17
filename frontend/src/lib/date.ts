const dashboardDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const dateHeadingFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
})

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toLocalDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function toLocalTimeInput(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function combineLocalDateTime(dateValue: string, timeValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:\d{2}$/.test(timeValue)) {
    return null
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  const [hours, minutes] = timeValue.split(':').map(Number)
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
    return null
  }

  return date.toISOString()
}

export function formatDashboardDate(date: Date): string {
  const formatted = dashboardDateFormatter.format(date)
  const commaIndex = formatted.indexOf(',')
  return commaIndex >= 0
    ? `${formatted.slice(0, commaIndex)} ·${formatted.slice(commaIndex + 1)}`
    : formatted
}

export function formatDateHeading(isoDate: string): string {
  return dateHeadingFormatter.format(new Date(isoDate))
}

export function formatLongDate(isoDate: string): string {
  return longDateFormatter.format(new Date(isoDate))
}

export function formatTime(isoDate: string): string {
  return timeFormatter.format(new Date(isoDate))
}

export function localDateKey(date: Date): string {
  return toLocalDateInput(date)
}

export function relativeDayLabel(isoDate: string, referenceDate: Date): string {
  const date = new Date(isoDate)
  const todayKey = localDateKey(referenceDate)
  const dateKey = localDateKey(date)
  if (dateKey === todayKey) return 'Today'

  const yesterday = new Date(referenceDate)
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateKey === localDateKey(yesterday)) return 'Yesterday'

  return formatDateHeading(isoDate)
}

export function isSameLocalDay(left: Date, right: Date): boolean {
  return localDateKey(left) === localDateKey(right)
}

export function isSameLocalMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()
}

export function startOfLocalWeek(date: Date): Date {
  const start = new Date(date)
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  start.setHours(0, 0, 0, 0)
  return start
}

export function addLocalWeeks(date: Date, weeks: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + weeks * 7)
  return result
}
