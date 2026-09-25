import { Bookmark, CheckCircle2, Plus, PlayCircle, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AnimeRepository } from '../../repositories/animeRepository'
import { progressForSummary } from '../../domain/anime'
import { useAnimeProgress } from '../../state/useAnimeProgress'
import type { AnimeProgress, AnimeSummary, AnimeTrackingStatus } from '../../types/anime'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import type { AnimePlayerTarget } from './AnimePlayerDialog'
import { useAnimeText } from '../../services/animeI18n'

function ProgressRow({ item, onOpen }: { item: AnimeProgress; onOpen: (item: AnimePlayerTarget) => void }) {
  const t = useAnimeText()
  return <button type="button" onClick={() => onOpen({ externalId: item.externalId, title: item.title, coverUrl: item.coverUrl, totalEpisodes: item.totalEpisodes })} className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-left outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]">
    {item.coverUrl ? <img src={item.coverUrl} alt="" loading="lazy" className="h-16 w-11 shrink-0 rounded-lg object-cover" /> : <span className="grid h-16 w-11 shrink-0 place-items-center rounded-lg bg-[var(--surface-hover)]"><PlayCircle aria-hidden="true" size={18} /></span>}
    <span className="min-w-0"><strong className="block truncate text-sm text-[var(--text-primary)]">{item.title}</strong><span className="mt-1 block text-xs text-[var(--text-secondary)]">{t('episode')} {item.currentEpisode}{item.totalEpisodes ? ` / ${item.totalEpisodes}` : ''}</span></span>
  </button>
}

export function AnimeTrackingPanel({ repository, onOpen }: { repository: AnimeRepository; onOpen: (item: AnimePlayerTarget) => void }) {
  const t = useAnimeText()
  const { items, saveProgress, cloudError } = useAnimeProgress()
  const [addOpen, setAddOpen] = useState(false)
  const [filter, setFilter] = useState<AnimeTrackingStatus>('watching')
  const planned = items.filter((item) => item.trackingStatus === 'planned')
  const watching = items.filter((item) => item.trackingStatus === 'watching')
  const completed = items.filter((item) => item.trackingStatus === 'completed')
  const groups = {
    planned: { title: 'Plan', icon: <Bookmark aria-hidden="true" size={17} />, items: planned },
    watching: { title: t('watching'), icon: <PlayCircle aria-hidden="true" size={17} />, items: watching },
    completed: { title: t('completed'), icon: <CheckCircle2 aria-hidden="true" size={17} />, items: completed },
  }
  const selected = groups[filter]
  return <>
    <section className="dashboard-card mt-6 p-5 sm:p-6" aria-labelledby="tracking-heading">
      <div className="flex items-center justify-between gap-3"><div><p className="section-label">{t('library')}</p><h2 id="tracking-heading" className="mt-1 text-xl font-semibold">{t('tracking')}</h2></div><Button type="button" variant="secondary" onClick={() => setAddOpen(true)}><Plus aria-hidden="true" size={16} />{t('addAnime')}</Button></div>
      {cloudError && <p className="mt-3 text-xs text-[var(--danger)]">{t('cloudFailed')}</p>}
      <div className="mt-5 flex flex-wrap gap-2" aria-label="My List filters">{(Object.keys(groups) as AnimeTrackingStatus[]).map((status) => <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)} className={`min-h-10 rounded-full border px-3 text-sm font-medium ${filter === status ? 'border-[var(--accent)] bg-[var(--accent-wash)] text-[var(--text-primary)]' : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}>{groups[status].title} <span className="ml-1 text-xs text-[var(--text-muted)]">{groups[status].items.length}</span></button>)}</div>
      <div className="mt-5"><TrackingGroup title={selected.title} icon={selected.icon} items={selected.items} onOpen={onOpen} /></div>
    </section>
    <ManualTrackingDialog open={addOpen} onClose={() => setAddOpen(false)} repository={repository} onSave={(anime, episode, status) => { saveProgress(progressForSummary(anime, episode, status), { immediate: true }); setAddOpen(false) }} />
  </>
}

function TrackingGroup({ title, icon, items, onOpen }: { title: string; icon: ReactNode; items: AnimeProgress[]; onOpen: (item: AnimePlayerTarget) => void }) {
  const t = useAnimeText()
  return <div><h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">{icon}{title}<span className="ml-auto text-xs text-[var(--text-muted)]">{items.length}</span></h3><div className="mt-3 grid gap-2">{items.length ? items.slice(0, 4).map((item) => <ProgressRow key={item.externalId} item={item} onOpen={onOpen} />) : <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]">{t('noTracking')}</p>}</div></div>
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
