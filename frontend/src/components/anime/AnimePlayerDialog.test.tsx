import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { animeDetail } from '../../test/animeFixtures'

const mock = vi.hoisted(() => ({ load: vi.fn(), invalidate: vi.fn(), save: vi.fn(), flush: vi.fn(), items: [] as Array<Record<string, unknown>> }))
vi.mock('../../services/animeDetailService', () => ({
  loadAnimeDetail: mock.load, invalidateAnimeDetail: mock.invalidate,
  AnimeDetailError: class extends Error { code: string; constructor(code: string) { super(code); this.code = code } },
}))
vi.mock('../../state/useAnimeProgress', () => ({ useAnimeProgress: () => ({ items: mock.items, saveProgress: mock.save, flushProgress: mock.flush }) }))
vi.mock('./AnimeVideoPlayer', () => ({ AnimeVideoPlayer: ({ source, resumeAt, onProgress, onPause, onPrevious, onNext, onReady, onSourceFailure }: { source: { label: string }; resumeAt: number; onProgress: (p: number, d: number) => void; onPause: (p: number, d: number) => void; onPrevious: () => void; onNext: () => void; onReady: () => void; onSourceFailure: () => void }) => <div data-testid="video" data-source={source.label} data-resume={resumeAt}><button onClick={() => onProgress(90, 100)}>progress</button><button onClick={() => onProgress(42, 100)}>progress 42</button><button onClick={() => onPause(50, 100)}>pause</button><button onClick={onPrevious}>video previous</button><button onClick={onNext}>video next</button><button onClick={onReady}>source ready</button><button onClick={onSourceFailure}>source failed</button></div> }))

import { AnimePlayerDialog } from './AnimePlayerDialog'

const target = { externalId: 'sample-anime', title: 'Sample Anime', coverUrl: 'https://media.example/cover.jpg', totalEpisodes: 2 }

