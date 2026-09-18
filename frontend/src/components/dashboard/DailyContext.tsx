import { DailyQuote } from './DailyQuote'
import { DailyWeather } from './DailyWeather'

export function DailyContext({ referenceDate }: { referenceDate: Date }) {
  return (
    <section aria-label="Daily context" className="dashboard-card mt-3 min-w-0 overflow-hidden sm:mt-4 sm:grid sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <DailyWeather />
      <DailyQuote referenceDate={referenceDate} />
    </section>
  )
}
