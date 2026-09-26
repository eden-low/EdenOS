import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AnimeRepository } from '../../repositories/animeRepository'
import type { AnimeCatalogueStatus } from '../../types/anime'

const freshnessWarningMs = 36 * 60 * 60 * 1000

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
  if (failed) return <p className="mt-3 text-xs text-[var(--text-muted)]">Catalogue freshness is temporarily unavailable.</p>
  if (result === undefined) return <div aria-label="Loading catalogue status" className="mt-3 h-5 w-56 animate-pulse rounded-full bg-[var(--surface-primary)]" />
  if (result === null) return <p className="mt-3 text-xs text-[var(--text-muted)]">Catalogue status will appear after the next successful incremental sync.</p>
  const { status, stale } = result
  return <aside className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]" aria-label="Anime catalogue status">
    <span>Catalogue {status.catalogueCount.toLocaleString()}</span><span aria-hidden="true">·</span>
    <span>Updated {formatSyncTime(status.lastSuccessfulSyncAt)}</span><span aria-hidden="true">·</span>
    <span className={stale ? 'text-[var(--warning)]' : 'text-[var(--success)]'}>{stale ? <AlertTriangle className="mr-1 inline" size={14} /> : <CheckCircle2 className="mr-1 inline" size={14} />}{stale ? 'Update delayed' : 'Up to date'}</span>
  </aside>
}

function formatSyncTime(value: number): string {
  const date = new Date(value)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  return isToday ? `today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : date.toLocaleDateString([], { dateStyle: 'medium' })
}
