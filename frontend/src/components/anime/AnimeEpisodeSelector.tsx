import { animeEpisodeSegmentSize } from '../../domain/anime'
import type { AnimeEpisode } from '../../types/anime'
import { useAnimeText } from '../../services/animeI18n'

export function AnimeEpisodeSelector({ episodes, selectedEpisode, watchedEpisodes, onSelect }: {
  episodes: AnimeEpisode[]
  selectedEpisode: number
  watchedEpisodes: number[]
  onSelect: (episode: number) => void
}) {
  const t = useAnimeText()
  const selectedIndex = Math.max(0, episodes.findIndex((episode) => episode.episodeNumber === selectedEpisode))
  const [segment, setSegment] = useSegment(selectedIndex)
  const segmentCount = Math.ceil(episodes.length / animeEpisodeSegmentSize)
  const visible = episodes.slice(segment * animeEpisodeSegmentSize, (segment + 1) * animeEpisodeSegmentSize)
  return (
    <div>
      {segmentCount > 1 && <select aria-label="Episode range" className="form-control mb-3" value={segment} onChange={(event) => setSegment(Number(event.target.value))}>
        {Array.from({ length: segmentCount }, (_, index) => {
          const start = index * animeEpisodeSegmentSize + 1
          const end = Math.min((index + 1) * animeEpisodeSegmentSize, episodes.length)
          return <option value={index} key={start}>{start}–{end}</option>
        })}
      </select>}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-2">
        {visible.map((episode) => {
          const current = episode.episodeNumber === selectedEpisode
          const watched = watchedEpisodes.includes(episode.episodeNumber)
          return <button key={episode.episodeNumber} type="button" aria-current={current ? 'true' : undefined} onClick={() => onSelect(episode.episodeNumber)} className={`min-h-10 rounded-xl border px-2 text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${current ? 'border-[var(--accent-primary)] bg-[var(--accent-wash)] text-[var(--accent-soft)]' : watched ? 'border-[var(--accent-teal)] bg-[var(--accent-teal-wash)] text-[var(--text-primary)]' : 'border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)]'}`}>
            {episode.title || `${t('episode')} ${episode.episodeNumber}`}
          </button>
        })}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
function useSegment(selectedIndex: number) {
  const [segment, setSegment] = useState(Math.floor(selectedIndex / animeEpisodeSegmentSize))
  // External previous/next controls must bring the selected episode segment into view.
  // oxlint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSegment(Math.floor(selectedIndex / animeEpisodeSegmentSize)), [selectedIndex])
  return [segment, setSegment] as const
}
