import { Film, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AnimeRepository } from '../../repositories/animeRepository'
import { progressForSummary } from '../../domain/anime'
import { useAnimeProgress } from '../../state/useAnimeProgress'
import type { AnimeProgress, AnimeSummary, AnimeTrackingStatus } from '../../types/anime'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import type { AnimePlayerTarget } from './AnimePlayerDialog'
import { useAnimeText } from '../../services/animeI18n'

export function AnimeTrackingPanel({ repository, onOpen }: { repository: AnimeRepository; onOpen: (item: AnimePlayerTarget) => void }) {
  const t = useAnimeText()
  const { items, saveProgress, cloudError } = useAnimeProgress()
  const [addOpen, setAddOpen] = useState(false)
  const [filter, setFilter] = useState<AnimeTrackingStatus>('watching')
  const planned = items.filter((item) => item.trackingStatus === 'planned')
  const watching = items.filter((item) => item.trackingStatus === 'watching')
  const completed = items.filter((item) => item.trackingStatus === 'completed')
  const groups: Record<AnimeTrackingStatus, { title: string; items: AnimeProgress[] }> = {
    watching: { title: 'Watching', items: watching },
    planned: { title: 'Plan', items: planned },
    completed: { title: 'Finished', items: completed },
  }
  const selected = groups[filter]
  return <>
    <section className="mt-10 border-t border-[var(--border-subtle)] pt-10" aria-labelledby="tracking-heading">
      <div className="flex items-end justify-between gap-3"><div><p className="section-label text-[var(--accent-soft)]">Your library</p><h2 id="tracking-heading" className="mt-1 text-2xl font-semibold tracking-[-0.03em]">My List</h2></div><Button type="button" variant="secondary" onClick={() => setAddOpen(true)}><Plus aria-hidden="true" size={16} />{t('addAnime')}</Button></div>
      {cloudError && <p className="mt-3 text-xs text-[var(--danger)]">{t('cloudFailed')}</p>}
      <div className="anime-scroll mt-5 flex snap-x gap-2 overflow-x-auto pb-1" aria-label="My List filters">{(['watching', 'planned', 'completed'] as AnimeTrackingStatus[]).map((status) => <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)} className={`min-h-11 shrink-0 snap-start rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${filter === status ? 'border-[var(--accent)] bg-[var(--accent-wash)] text-[var(--text-primary)]' : 'border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}>{groups[status].title} <span className="ml-1.5 text-xs text-[var(--text-muted)]">{groups[status].items.length}</span></button>)}</div>
      <div className="mt-5"><TrackingGrid status={filter} items={selected.items} onOpen={onOpen} /></div>
    </section>
    <ManualTrackingDialog open={addOpen} onClose={() => setAddOpen(false)} repository={repository} onSave={(anime, episode, status) => { saveProgress(progressForSummary(anime, episode, status), { immediate: true }); setAddOpen(false) }} />
  </>
}

function TrackingGrid({ status, items, onOpen }: { status: AnimeTrackingStatus; items: AnimeProgress[]; onOpen: (item: AnimePlayerTarget) => void }) {
  const t = useAnimeText()
  if (!items.length) return <p className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-5 text-sm text-[var(--text-muted)]">{t('noTracking')}</p>
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6">{items.slice(0, 12).map((item) => <TrackingPoster key={item.externalId} item={item} status={status} onOpen={onOpen} />)}</div>
}

function TrackingPoster({ item, status, onOpen }: { item: AnimeProgress; status: AnimeTrackingStatus; onOpen: (item: AnimePlayerTarget) => void }) {
  const progress = status === 'watching' && item.totalEpisodes ? Math.min(100, Math.max(0, (item.currentEpisode / item.totalEpisodes) * 100)) : null
  const context = status === 'watching' ? `Episode ${item.currentEpisode}${item.totalEpisodes ? ` of ${item.totalEpisodes}` : ''}` : status === 'completed' ? 'Finished' : 'Ready when you are'
  return <button type="button" aria-label={`Open ${item.title}`} onClick={() => onOpen({ externalId: item.externalId, title: item.title, coverUrl: item.coverUrl, totalEpisodes: item.totalEpisodes })} className="group min-w-0 text-left outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)]">
    <span className="relative block aspect-[2/3] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-[var(--shadow-soft)]">
      {item.coverUrl ? <img src={item.coverUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.025]" /> : <span className="grid size-full place-items-center text-[var(--text-muted)]"><Film aria-hidden="true" size={24} /></span>}
      {progress !== null && <span className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-black/35"><span className="block h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></span>}
    </span>
    <strong className="mt-2 block truncate text-sm text-[var(--text-primary)]">{item.title}</strong>
    <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{context}</span>
  </button>
}

function ManualTrackingDialog({ open, onClose, repository, onSave }: { open: boolean; onClose: () => void; repository: AnimeRepository; onSave: (anime: AnimeSummary, episode: number, status: AnimeTrackingStatus) => void }) {
  const t = useAnimeText()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AnimeSummary[]>([])
  const [selected, setSelected] = useState<AnimeSummary | null>(null)
  const [episode, setEpisode] = useState(1)
  const [status, setStatus] = useState<AnimeTrackingStatus>('watching')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open || query.trim().length < 2) return
    let cancelled = false
    const timer = setTimeout(() => void repository.searchTitles(query).then((items) => { if (!cancelled) { setResults(items); setError('') } }).catch(() => { if (!cancelled) setError(t('searchFailed')) }), 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [open, query, repository, t])
  function close() { setQuery(''); setResults([]); setSelected(null); setEpisode(1); setError(''); onClose() }
  return <Dialog open={open} onOpenChange={(next) => !next && close()}><DialogContent>
    <DialogTitle className="pr-12 text-xl font-semibold">{t('addAnime')}</DialogTitle><DialogDescription className="mt-2 text-sm text-[var(--text-secondary)]">{t('chooseCatalogue')}</DialogDescription>
    {!selected ? <div className="mt-5"><label className="form-label" htmlFor="tracking-search">{t('searchCatalogue')}</label><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3.5 text-[var(--text-muted)]" size={17} /><input id="tracking-search" autoFocus className="form-control pl-10" value={query} onChange={(event) => setQuery(event.target.value)} /></div>{error && <p className="form-error">{error}</p>}<div className="mt-3 grid gap-2">{query.trim().length >= 2 && results.map((anime) => <button type="button" key={anime.externalId} className="rounded-xl border border-[var(--border-subtle)] p-3 text-left hover:bg-[var(--surface-hover)]" onClick={() => { setSelected(anime); setEpisode(1) }}><strong>{anime.title}</strong><span className="ml-2 text-xs text-[var(--text-muted)]">{anime.year}</span></button>)}</div></div> : <div className="mt-5"><p className="font-semibold">{selected.title}</p><label className="form-label mt-4" htmlFor="tracking-episode">{t('currentEpisode')}</label><input id="tracking-episode" className="form-control" type="number" min="1" max={selected.totalEpisodes} value={episode} onChange={(event) => setEpisode(Number(event.target.value))} /><label className="form-label mt-4" htmlFor="tracking-status">{t('status')}</label><select id="tracking-status" className="form-control" value={status} onChange={(event) => setStatus(event.target.value as AnimeTrackingStatus)}><option value="planned">Plan</option><option value="watching">{t('watching')}</option><option value="completed">{t('completed')}</option></select></div>}
    <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={close}>{t('cancel')}</Button>{selected && <Button type="button" disabled={!Number.isInteger(episode) || episode < 1 || Boolean(selected.totalEpisodes && episode > selected.totalEpisodes)} onClick={() => onSave(selected, episode, status)}>{t('save')}</Button>}</div>
  </DialogContent></Dialog>
}