describe('AnimePlayerDialog', () => {
  beforeEach(() => { mock.load.mockReset(); mock.invalidate.mockReset(); mock.save.mockReset(); mock.flush.mockReset(); mock.items = []; mock.load.mockResolvedValue(animeDetail()) })

  it('does not fetch detail until a title opens and restores the saved position', async () => {
    const { rerender } = render(<AnimePlayerDialog target={null} onClose={vi.fn()} />)
    expect(mock.load).not.toHaveBeenCalled()
    mock.items = [{ externalId: 'sample-anime', currentEpisode: 2, positionSeconds: 42, watchedEpisodes: [1], trackingStatus: 'watching' }]
    rerender(<AnimePlayerDialog target={target} onClose={vi.fn()} />)
    expect(await screen.findByTestId('video')).not.toBeNull()
    expect(screen.getByTestId('video').getAttribute('data-resume')).toBe('42')
    expect(mock.load).toHaveBeenCalledWith('sample-anime')
  })

  it('marks an episode watched at 90 percent without duplicates', async () => {
    mock.items = [{ externalId: 'sample-anime', currentEpisode: 1, positionSeconds: 0, watchedEpisodes: [1], trackingStatus: 'watching' }]
    render(<AnimePlayerDialog target={target} onClose={vi.fn()} />); await screen.findByTestId('video')
    fireEvent.click(screen.getByRole('button', { name: /^progress$/ }))
    expect(mock.save).toHaveBeenLastCalledWith(expect.objectContaining({ watchedEpisodes: [1], trackingStatus: 'watching' }), { immediate: false })
  })

  it('flushes immediately on pause and episode change and supports previous/next', async () => {
    render(<AnimePlayerDialog target={target} onClose={vi.fn()} />); await screen.findByTestId('video')
    fireEvent.click(screen.getByRole('button', { name: 'pause' }))
    expect(mock.save).toHaveBeenLastCalledWith(expect.anything(), { immediate: true })
    fireEvent.click(screen.getAllByRole('button', { name: 'Episode 2' })[0])
    expect(mock.save).toHaveBeenLastCalledWith(expect.objectContaining({ currentEpisode: 1 }), { immediate: true })
    fireEvent.click(screen.getByRole('button', { name: 'video previous' }))
    fireEvent.click(screen.getByRole('button', { name: 'video next' }))
  })

  it('switches legitimate sources while preserving the episode', async () => {
    const detail = animeDetail({ episodes: [{ episodeNumber: 1, sources: [
      { label: 'HLS', url: 'https://media.example/1.m3u8', format: 'hls' },
      { label: 'MP4', url: 'https://media.example/1.mp4', format: 'mp4' },
    ] }] })
    mock.load.mockResolvedValue(detail)
    render(<AnimePlayerDialog target={target} onClose={vi.fn()} />); await screen.findByTestId('video')
    fireEvent.change(screen.getByLabelText('Playback source'), { target: { value: '1' } })
    expect(mock.save).toHaveBeenLastCalledWith(expect.objectContaining({ currentEpisode: 1 }), { immediate: true })
  })

  it('automatically fails over once per source and stops after all fail', async () => {
    const detail = animeDetail({ episodes: [{ episodeNumber: 1, sources: [
      { label: 'Primary', url: 'https://media.example/1.mp4', format: 'mp4' },
      { label: 'Backup', url: 'https://media.example/1.m3u8', format: 'hls' },
    ] }] })
    mock.load.mockResolvedValue(detail)
    render(<AnimePlayerDialog target={target} onClose={vi.fn()} />)
    expect((await screen.findByTestId('video')).getAttribute('data-source')).toBe('Primary')
    fireEvent.click(screen.getByRole('button', { name: 'source failed' }))
    expect(screen.getByTestId('video').getAttribute('data-source')).toBe('Backup')
    expect(mock.save).toHaveBeenLastCalledWith(expect.objectContaining({ currentEpisode: 1, watchedEpisodes: [] }), { immediate: true })
    expect(mock.flush).toHaveBeenCalledWith('sample-anime')
    fireEvent.click(screen.getByRole('button', { name: 'source failed' }))
    expect(screen.getByRole('alert').textContent).toContain('temporarily unavailable')
    expect(screen.getByTestId('video').getAttribute('data-source')).toBe('Backup')
  })

  it('retries all sources and permits manual source selection', async () => {
    const detail = animeDetail({ episodes: [{ episodeNumber: 1, sources: [
      { label: 'Primary', url: 'https://media.example/1.mp4', format: 'mp4' },
      { label: 'Backup', url: 'https://media.example/1.m3u8', format: 'hls' },
    ] }] })
    mock.load.mockResolvedValue(detail)
    render(<AnimePlayerDialog target={target} onClose={vi.fn()} />); await screen.findByTestId('video')
    fireEvent.change(screen.getByLabelText('Playback source'), { target: { value: '1' } })
    expect(screen.getByTestId('video').getAttribute('data-source')).toBe('Backup')
    fireEvent.click(screen.getByRole('button', { name: 'source failed' }))
    fireEvent.click(screen.getByRole('button', { name: 'source failed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retry all' }))
    expect(screen.getByTestId('video').getAttribute('data-source')).toBe('Primary')
  })

  it('preserves playback position while failing over', async () => {
    const detail = animeDetail({ episodes: [{ episodeNumber: 1, sources: [
      { label: 'MP4', url: 'https://media.example/1.mp4', format: 'mp4' },
      { label: 'HLS', url: 'https://media.example/1.m3u8', format: 'hls' },
    ] }] })
    mock.load.mockResolvedValue(detail)
    render(<AnimePlayerDialog target={target} onClose={vi.fn()} />); await screen.findByTestId('video')
    fireEvent.click(screen.getByRole('button', { name: 'progress 42' }))
    fireEvent.click(screen.getByRole('button', { name: 'source failed' }))
    expect(screen.getByTestId('video').getAttribute('data-resume')).toBe('42')
  })

  it('handles a single failed source without looping', async () => {
    render(<AnimePlayerDialog target={target} onClose={vi.fn()} />); await screen.findByTestId('video')
    fireEvent.click(screen.getByRole('button', { name: 'source failed' }))
    expect(screen.getByRole('alert').textContent).toContain('temporarily unavailable')
    expect(screen.getAllByTestId('video')).toHaveLength(1)
  })

  it('fails over between two HLS sources and accepts the second source', async () => {
    const detail = animeDetail({ episodes: [{ episodeNumber: 1, sources: [
      { label: 'HLS A', url: 'https://media.example/a.m3u8', format: 'hls' },
      { label: 'HLS B', url: 'https://media.example/b.m3u8', format: 'hls' },
    ] }] })
    mock.load.mockResolvedValue(detail)
    render(<AnimePlayerDialog target={target} onClose={vi.fn()} />); await screen.findByTestId('video')
    fireEvent.click(screen.getByRole('button', { name: 'source failed' }))
    expect(screen.getByTestId('video').getAttribute('data-source')).toBe('HLS B')
    fireEvent.click(screen.getByRole('button', { name: 'source ready' }))
    expect(screen.queryByText('Source unavailable. Trying another source…')).toBeNull()
  })

  it('offers retry after detail failure', async () => {
    mock.load.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(animeDetail())
    render(<AnimePlayerDialog target={target} onClose={vi.fn()} />)
    expect((await screen.findByRole('alert')).textContent).toContain('could not load')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(mock.load).toHaveBeenCalledTimes(2))
    expect(mock.invalidate).toHaveBeenCalledWith('sample-anime')
  })
})
