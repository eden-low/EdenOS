import type { MoneyInSen } from '../types/dashboard'

const wholeNumber = new Intl.NumberFormat('en-MY', {
  maximumFractionDigits: 0,
})

const decimalNumber = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(amountSen: MoneyInSen): string {
  const absoluteSen = Math.abs(amountSen)
  const ringgit = absoluteSen / 100
  const formatter = absoluteSen % 100 === 0 ? wholeNumber : decimalNumber
  const sign = amountSen < 0 ? '-' : ''

  return `${sign}RM ${formatter.format(ringgit)}`
}

export function formatMoneyExact(amountSen: MoneyInSen): string {
  const sign = amountSen < 0 ? '-' : ''
  return `${sign}RM ${decimalNumber.format(Math.abs(amountSen) / 100)}`
}

export function parseRinggitToSen(value: string): number | null {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const [whole, fraction = ''] = normalized.split('.')
  const sen = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))

  return Number.isSafeInteger(sen) && sen > 0 ? sen : null
}

export function formatDistance(distanceMetres: number): string {
  return `${wholeNumber.format(distanceMetres)} m`
}

export function formatDuration(durationSeconds: number): string {
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} hr`
  return `${hours} hr ${minutes} min`
}

export function parseDurationToSeconds(input: string, allowBareMinutes = false): number | null {
  const value = input.trim()
  if (!value) return null

  let minutes: number | null = null
  if (allowBareMinutes && /^\d+$/.test(value)) {
    minutes = Number(value)
  } else if (/^一个半\s*小时$/.test(value)) {
    minutes = 90
  } else {
    const minuteUnit = '(?:分钟|分|minutes?|mins?|m)'
    const hourUnit = '(?:小时|hours?|hrs?|h)'
    const compactHoursAndMinutes = value.match(/^(\d+)h([0-5]\d)$/i)
    const minuteOnly = value.match(new RegExp(`^(\\d+)\\s*${minuteUnit}$`, 'i'))
    const hoursAndMinutes = value.match(
      new RegExp(`^(\\d+(?:\\.\\d+)?|一|半)\\s*${hourUnit}(?:\\s*(\\d+)\\s*${minuteUnit})?$`, 'i'),
    )

    if (compactHoursAndMinutes) {
      minutes = Number(compactHoursAndMinutes[1]) * 60 + Number(compactHoursAndMinutes[2])
    } else if (minuteOnly) {
      minutes = Number(minuteOnly[1])
    } else if (hoursAndMinutes) {
      const hourValue = hoursAndMinutes[1] === '一'
        ? 1
        : hoursAndMinutes[1] === '半' ? 0.5 : Number(hoursAndMinutes[1])
      const extraMinutes = Number(hoursAndMinutes[2] ?? 0)
      if (extraMinutes >= 60) return null
      minutes = hourValue * 60 + extraMinutes
    }
  }

  if (minutes === null || !Number.isSafeInteger(minutes) || minutes <= 0) return null
  const seconds = minutes * 60
  return Number.isSafeInteger(seconds) ? seconds : null
}

export function formatExerciseMetrics(
  durationSeconds: number,
  distanceMetres?: number,
): string {
  return [
    distanceMetres === undefined ? null : formatDistance(distanceMetres),
    formatDuration(durationSeconds),
  ]
    .filter((segment): segment is string => segment !== null)
    .join(' · ')
}
