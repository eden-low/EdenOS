import { currencyCodes, isReferenceFresh, validRateDate, type ReferenceRate } from '../domain/currencyConversion'
import { toLocalDateInput } from '../lib/date'

const cache = new Map<string, { value: ReferenceRate; expires: number }>()
const pending = new Map<string, Promise<ReferenceRate>>()

export function getReferenceRate(currency: string, date?: string): Promise<ReferenceRate> {
  if (!(currencyCodes as readonly string[]).includes(currency) || currency === 'MYR') return Promise.reject(new Error('Unsupported currency. Enter the actual MYR amount manually.'))
  const today = new Date().toISOString().slice(0, 10)
  if (date !== undefined && (!validRateDate(date) || date > toLocalDateInput(new Date()))) return Promise.reject(new Error('Choose a valid past or current exchange-rate date.'))
  // A Malaysian consumption date can already be tomorrow in UTC. Query the last
  // available UTC day and always display the actual returned publication date.
  const queryDate = date && date > today ? today : date
  const key = `${currency}:${date ?? 'latest'}`
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now() && isReferenceFresh(cached.value, date ?? today)) return Promise.resolve(cached.value)
  const existing = pending.get(key)
  if (existing) return existing
  const request = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(`https://api.frankfurter.dev/v2/rate/${currency}/MYR${queryDate ? `?date=${queryDate}` : ''}`, {
        signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store',
      })
      if (!response.ok) throw new Error('Exchange-rate service is unavailable or this pair is unsupported.')
      const raw: unknown = await response.json()
      if (!raw || typeof raw !== 'object') throw new Error('Invalid exchange-rate response.')
      const data = raw as Record<string, unknown>
      if (data.base !== currency || data.quote !== 'MYR' || typeof data.date !== 'string' ||
        typeof data.rate !== 'number' || !Number.isFinite(data.rate) || data.rate <= 0 ||
        !/^\d+(?:\.\d{1,15})?$/.test(String(data.rate))) throw new Error('Invalid exchange-rate response.')
      const rate: ReferenceRate = { base: currency, quote: 'MYR', date: data.date, rate: String(data.rate) }
      if (!isReferenceFresh(rate, date ?? today)) throw new Error('Exchange-rate data is stale or has an invalid date. Enter the actual MYR amount manually.')
      if (cache.size >= 100) cache.delete(cache.keys().next().value!)
      cache.set(key, { value: rate, expires: Date.now() + 3600000 })
      return rate
    } finally { clearTimeout(timeout) }
  })().finally(() => pending.delete(key))
  pending.set(key, request)
  return request
}
