import { Film, Play } from 'lucide-react'
import { useState } from 'react'
import type { AnimeSummary } from '../../types/anime'
import type { AnimePlayerTarget } from './AnimePlayerDialog'

export function AnimePosterCard({ anime, context, onOpen }: {
  anime: AnimeSummary
  context: string
  onOpen: (target: AnimePlayerTarget) => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  return <button type="button" aria-label={`Open ${anime.title}`} onClick={() => onOpen(anime)} className="group min-w-0 snap-start text-left outline-none">
    <span className="relative block aspect-[2/3] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] shadow-[var(--shadow-soft)] transition-transform group-hover:-translate-y-1 group-focus-visible:ring-3 group-focus-visible:ring-[var(--focus)]">
      {imageFailed || !anime.coverUrl
        ? <span className="grid size-full place-items-center text-[var(--text-muted)]"><Film aria-hidden="true" size={28} /></span>
        : <img src={anime.coverUrl} alt="" loading="lazy" className="size-full object-cover" onError={() => setImageFailed(true)} />}
      <span className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><Play aria-hidden="true" size={15} fill="currentColor" /></span>
    </span>
    <span className="mt-3 block line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[var(--text-primary)]">{anime.title}</span>
    <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">{context}</span>
  </button>
}
