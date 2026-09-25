import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AnimeRepository } from '../../repositories/animeRepository'
import type { AnimeCatalogueStatus, AnimeSummary } from '../../types/anime'
import { AnimeCard } from './AnimeCard'
import type { AnimePlayerTarget } from './AnimePlayerDialog'

const freshnessWarningMs = 36 * 60 * 60 * 1000

function startOfWeek(reference = new Date()): Date {
  const date = new Date(reference)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  date.setHours(0, 0, 0, 0)
  return date
}

export function AnimeCatalogueStatusCard({ repository }: { repository: AnimeRepository }) {
  const [result, setResult] = useState<{ status: AnimeCatalogueStatus; stale: boolean } | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    void repository.getCatalogueStatus().then((status) => {
      if (active) setResult(status ? { status, stale: Date.now() - status.lastSuccessfulSyncAt > freshnessWarningMs } : null)
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [repository])
  if (failed) return <p className="mt-4 text-xs text-[var(--text-muted)]">Catalogue freshness is temporarily unavailable.</p>
  if (result === undefined) return <div aria-label="Loading catalogue status" className="mt-4 h-12 animate-pulse rounded-xl bg-[var(--surface-primary)]" />
  if (result === null) return <p className="mt-4 text-xs text-[var(--text-muted)]">Catalogue status will appear after the next successful incremental sync.</p>
  const { status, stale } = result
  return <aside className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-3 text-xs text-[var(--text-secondary)]" aria-label="Anime catalogue status">
    <span><strong className="text-[var(--text-primary)]">Catalogue:</strong> {status.catalogueCount.toLocaleString()} titles</span>
    <span><strong className="text-[var(--text-primary)]">Last sync:</strong> {new Date(status.lastSuccessfulSyncAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
    <span className={stale ? 'text-[var(--warning)]' : 'text-[var(--success)]'}>{stale ? <AlertTriangle className="mr-1 inline" size={14} /> : <CheckCircle2 className="mr-1 inline" size={14} />}{stale ? 'Update delayed' : 'Up to date'}</span>
  </aside>
}

export function AnimeDiscoverySections({ repository, onOpen }: { repository: AnimeRepository; onOpen: (item: AnimePlayerTarget) => void }) {
  const [newItems, setNewItems] = useState<AnimeSummary[]>([])
  const [recentItems, setRecentItems] = useState<AnimeSummary[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  useEffect(() => {
    let active = true
    void Promise.all([repository.fetchPublishedSince(startOfWeek(), 6), repository.fetchRecent(6)])
      .then(([published, recent]) => { if (active) { setNewItems(published); setRecentItems(recent); setState('ready') } })
      .catch(() => { if (active) setState('error') })
    return () => { active = false }
  }, [repository])
  if (state === 'loading') return <div aria-label="Loading Anime updates" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-primary)]" />)}</div>
  if (state === 'error') return <div role="alert" className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-sm text-[var(--text-secondary)]"><RefreshCw className="mr-2 inline" size={15} />Anime updates are temporarily unavailable.</div>
  return <div className="mt-8 grid gap-8 xl:grid-cols-2">
    <DiscoverySection title="New this week" empty="No newly published titles this week yet." items={newItems} onOpen={onOpen} />
    <DiscoverySection title="Recently updated" empty="No recent catalogue updates." items={recentItems} onOpen={onOpen} />
  </div>
}

function DiscoverySection({ title, empty, items, onOpen }: { title: string; empty: string; items: AnimeSummary[]; onOpen: (item: AnimePlayerTarget) => void }) {
  return <section aria-label={title}><h2 className="section-label">{title}</h2>{items.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{items.slice(0, 6).map((anime) => <AnimeCard key={anime.externalId} anime={anime} onOpen={onOpen} />)}</div> : <p className="mt-3 rounded-2xl border border-dashed border-[var(--border-subtle)] p-5 text-sm text-[var(--text-muted)]">{empty}</p>}</section>
}
