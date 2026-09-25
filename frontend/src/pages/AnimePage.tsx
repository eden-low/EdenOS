import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimeCard } from '../components/anime/AnimeCard'
import { AnimeCatalogueStatusCard, AnimeDiscoverySections } from '../components/anime/AnimeDiscoverySections'
import { AnimeFilters } from '../components/anime/AnimeFilters'
import { AnimePlayerDialog, type AnimePlayerTarget } from '../components/anime/AnimePlayerDialog'
import { AnimeTrackingPanel } from '../components/anime/AnimeTrackingPanel'
import { RecentlyWatching } from '../components/anime/RecentlyWatching'
import { Button } from '../components/ui/button'
import { SearchField } from '../components/ui/SearchField'
import { animePageSize, animeSearchDebounceMs } from '../domain/anime'
import { createFirestoreAnimeRepository } from '../repositories/firestoreAnimeRepository'
import { useFirebaseAuth } from '../state/useFirebaseAuth'
import type { AnimeCatalogueFilters, AnimeSummary } from '../types/anime'
import { useAnimeText } from '../services/animeI18n'

export function AnimePage() {
  const t = useAnimeText()
  const { firestore } = useFirebaseAuth()
  const repository = useMemo(() => createFirestoreAnimeRepository(firestore), [firestore])
  const initialSearch = new URLSearchParams(window.location.search).get('q')?.trim() ?? ''
  const [queryInput, setQueryInput] = useState(initialSearch)
  const [search, setSearch] = useState(initialSearch)
  const [filters, setFilters] = useState<AnimeCatalogueFilters>({})
  const [items, setItems] = useState<AnimeSummary[]>([])
  const [cursor, setCursor] = useState<unknown>()
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [selected, setSelected] = useState<AnimePlayerTarget | null>(null)
  const requestId = useRef(0)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [])

  function changeSearchInput(value: string) {
    setQueryInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(value.trim()), animeSearchDebounceMs)
  }

  function clearSearch() {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setQueryInput('')
    setSearch('')
  }

  function clearSecondaryFilters() {
    setFilters((current) => ({ ...current, region: undefined, genre: undefined, status: undefined, year: undefined }))
  }

  const hasSecondaryFilters = filters.region !== undefined || filters.genre !== undefined || filters.status !== undefined || filters.year !== undefined

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current
    setStatus('loading')
    try {
      const page = await repository.fetchPage({ search, filters, cursor: undefined })
      if (id !== requestId.current) return
      setItems(page.items); setCursor(page.cursor); setTotal(page.total); setHasMore(page.hasMore); setStatus('ready')
    } catch { if (id === requestId.current) setStatus('error') }
  }, [filters, repository, search])
  // Catalogue changes intentionally initiate a new remote page request.
  // oxlint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadFirst() }, [loadFirst])

  async function loadMore() {
    if (!cursor || status === 'loading') return
    setStatus('loading')
    try {
      const page = await repository.fetchPage({ search, filters, cursor, loadedCount: items.length })
      setItems((current) => [...current, ...page.items]); setCursor(page.cursor); setTotal(page.total); setHasMore(page.hasMore); setStatus('ready')
    } catch { setStatus('error') }
  }

  return <div className="mx-auto w-full max-w-[92rem] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
    <header><p className="section-label text-[var(--accent-soft)]">Eden OS</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{t('anime')}</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">{t('subtitle')}</p></header>
    <AnimeCatalogueStatusCard repository={repository} />
    <RecentlyWatching onOpen={setSelected} />
    <AnimeDiscoverySections repository={repository} onOpen={setSelected} />
    <AnimeTrackingPanel repository={repository} onOpen={setSelected} />
    <section className="mt-8" aria-labelledby="anime-catalogue-heading">
      <h2 id="anime-catalogue-heading" className="section-label">{t('catalogue')}</h2>
      <form className="mt-3" onSubmit={(event) => { event.preventDefault(); if (searchTimer.current) clearTimeout(searchTimer.current); setSearch(queryInput.trim()) }}>
        <SearchField label={t('search')} placeholder={t('search')} value={queryInput} onChange={changeSearchInput} onClear={clearSearch} clearLabel={t('clearSearch')} />
      </form>
      <AnimeFilters value={filters} onChange={setFilters} />
      {status === 'loading' && items.length === 0 && <div aria-label="Loading Anime catalogue" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-primary)]" />)}</div>}
      {status === 'error' && <div role="alert" className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6"><p>{t('catalogueError')}</p><Button type="button" variant="secondary" className="mt-4" onClick={() => void loadFirst()}>{t('retry')}</Button></div>}
      {status === 'ready' && items.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center sm:p-8">
        <p className="text-sm font-medium text-[var(--text-secondary)]">{search ? `${t('noSearchResults')} “${search}”` : t('noResults')}</p>
        {search && hasSecondaryFilters && <p className="mt-2 text-xs text-[var(--text-muted)]">{t('filtersMayRestrict')}</p>}
        {(search || hasSecondaryFilters) && <div className="mt-4 flex flex-wrap justify-center gap-2">
          {search && <Button type="button" variant="secondary" onClick={clearSearch}>{t('clearSearch')}</Button>}
          {hasSecondaryFilters && <Button type="button" variant="secondary" onClick={clearSecondaryFilters}>{t('clearFilters')}</Button>}
        </div>}
      </div>}
      {items.length > 0 && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6"><>{items.map((anime) => <AnimeCard anime={anime} onOpen={setSelected} key={anime.externalId} />)}</></div>}
      <div className="mt-6 flex flex-col items-center gap-3"><div aria-live="polite" className="text-center"><p className="section-label">{t('results')}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{t('loaded')} {items.length} / {total}</p></div>{hasMore && <Button type="button" variant="secondary" onClick={() => void loadMore()} disabled={status === 'loading'}>{status === 'loading' ? t('loading') : `${t('loadMore')} (${animePageSize})`}</Button>}</div>
    </section>
    <AnimePlayerDialog target={selected} onClose={() => setSelected(null)} />
  </div>
}
