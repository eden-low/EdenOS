import { useEffect, useState } from 'react'
import { localDateKey } from '../../lib/date'
import { cachedDailyQuote, loadDailyQuote, type DailyQuote as Quote } from '../../services/dailyQuote'

function attribution(quote: Quote): string | null {
  if (quote.author && quote.source) return `${quote.author} · ${quote.source}`
  return quote.author ?? quote.source
}

export function DailyQuote({ referenceDate }: { referenceDate: Date }) {
  const dateKey = localDateKey(referenceDate)
  const [quote, setQuote] = useState<Quote | null>(() => cachedDailyQuote(localStorage, referenceDate))

  useEffect(() => {
    let active = true
    void loadDailyQuote(localStorage, referenceDate).then((next) => {
      if (active) setQuote(next)
    })
    return () => { active = false }
  }, [dateKey, referenceDate])

  const credit = quote && attribution(quote)
  return (
    <section aria-label="Daily quote" className="flex min-h-28 min-w-0 flex-col justify-center px-4 py-3 sm:min-h-20 sm:px-5">
      <p className="section-label">Daily quote</p>
      {quote ? (
        <div className="mt-1 min-w-0 sm:flex sm:items-baseline sm:justify-between sm:gap-5">
          <p className="min-w-0 break-words text-sm leading-5 text-[var(--text-secondary)] sm:leading-6">“{quote.text}”</p>
          {credit && (
            <a
              className="mt-1 inline-flex min-h-10 min-w-0 items-center truncate rounded-lg py-1 text-xs leading-4 text-[var(--text-muted)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-soft)] sm:mt-0 sm:max-w-[35%] sm:shrink-0 sm:justify-end sm:text-right sm:leading-5"
              href={`https://hitokoto.cn/?uuid=${encodeURIComponent(quote.uuid)}`}
              title={credit}
              target="_blank"
              rel="noopener noreferrer"
            >
              — {credit}
            </a>
          )}
        </div>
      ) : (
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Take a moment to pause.</p>
      )}
    </section>
  )
}
