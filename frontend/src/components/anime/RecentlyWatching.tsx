import { useAnimeProgress } from '../../state/useAnimeProgress'
import { Button } from '../ui/button'
import type { AnimePlayerTarget } from './AnimePlayerDialog'
import { useAnimeText } from '../../services/animeI18n'

export function RecentlyWatching({ onOpen }: { onOpen: (target: AnimePlayerTarget) => void }) {
  const t = useAnimeText()
  const { items } = useAnimeProgress()
  const recent = items.filter((item) => item.trackingStatus === 'watching').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6)
  return <section className="mt-8" aria-labelledby="recent-anime-heading"><h2 id="recent-anime-heading" className="section-label">Continue Watching</h2>{recent.length ? <div className="mt-3 flex gap-3 overflow-x-auto pb-2">{recent.map((item) => <article key={item.externalId} className="flex min-w-[16rem] items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">{item.coverUrl && <img src={item.coverUrl} alt="" className="h-20 w-14 rounded-lg object-cover" />}<div className="min-w-0"><h3 className="truncate text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs text-[var(--text-secondary)]">Next: {t('episode')} {item.currentEpisode}</p><Button type="button" variant="ghost" className="mt-1 min-h-8 px-0 text-xs" onClick={() => onOpen({ externalId: item.externalId, title: item.title, coverUrl: item.coverUrl, totalEpisodes: item.totalEpisodes })}>{t('continue')}</Button></div></article>)}</div> : <p className="mt-3 rounded-2xl border border-dashed border-[var(--border-subtle)] p-5 text-sm text-[var(--text-muted)]">Start a title from your list and it will appear here.</p>}</section>
}
