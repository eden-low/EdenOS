import { Play, Sparkles, Tv } from 'lucide-react'
import type { AnimeProgress, AnimeSummary } from '../../types/anime'
import { Button } from '../ui/button'

export function AnimeHomeCard({ watching, recent, status, onOpen }: {
  watching: AnimeProgress[]
  recent: AnimeSummary[]
  status: 'loading' | 'ready' | 'error'
  onOpen: () => void
}) {
  return <section aria-label="Anime overview" className="dashboard-card p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="section-label">Anime</p><h2 className="mt-1 text-lg font-semibold">Continue and discover</h2></div><span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-wash)] text-[var(--accent-soft)]"><Tv size={19} /></span></div>
    {watching.length > 0 ? <div className="mt-4 space-y-2">{watching.slice(0, 2).map((item) => <button type="button" key={item.externalId} onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-[var(--surface-secondary)] p-3 text-left outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"><Play size={16} className="shrink-0 text-[var(--accent-soft)]" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title}</strong><span className="mt-0.5 block text-xs text-[var(--text-muted)]">Episode {item.currentEpisode}{item.totalEpisodes ? ` of ${item.totalEpisodes}` : ''}</span></span></button>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-secondary)]">Nothing in Continue Watching yet.</div>}
    <div className="mt-5 border-t border-[var(--border-subtle)] pt-4"><div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]"><Sparkles size={14} />Recently updated</div>{status === 'loading' ? <div role="status" className="mt-3 h-12 animate-pulse rounded-xl bg-[var(--surface-secondary)]" /> : status === 'error' ? <p role="alert" className="mt-3 text-sm text-[var(--text-secondary)]">Anime updates are temporarily unavailable.</p> : recent.length ? <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{recent.slice(0, 3).map((item) => item.title).join(' · ')}</p> : <p className="mt-3 text-sm text-[var(--text-secondary)]">No recent catalogue updates.</p>}</div>
    <div className="mt-4 text-right"><Button type="button" variant="ghost" onClick={onOpen}>Open Anime</Button></div>
  </section>
}
