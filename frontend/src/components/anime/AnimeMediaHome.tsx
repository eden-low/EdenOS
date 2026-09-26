import { ArrowRight, Film, Play, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { selectAnimeHero, type AnimeHeroSelection } from '../../domain/anime'
import type { AnimeRepository } from '../../repositories/animeRepository'
import { useAnimeProgress } from '../../state/useAnimeProgress'
import type { AnimeProgress, AnimeSummary } from '../../types/anime'
import { Button } from '../ui/button'
import type { AnimePlayerTarget } from './AnimePlayerDialog'
import { AnimePosterCard } from './AnimePosterCard'

type LoadState = 'loading' | 'ready' | 'error'

export function AnimeMediaHome({ repository, catalogueFallback, onOpen }: {
  repository: AnimeRepository
  catalogueFallback?: AnimeSummary
  onOpen: (target: AnimePlayerTarget) => void
}) {
  const { items: progress } = useAnimeProgress()
  const [newItems, setNewItems] = useState<AnimeSummary[]>([])
  const [recentItems, setRecentItems] = useState<AnimeSummary[]>([])
  const [newState, setNewState] = useState<LoadState>('loading')
  const [recentState, setRecentState] = useState<LoadState>('loading')
  const [newAttempt, setNewAttempt] = useState(0)
  const [recentAttempt, setRecentAttempt] = useState(0)

  useEffect(() => {
    let active = true
    // oxlint-disable-next-line react-hooks/set-state-in-effect
    setNewState('loading')
    void repository.fetchPublishedSince(startOfWeek(), 6)
      .then((items) => { if (active) { setNewItems(items); setNewState('ready') } })
      .catch(() => { if (active) setNewState('error') })
    return () => { active = false }
  }, [newAttempt, repository])

  useEffect(() => {
    let active = true
    // oxlint-disable-next-line react-hooks/set-state-in-effect
    setRecentState('loading')
    void repository.fetchRecent(6)
      .then((items) => { if (active) { setRecentItems(items); setRecentState('ready') } })
      .catch(() => { if (active) setRecentState('error') })
    return () => { active = false }
  }, [recentAttempt, repository])

  const hero = useMemo(() => selectAnimeHero(progress, newItems, recentItems, catalogueFallback), [catalogueFallback, newItems, progress, recentItems])
  const railItems = newItems.length ? newItems.slice(0, 3) : recentItems.slice(0, 3)
  const railTitle = newItems.length ? 'New this week' : 'Latest updates'

  return <>
    <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2.35fr)_minmax(18rem,0.85fr)]">
      <AnimeHero selection={hero} loading={!hero && (newState === 'loading' || recentState === 'loading')} onOpen={onOpen} />
      <DiscoveryRail title={railTitle} items={railItems} state={newItems.length ? newState : recentState} onRetry={() => newItems.length ? setNewAttempt((value) => value + 1) : setRecentAttempt((value) => value + 1)} onOpen={onOpen} />
    </div>
    <ContinueWatchingRow items={progress} onOpen={onOpen} />
    <RecentlyUpdatedRow items={recentItems} state={recentState} onRetry={() => setRecentAttempt((value) => value + 1)} onOpen={onOpen} />
  </>
}

