import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invalidateAnimeDetail, loadAnimeDetail, AnimeDetailError } from '../../services/animeDetailService'
import { animeWatchedThreshold } from '../../domain/anime'
import { useAnimeProgress } from '../../state/useAnimeProgress'
import type { AnimeDetail, AnimeProgress, AnimeSummary } from '../../types/anime'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { AnimeEpisodeSelector } from './AnimeEpisodeSelector'
import { AnimeVideoPlayer } from './AnimeVideoPlayer'
import { useAnimeText } from '../../services/animeI18n'

export interface AnimePlayerTarget {
  externalId: AnimeSummary['externalId']
  title: AnimeSummary['title']
  coverUrl?: AnimeSummary['coverUrl']
  totalEpisodes?: AnimeSummary['totalEpisodes']
}

export function AnimePlayerDialog({ target, onClose }: { target: AnimePlayerTarget | null; onClose: () => void }) {
  const t = useAnimeText()
  const { items, saveProgress, flushProgress } = useAnimeProgress()
  const [detail, setDetail] = useState<AnimeDetail | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')
  const [episodeNumber, setEpisodeNumber] = useState(1)
  const [sourceIndex, setSourceIndex] = useState(0)
  const latestRef = useRef<{ position: number; duration: number }>({ position: 0, duration: 0 })
  const saved = target ? items.find((item) => item.externalId === target.externalId) : undefined

  const load = useCallback(async () => {
    if (!target) return
    setState('loading'); setError(''); setDetail(null)
    try {
      const result = await loadAnimeDetail(target.externalId)
      setDetail(result)
      const preferred = saved?.currentEpisode
      setEpisodeNumber(preferred && result.episodes.some((episode) => episode.episodeNumber === preferred) ? preferred : result.episodes[0].episodeNumber)
      setSourceIndex(0)
      setState('idle')
    } catch (cause) {
      setError(cause instanceof AnimeDetailError && cause.code === 'not-configured'
        ? t('contentUnavailable') : t('detailsError'))
      setState('error')
    }
  }, [saved, t, target])

  // Loading is intentionally coupled to the dialog-open target.
  // oxlint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (target) void load() }, [load, target])
  const episode = detail?.episodes.find((item) => item.episodeNumber === episodeNumber)
  const source = episode?.sources[sourceIndex] ?? episode?.sources[0]

  const persist = useCallback((position: number, duration: number, immediate = false) => {
    if (!target) return
    const previous = items.find((item) => item.externalId === target.externalId)
    const watched = new Set(previous?.watchedEpisodes ?? [])
    if (duration > 0 && position / duration >= animeWatchedThreshold) watched.add(episodeNumber)
    const knownTotal = target.totalEpisodes ?? detail?.episodes.length
    const progress: AnimeProgress = {
      externalId: target.externalId, animeId: target.externalId, currentEpisode: episodeNumber,
      positionSeconds: Math.max(0, position), durationSeconds: Math.max(0, duration), watchedEpisodes: [...watched],
      trackingStatus: knownTotal && watched.size >= knownTotal ? 'completed' : (previous?.trackingStatus ?? 'watching'),
      updatedAt: Date.now(), title: target.title,
      ...(target.coverUrl ? { coverUrl: target.coverUrl } : {}),
      ...(knownTotal ? { totalEpisodes: knownTotal } : {}),
    }
    latestRef.current = { position, duration }
    saveProgress(progress, { immediate })
  }, [detail?.episodes.length, episodeNumber, items, saveProgress, target])

  const selectEpisode = useCallback((nextEpisode: number) => {
    persist(latestRef.current.position, latestRef.current.duration, true)
    latestRef.current = { position: 0, duration: 0 }
    setEpisodeNumber(nextEpisode); setSourceIndex(0)
  }, [persist])
  const episodeIndex = detail?.episodes.findIndex((item) => item.episodeNumber === episodeNumber) ?? -1
  const previous = useCallback(() => { if (detail && episodeIndex > 0) selectEpisode(detail.episodes[episodeIndex - 1].episodeNumber) }, [detail, episodeIndex, selectEpisode])
  const next = useCallback(() => { if (detail && episodeIndex >= 0 && episodeIndex < detail.episodes.length - 1) selectEpisode(detail.episodes[episodeIndex + 1].episodeNumber) }, [detail, episodeIndex, selectEpisode])
  const watchedEpisodes = useMemo(() => saved?.watchedEpisodes ?? [], [saved?.watchedEpisodes])

  function close() {
    if (target) { persist(latestRef.current.position, latestRef.current.duration, true); void flushProgress(target.externalId) }
    onClose()
  }

  return <Dialog open={Boolean(target)} onOpenChange={(open) => !open && close()}>
    <DialogContent variant="player" className="anime-player-dialog" onEscapeKeyDown={() => target && persist(latestRef.current.position, latestRef.current.duration, true)}>
      {target && <>
        <DialogTitle className="pr-12 text-xl font-semibold">{target.title}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-[var(--text-secondary)]">{t('onlinePlayer')}</DialogDescription>
        {state === 'loading' && <div aria-label="Loading Anime details" className="mt-6 aspect-video animate-pulse rounded-xl bg-[var(--surface-secondary)]" />}
        {state === 'error' && <div role="alert" className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5"><p>{error}</p><Button type="button" variant="secondary" className="mt-4" onClick={() => { invalidateAnimeDetail(target.externalId); void load() }}>{t('retry')}</Button></div>}
        {detail && episode && source && <div className="mt-5 grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0">
            <AnimeVideoPlayer source={source} resumeAt={saved?.currentEpisode === episodeNumber ? saved.positionSeconds : 0} onProgress={(position, duration) => persist(position, duration)} onPause={(position, duration) => persist(position, duration, true)} onPrevious={previous} onNext={next} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={previous} disabled={episodeIndex <= 0}>{t('previous')}</Button>
              <Button type="button" variant="secondary" onClick={next} disabled={episodeIndex >= detail.episodes.length - 1}>{t('next')}</Button>
              {episode.sources.length > 1 && <select aria-label={t('playbackSource')} className="form-control ml-auto w-auto" value={sourceIndex} onChange={(event) => { persist(latestRef.current.position, latestRef.current.duration, true); setSourceIndex(Number(event.target.value)) }}>
                {episode.sources.map((item, index) => <option value={index} key={`${item.label}-${index}`}>{item.label}</option>)}
              </select>}
            </div>
            {detail.description && <p className="mt-4 line-clamp-4 text-sm leading-6 text-[var(--text-secondary)]">{detail.description}</p>}
            <details className="anime-episode-drawer mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 lg:hidden"><summary className="font-semibold">{t('episodes')}</summary><div className="mt-4"><AnimeEpisodeSelector episodes={detail.episodes} selectedEpisode={episodeNumber} watchedEpisodes={watchedEpisodes} onSelect={selectEpisode} /></div></details>
          </div>
          <aside className="hidden min-h-0 overflow-y-auto border-l border-[var(--border-subtle)] pl-5 lg:block"><h3 className="mb-3 font-semibold">{t('episodes')}</h3><AnimeEpisodeSelector episodes={detail.episodes} selectedEpisode={episodeNumber} watchedEpisodes={watchedEpisodes} onSelect={selectEpisode} /></aside>
        </div>}
      </>}
    </DialogContent>
  </Dialog>
}
