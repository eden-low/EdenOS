import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnimeVideoPlayer } from './AnimeVideoPlayer'

const hls = vi.hoisted(() => ({ loadSource: vi.fn(), attachMedia: vi.fn(), destroy: vi.fn(), on: vi.fn(), startLoad: vi.fn(), recoverMediaError: vi.fn(), supported: true }))
vi.mock('hls.js', () => {
  class MockHls {
    static isSupported() { return hls.supported }
    static Events = { ERROR: 'error' }
    static ErrorTypes = { NETWORK_ERROR: 'networkError', MEDIA_ERROR: 'mediaError' }
    loadSource = hls.loadSource
    attachMedia = hls.attachMedia
    destroy = hls.destroy
    on = hls.on
    startLoad = hls.startLoad
    recoverMediaError = hls.recoverMediaError
  }
  return { default: MockHls }
})

const baseProps = { resumeAt: 0, onProgress: vi.fn(), onPause: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn(), onReady: vi.fn(), onSourceFailure: vi.fn() }

describe('AnimeVideoPlayer', () => {
  beforeEach(() => {
    vi.restoreAllMocks(); Object.values(hls).forEach((value) => typeof value === 'function' && value.mockClear())
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    hls.supported = true
  })
  afterEach(() => vi.useRealTimers())

  it('uses native playback for MP4', async () => {
    const { container } = render(<AnimeVideoPlayer {...baseProps} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    await waitFor(() => expect(container.querySelector('video')?.getAttribute('src')).toContain('a.mp4'))
  })

  it('marks startup successful on media-ready events', () => {
    const onReady = vi.fn()
    const { container } = render(<AnimeVideoPlayer {...baseProps} onReady={onReady} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    fireEvent.canPlay(container.querySelector('video')!)
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('fails a source that does not become ready within five seconds', () => {
    vi.useFakeTimers()
    const onSourceFailure = vi.fn()
    render(<AnimeVideoPlayer {...baseProps} onSourceFailure={onSourceFailure} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    vi.advanceTimersByTime(4_999)
    expect(onSourceFailure).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onSourceFailure).toHaveBeenCalledWith('startup-timeout')
  })

  it('reports native media failure once', () => {
    const onSourceFailure = vi.fn()
    const { container } = render(<AnimeVideoPlayer {...baseProps} onSourceFailure={onSourceFailure} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    fireEvent.error(container.querySelector('video')!)
    fireEvent.error(container.querySelector('video')!)
    expect(onSourceFailure).toHaveBeenCalledOnce()
    expect(onSourceFailure).toHaveBeenCalledWith('media-error')
  })

  it('ignores media errors caused while the source is being cleaned up', () => {
    const onSourceFailure = vi.fn()
    const { unmount } = render(<AnimeVideoPlayer {...baseProps} onSourceFailure={onSourceFailure} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    const load = vi.mocked(HTMLMediaElement.prototype.load)
    load.mockImplementation(function (this: HTMLMediaElement) { this.dispatchEvent(new Event('error')) })
    load.mockClear()
    unmount()
    expect(load).toHaveBeenCalled()
    expect(onSourceFailure).not.toHaveBeenCalled()
  })

  it('uses one hls.js recovery before reporting a repeated fatal error', async () => {
    const onSourceFailure = vi.fn()
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('')
    render(<AnimeVideoPlayer {...baseProps} onSourceFailure={onSourceFailure} source={{ label: 'HLS', url: 'https://media.example/a.m3u8', format: 'hls' }} />)
    await waitFor(() => expect(hls.on).toHaveBeenCalled())
    const handler = hls.on.mock.calls[0][1]
    handler('error', { fatal: true, type: 'networkError' })
    expect(hls.startLoad).toHaveBeenCalledOnce()
    expect(onSourceFailure).not.toHaveBeenCalled()
    handler('error', { fatal: true, type: 'networkError' })
    expect(onSourceFailure).toHaveBeenCalledWith('hls-fatal')
  })

  it('prefers native HLS when the browser supports it', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably')
    const { container } = render(<AnimeVideoPlayer {...baseProps} source={{ label: 'HLS', url: 'https://media.example/a.m3u8', format: 'hls' }} />)
    await waitFor(() => expect(container.querySelector('video')?.src).toContain('a.m3u8'))
    expect(hls.loadSource).not.toHaveBeenCalled()
  })

  it('dynamically uses hls.js when native HLS is unavailable', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('')
    const { container } = render(<AnimeVideoPlayer {...baseProps} source={{ label: 'HLS', url: 'https://media.example/a.m3u8', format: 'hls' }} />)
    await waitFor(() => expect(hls.loadSource).toHaveBeenCalledWith('https://media.example/a.m3u8'))
    expect(hls.attachMedia).toHaveBeenCalledWith(container.querySelector('video'))
  })

  it('shows unsupported HLS and media failures visibly', async () => {
    hls.supported = false; vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('')
    const { container } = render(<AnimeVideoPlayer {...baseProps} source={{ label: 'HLS', url: 'https://media.example/a.m3u8', format: 'hls' }} />)
    expect((await screen.findByRole('alert')).textContent).toContain('not supported')
    fireEvent.error(container.querySelector('video')!)
    expect(screen.getByRole('alert').textContent).toContain('not supported')
    hls.supported = true
  })

  it('supports episode and playback keyboard shortcuts without hijacking inputs', () => {
    const onPrevious = vi.fn(); const onNext = vi.fn()
    const { container } = render(<AnimeVideoPlayer {...baseProps} onPrevious={onPrevious} onNext={onNext} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    fireEvent.keyDown(window, { key: '[' }); fireEvent.keyDown(window, { key: ']' })
    expect(onPrevious).toHaveBeenCalledOnce(); expect(onNext).toHaveBeenCalledOnce()
    const input = document.createElement('input'); container.append(input); input.focus(); fireEvent.keyDown(input, { key: ']' })
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('supports seek, volume, fullscreen, and restores position after metadata', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    const { container } = render(<AnimeVideoPlayer {...baseProps} resumeAt={120} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    const video = container.querySelector('video')!
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 })
    Object.defineProperty(video, 'requestFullscreen', { configurable: true, value: requestFullscreen })
    video.currentTime = 20; video.volume = 0.5
    fireEvent.loadedMetadata(video)
    expect(video.currentTime).toBe(99.75)
    fireEvent.keyDown(window, { key: 'ArrowLeft' }); expect(video.currentTime).toBe(89.75)
    fireEvent.keyDown(window, { key: 'ArrowRight' }); expect(video.currentTime).toBe(99.75)
    fireEvent.keyDown(window, { key: 'ArrowDown' }); expect(video.volume).toBeCloseTo(0.4)
    fireEvent.keyDown(window, { key: 'ArrowUp' }); expect(video.volume).toBeCloseTo(0.5)
    fireEvent.keyDown(window, { key: 'f' }); expect(requestFullscreen).toHaveBeenCalledOnce()
  })
})
