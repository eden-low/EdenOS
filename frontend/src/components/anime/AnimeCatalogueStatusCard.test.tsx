import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AnimeRepository } from '../../repositories/animeRepository'
import { AnimeCatalogueStatusCard } from './AnimeDiscoverySections'

function repository(status: { catalogueCount: number; lastSuccessfulSyncAt: number } | null): AnimeRepository {
  return {
    fetchPage: vi.fn(), searchTitles: vi.fn(), fetchRecent: vi.fn(), countUpdatedSince: vi.fn(),
    fetchPublishedSince: vi.fn(), countPublishedSince: vi.fn(), getCatalogueStatus: vi.fn().mockResolvedValue(status),
  }
}

describe('AnimeCatalogueStatusCard', () => {
  it('renders sanitized product-level freshness in a subtle status line', async () => {
    render(<AnimeCatalogueStatusCard repository={repository({ catalogueCount: 11_866, lastSuccessfulSyncAt: Date.now() })} />)
    const status = await screen.findByLabelText('Anime catalogue status')
    expect(status.textContent).toContain('Catalogue 11,866')
    expect(status.textContent).toContain('Up to date')
    expect(status.textContent).not.toContain('workflow')
  })

  it('keeps the existing fallback when application status is unavailable', async () => {
    render(<AnimeCatalogueStatusCard repository={repository(null)} />)
    expect(await screen.findByText(/after the next successful incremental sync/)).not.toBeNull()
  })
})
