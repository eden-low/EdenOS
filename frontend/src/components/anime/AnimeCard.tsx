import { Film, Play } from 'lucide-react'
import { useState } from 'react'
import type { AnimeSummary } from '../../types/anime'
import { useAnimeText } from '../../services/animeI18n'

export function AnimeCard({ anime, onOpen }: { anime: AnimeSummary; onOpen: (anime: AnimeSummary) => void }) {
  const t = useAnimeText()
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onOpen(anime)}
      className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-left outline-none transition-transform hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-[var(--focus)]"
      aria-label={`Open ${anime.title}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[var(--surface-secondary)]">
        {imageFailed ? (
          <span className="grid size-full place-items-center text-[var(--text-muted)]"><Film aria-hidden="true" size={30} /></span>
        ) : (
          <img src={anime.coverUrl} alt={`${anime.title} cover`} loading="lazy" className="size-full object-cover" onError={() => setImageFailed(true)} />
        )}
        <span className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <Play aria-hidden="true" size={16} fill="currentColor" />
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[var(--text-primary)]">{anime.title}</h3>
        <p className="mt-2 flex flex-wrap gap-x-2 text-xs text-[var(--text-muted)]">
          {anime.year && <span>{anime.year}</span>}
          <span>{anime.mediaType.replace('_', ' ')}</span>
          {anime.score !== undefined && <span>{anime.score.toFixed(1)}</span>}
        </p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {anime.status === 'airing' ? t('airing') : t('completed')}
          {anime.totalEpisodes ? ` · ${anime.totalEpisodes} ${t('episodes').toLowerCase()}` : ''}
        </p>
      </div>
    </button>
  )
}