function AnimeHero({ selection, loading, onOpen }: { selection: AnimeHeroSelection | null; loading: boolean; onOpen: (target: AnimePlayerTarget) => void }) {
  if (loading) return <section aria-label="Loading featured Anime" className="min-h-72 animate-pulse rounded-[1.75rem] bg-[var(--surface-primary)] sm:min-h-[20rem]" />
  if (!selection) return <section aria-label="Featured Anime" className="grid min-h-72 place-items-center rounded-[1.75rem] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 text-center sm:min-h-[20rem]"><div><Film className="mx-auto text-[var(--text-muted)]" size={28} /><h2 className="mt-4 text-xl font-semibold">Your featured title will appear here</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Start watching or browse the catalogue to shape this space.</p></div></section>

  const item = selection.item
  const progress = selection.kind === 'progress' ? selection.item : null
  const catalogueItem = selection.kind === 'progress' ? null : selection.item
  const coverUrl = item.coverUrl
  const label = selection.kind === 'progress' ? 'Continue watching' : selection.kind === 'new' ? 'New this week' : selection.kind === 'recent' ? 'Recently updated' : 'From the catalogue'
  const target = { externalId: item.externalId, title: item.title, coverUrl: item.coverUrl, totalEpisodes: item.totalEpisodes }
  return <section aria-label="Featured Anime" className={`relative min-h-72 min-w-0 overflow-hidden rounded-[1.75rem] border border-[var(--border-subtle)] shadow-[var(--shadow-soft)] sm:min-h-[20rem] ${coverUrl ? 'bg-black text-white' : 'bg-[var(--surface-primary)] text-[var(--text-primary)]'}`}>
    {coverUrl && <><img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover object-[center_28%] opacity-70" /><div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/68 to-black/20" /></>}
    <div className="relative flex min-h-72 max-w-2xl flex-col justify-end p-6 sm:min-h-[20rem] sm:p-8 lg:p-10">
      <p className={`section-label ${coverUrl ? 'text-white/70' : 'text-[var(--accent-soft)]'}`}>{label}</p>
      <h2 className="mt-3 line-clamp-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{item.title}</h2>
      <p className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm ${coverUrl ? 'text-white/76' : 'text-[var(--text-secondary)]'}`}>
        {progress ? <><span>Episode {progress.currentEpisode}</span>{progress.totalEpisodes && <span>{Math.min(100, Math.round((progress.currentEpisode / progress.totalEpisodes) * 100))}% through the series</span>}</> : catalogueItem && <HeroMetadata item={catalogueItem} />}
      </p>
      <Button type="button" aria-label={progress ? `Continue watching ${item.title}` : `Open featured ${item.title}`} className="mt-6 w-fit" onClick={() => onOpen(target)}><Play aria-hidden="true" size={17} fill="currentColor" />{progress ? 'Continue watching' : 'Open Anime'}</Button>
    </div>
  </section>
}

function HeroMetadata({ item }: { item: AnimeSummary }) {
  return <>{item.year && <span>{item.year}</span>}<span>{item.mediaType.replace('_', ' ')}</span>{item.totalEpisodes && <span>{item.totalEpisodes} episodes</span>}<span>{item.status === 'airing' ? 'Airing' : 'Completed'}</span></>
}

function DiscoveryRail({ title, items, state, onRetry, onOpen }: { title: string; items: AnimeSummary[]; state: LoadState; onRetry: () => void; onOpen: (target: AnimePlayerTarget) => void }) {
  return <aside aria-label={title} className="min-w-0 overflow-hidden rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3"><div><p className="section-label">Discover</p><h2 className="mt-1 text-lg font-semibold">{title}</h2></div><ArrowRight aria-hidden="true" className="text-[var(--text-muted)]" size={18} /></div>
    {state === 'loading' && items.length === 0 && <div aria-label={`Loading ${title}`} className="mt-4 flex gap-3 overflow-hidden lg:grid">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-20 min-w-52 animate-pulse rounded-xl bg-[var(--surface-secondary)] lg:min-w-0" />)}</div>}
    {state === 'error' && items.length === 0 && <div role="alert" className="mt-4 rounded-xl bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-secondary)]"><p>Discovery is temporarily unavailable.</p><Button type="button" variant="ghost" className="mt-2" onClick={onRetry}><RefreshCw size={15} />Retry</Button></div>}
    {state === 'ready' && items.length === 0 && <p className="mt-4 text-sm text-[var(--text-muted)]">No newly published titles this week yet.</p>}
    {items.length > 0 && <div className="anime-scroll mt-4 flex snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:overflow-visible">{items.map((anime) => <button type="button" key={anime.externalId} onClick={() => onOpen(anime)} className="flex min-h-20 min-w-[15rem] snap-start items-center gap-3 rounded-xl bg-[var(--surface-secondary)] p-2.5 text-left outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)] lg:min-w-0">
      {anime.coverUrl ? <img src={anime.coverUrl} alt="" loading="lazy" className="h-16 w-11 shrink-0 rounded-lg object-cover" /> : <span className="grid h-16 w-11 shrink-0 place-items-center rounded-lg bg-[var(--surface-hover)]"><Film size={16} /></span>}
      <span className="min-w-0"><strong className="line-clamp-2 text-sm leading-5">{anime.title}</strong><span className="mt-1 block text-xs text-[var(--text-muted)]">{anime.totalEpisodes ? `${anime.totalEpisodes} episodes` : anime.status === 'airing' ? 'Airing' : 'Updated'}</span></span>
    </button>)}</div>}
  </aside>
}

export function ContinueWatchingRow({ items, onOpen }: { items: AnimeProgress[]; onOpen: (target: AnimePlayerTarget) => void }) {
  const watching = items.filter((item) => item.trackingStatus === 'watching').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6)
  return <section className="mt-10 min-w-0" aria-labelledby="continue-watching-heading">
    <SectionHeading id="continue-watching-heading" eyebrow="Your queue" title="Continue Watching" />
    {watching.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-[var(--border-subtle)] p-5 text-sm text-[var(--text-muted)]">Start a title from My List and it will appear here.</p> : <div data-testid="continue-watching-row" className="anime-scroll mt-4 grid snap-x snap-mandatory grid-flow-col auto-cols-[min(82vw,21rem)] gap-4 overflow-x-auto pb-3 sm:auto-cols-[20rem] xl:auto-cols-[21rem]">{watching.map((item) => <LandscapeProgressCard key={item.externalId} item={item} onOpen={onOpen} />)}</div>}
  </section>
}

function LandscapeProgressCard({ item, onOpen }: { item: AnimeProgress; onOpen: (target: AnimePlayerTarget) => void }) {
  const progress = item.totalEpisodes ? Math.min(100, Math.max(0, (item.currentEpisode / item.totalEpisodes) * 100)) : null
  return <button type="button" aria-label={`Resume ${item.title}`} onClick={() => onOpen({ externalId: item.externalId, title: item.title, coverUrl: item.coverUrl, totalEpisodes: item.totalEpisodes })} className="group relative aspect-[16/9] snap-start overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-left shadow-[var(--shadow-soft)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)]">
    {item.coverUrl ? <img src={item.coverUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover object-[center_30%] transition-transform duration-300 group-hover:scale-[1.03]" /> : <span className="absolute inset-0 grid place-items-center text-[var(--text-muted)]"><Film size={26} /></span>}
    <span className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/34 to-black/5" />
    <span className="absolute inset-x-0 bottom-0 block p-4 text-white">
      <span className="flex items-center gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-black"><Play size={15} fill="currentColor" /></span><strong className="line-clamp-1 min-w-0 text-base">{item.title}</strong></span>
      <span className="mt-3 flex items-center justify-between gap-3 text-xs text-white/76"><span>Episode {item.currentEpisode}{item.totalEpisodes ? ` of ${item.totalEpisodes}` : ''}</span>{progress !== null && <span>{Math.round(progress)}%</span>}</span>
      {progress !== null && <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/25"><span className="block h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></span>}
    </span>
  </button>
}

function RecentlyUpdatedRow({ items, state, onRetry, onOpen }: { items: AnimeSummary[]; state: LoadState; onRetry: () => void; onOpen: (target: AnimePlayerTarget) => void }) {
  return <section className="mt-10 min-w-0" aria-label="Recently updated">
    <SectionHeading eyebrow="Catalogue activity" title="Recently Updated" />
    {state === 'loading' && items.length === 0 && <div aria-label="Loading recently updated Anime" className="mt-4 grid grid-flow-col auto-cols-[9.5rem] gap-3 overflow-hidden lg:grid-cols-6 lg:grid-flow-row">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-primary)]" />)}</div>}
    {state === 'error' && items.length === 0 && <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-sm"><span className="min-w-0 flex-1 text-[var(--text-secondary)]">Recently updated titles are temporarily unavailable.</span><Button type="button" variant="secondary" onClick={onRetry}><RefreshCw size={15} />Retry</Button></div>}
    {state === 'ready' && items.length === 0 && <p className="mt-4 text-sm text-[var(--text-muted)]">No recent catalogue updates.</p>}
    {items.length > 0 && <div className="anime-scroll mt-4 grid snap-x snap-mandatory grid-flow-col auto-cols-[9.5rem] gap-3 overflow-x-auto pb-3 sm:auto-cols-[10.5rem] lg:grid-flow-row lg:grid-cols-6 lg:overflow-visible">{items.slice(0, 6).map((anime) => <AnimePosterCard key={anime.externalId} anime={anime} context={recentContext(anime)} onOpen={onOpen} />)}</div>}
  </section>
}

function SectionHeading({ id, eyebrow, title }: { id?: string; eyebrow: string; title: string }) {
  return <div><p className="section-label text-[var(--accent-soft)]">{eyebrow}</p><h2 id={id} className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{title}</h2></div>
}

function recentContext(anime: AnimeSummary): string {
  if (anime.totalEpisodes) return `${anime.totalEpisodes} episodes`
  return anime.status === 'airing' ? 'Airing' : 'Recently updated'
}

function startOfWeek(reference = new Date()): Date {
  const date = new Date(reference)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  date.setHours(0, 0, 0, 0)
  return date
}
