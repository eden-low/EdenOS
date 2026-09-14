import { useEffect, useState } from 'react'
import { localDateKey } from '../lib/date'

function greetingPeriod(date: Date): 'morning' | 'afternoon' | 'evening' {
  const hour = date.getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

function nextLocalBoundary(date: Date): Date {
  const boundaries = [
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12),
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18),
    new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
  ]

  return boundaries.find((boundary) => boundary > date) ?? boundaries[boundaries.length - 1]
}

function hasRelevantTimeChanged(previous: Date, next: Date): boolean {
  return localDateKey(previous) !== localDateKey(next) ||
    greetingPeriod(previous) !== greetingPeriod(next)
}

export function useLocalReferenceDate(): Date {
  const [referenceDate, setReferenceDate] = useState(() => new Date())

  useEffect(() => {
    let timeoutId: number | undefined

    function refreshReferenceIfNeeded() {
      const now = new Date()
      setReferenceDate((previous) => hasRelevantTimeChanged(previous, now) ? now : previous)
    }

    function scheduleNextBoundary() {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)

      const now = new Date()
      const delay = Math.max(1_000, nextLocalBoundary(now).getTime() - now.getTime() + 100)
      timeoutId = window.setTimeout(() => {
        refreshReferenceIfNeeded()
        scheduleNextBoundary()
      }, delay)
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return

      refreshReferenceIfNeeded()
      scheduleNextBoundary()
    }

    scheduleNextBoundary()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return referenceDate
}
