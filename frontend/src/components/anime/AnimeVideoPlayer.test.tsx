import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnimeVideoPlayer } from './AnimeVideoPlayer'

const hls = vi.hoisted(() => ({ loadSource: vi.fn(), attachMedia: vi.fn(), destroy: vi.fn(), on: vi.fn(), supported: true }))
vi.mock('hls.js', () => {
  class MockHls {
    static isSupported() { return hls.supported }
    static Events = { ERROR: 'error' }
    loadSource = hls.loadSource
    attachMedia = hls.attachMedia
    destroy = hls.destroy
    on = hls.on
  }
  return { default: MockHls }
})

const baseProps = { resumeAt: 0, onProgress: vi.fn(), onPause: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn() }

describe('AnimeVideoPlayer', () => {
  beforeEach(() => {
    vi.restoreAllMocks(); Object.values(hls).forEach((value) => typeof value === 'function' && value.mockClear())
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  })

  it('uses native playback for MP4', async () => {
    const { container } = render(<AnimeVideoPlayer {...baseProps} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    await waitFor(() => expect(container.querySelector('video')?.getAttribute('src')).toContain('a.mp4'))
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
    expect(screen.getByRole('alert').textContent).toContain('could not be decoded')
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
