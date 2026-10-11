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
  afterEach(() => { vi.useRealTimers(); Reflect.deleteProperty(document, 'fullscreenElement'); Reflect.deleteProperty(document, 'exitFullscreen') })

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
    ;(container.querySelector('[aria-label="Anime video player"]') as HTMLElement).focus()
    fireEvent.keyDown(window, { key: '[' }); fireEvent.keyDown(window, { key: ']' })
    expect(onPrevious).toHaveBeenCalledOnce(); expect(onNext).toHaveBeenCalledOnce()
    const input = document.createElement('input'); container.append(input); input.focus(); fireEvent.keyDown(input, { key: ']' })
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('seeks five seconds, clamps boundaries, and keeps progress callbacks on media events', () => {
    const onProgress = vi.fn()
    const { container } = render(<AnimeVideoPlayer {...baseProps} onProgress={onProgress} resumeAt={120} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    const video = container.querySelector('video')!
    const player = container.querySelector('[aria-label="Anime video player"]') as HTMLElement
    player.focus()
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 })
    video.currentTime = 20
    fireEvent.loadedMetadata(video)
    expect(video.currentTime).toBe(99.75)
    fireEvent.keyDown(video, { key: 'ArrowLeft' }); expect(video.currentTime).toBe(94.75)
    fireEvent.keyUp(video, { key: 'ArrowLeft' })
    fireEvent.keyDown(video, { key: 'ArrowRight' }); expect(video.currentTime).toBe(99.75)
    fireEvent.keyUp(video, { key: 'ArrowRight' })
    video.currentTime = 2
    fireEvent.keyDown(video, { key: 'ArrowLeft' }); expect(video.currentTime).toBe(0)
    fireEvent.keyUp(video, { key: 'ArrowLeft' })
    video.currentTime = 98
    fireEvent.keyDown(video, { key: 'ArrowRight' }); expect(video.currentTime).toBe(100)
    fireEvent.keyUp(video, { key: 'ArrowRight' })
    expect(onProgress).not.toHaveBeenCalled()
    fireEvent.timeUpdate(video)
    expect(onProgress).toHaveBeenCalledOnce()
    expect(onProgress).toHaveBeenCalledWith(100, 100)
  })

  it('owns Space keydown and keyup before native controls and toggles only once per press', () => {
    const source = { label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' as const }
    const { container, rerender } = render(<AnimeVideoPlayer {...baseProps} source={source} />)
    const video = container.querySelector('video')!
    let paused = false
    Object.defineProperty(video, 'paused', { configurable: true, get: () => paused })
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => { paused = true })
    const play = vi.spyOn(video, 'play').mockImplementation(() => { paused = false; return Promise.resolve() })
    const nativeDown = vi.fn(); const nativeUp = vi.fn()
    video.addEventListener('keydown', nativeDown); video.addEventListener('keyup', nativeUp)
    ;(container.querySelector('[aria-label="Anime video player"]') as HTMLElement).focus()

    fireEvent.keyDown(video, { key: ' ' })
    expect(pause).toHaveBeenCalledOnce(); expect(paused).toBe(true)
    rerender(<AnimeVideoPlayer {...baseProps} onNext={vi.fn()} source={source} />)
    fireEvent.keyDown(video, { key: ' ', repeat: true })
    fireEvent.keyDown(video, { key: ' ' })
    expect(pause).toHaveBeenCalledOnce(); expect(play).not.toHaveBeenCalled()
    fireEvent.keyUp(video, { key: ' ' })
    expect(paused).toBe(true)
    fireEvent.keyDown(video, { key: ' ' })
    expect(play).toHaveBeenCalledOnce(); expect(paused).toBe(false)
    fireEvent.keyUp(video, { key: ' ' })
    expect(paused).toBe(false)
    expect(nativeDown).not.toHaveBeenCalled(); expect(nativeUp).not.toHaveBeenCalled()
  })

  it('owns arrow keys before native controls and ignores held keydowns and keyup', () => {
    const { container } = render(<AnimeVideoPlayer {...baseProps} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    const video = container.querySelector('video')!
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 })
    video.currentTime = 50
    ;(container.querySelector('[aria-label="Anime video player"]') as HTMLElement).focus()
    const nativeDown = vi.fn(); const nativeUp = vi.fn()
    video.addEventListener('keydown', nativeDown); video.addEventListener('keyup', nativeUp)
    fireEvent.keyDown(video, { key: 'ArrowLeft' }); expect(video.currentTime).toBe(45)
    fireEvent.keyDown(video, { key: 'ArrowLeft', repeat: true })
    fireEvent.keyDown(video, { key: 'ArrowLeft' }); expect(video.currentTime).toBe(45)
    fireEvent.keyUp(video, { key: 'ArrowLeft' }); expect(video.currentTime).toBe(45)
    fireEvent.keyDown(video, { key: 'ArrowRight' }); expect(video.currentTime).toBe(50)
    fireEvent.keyUp(video, { key: 'ArrowRight' }); expect(video.currentTime).toBe(50)
    expect(nativeDown).not.toHaveBeenCalled(); expect(nativeUp).not.toHaveBeenCalled()
  })

  it('toggles playback and fullscreen and restores player focus after Escape exits fullscreen', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    const exitFullscreen = vi.fn().mockResolvedValue(undefined)
    let fullscreenElement: Element | null = null
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement })
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen })
    const onPause = vi.fn()
    const { container } = render(<AnimeVideoPlayer {...baseProps} onPause={onPause} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    const video = container.querySelector('video')!
    const player = container.querySelector('[aria-label="Anime video player"]') as HTMLElement
    player.focus()
    Object.defineProperty(video, 'requestFullscreen', { configurable: true, value: requestFullscreen })
    fireEvent.keyDown(window, { key: ' ' }); expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
    fireEvent.keyUp(window, { key: ' ' })
    Object.defineProperty(video, 'paused', { configurable: true, value: false })
    fireEvent.keyDown(window, { key: ' ' }); expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    fireEvent.keyUp(window, { key: ' ' })
    fireEvent.pause(video); expect(onPause).toHaveBeenCalledOnce()
    video.volume = 0.5
    fireEvent.keyDown(window, { key: 'ArrowDown' }); expect(video.volume).toBeCloseTo(0.4)
    fireEvent.keyDown(window, { key: 'ArrowUp' }); expect(video.volume).toBeCloseTo(0.5)
    fireEvent.keyDown(window, { key: 'f' }); expect(requestFullscreen).toHaveBeenCalledOnce()
    fireEvent.keyUp(window, { key: 'f' })
    fullscreenElement = video; fireEvent(document, new Event('fullscreenchange'))
    fireEvent.keyDown(window, { key: 'f' }); expect(exitFullscreen).toHaveBeenCalledOnce()
    fireEvent.keyUp(window, { key: 'f' })
    fireEvent.keyDown(window, { key: 'Escape' }); expect(exitFullscreen).toHaveBeenCalledOnce()
    fullscreenElement = null; fireEvent(document, new Event('fullscreenchange'))
    expect(document.activeElement).toBe(player)
  })

  it('does not hijack keys outside the player, while typing, or after unmount', () => {
    const onPrevious = vi.fn()
    const { container, unmount, rerender } = render(<AnimeVideoPlayer {...baseProps} onPrevious={onPrevious} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    const video = container.querySelector('video')!
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 })
    video.currentTime = 20
    fireEvent.keyDown(window, { key: 'ArrowRight' }); expect(video.currentTime).toBe(20)
    const player = container.querySelector('[aria-label="Anime video player"]') as HTMLElement
    player.focus()
    const input = document.createElement('input'); player.append(input); input.focus()
    fireEvent.keyDown(input, { key: 'ArrowRight' }); expect(video.currentTime).toBe(20)
    const button = document.createElement('button'); player.append(button); button.focus()
    fireEvent.keyDown(button, { key: ' ' }); expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
    const editable = document.createElement('div'); editable.setAttribute('contenteditable', 'true'); player.append(editable); editable.focus()
    fireEvent.keyDown(editable, { key: 'ArrowRight' }); expect(video.currentTime).toBe(20)
    player.focus(); fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true }); expect(video.currentTime).toBe(20)
    rerender(<AnimeVideoPlayer {...baseProps} onPrevious={onPrevious} source={{ label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' }} />)
    fireEvent.keyDown(window, { key: '[' }); expect(onPrevious).toHaveBeenCalledOnce()
    unmount()
    fireEvent.keyDown(window, { key: '[' }); expect(onPrevious).toHaveBeenCalledOnce()
  })

  it('does not retain duplicate keyboard listeners after remount', () => {
    const source = { label: 'MP4', url: 'https://media.example/a.mp4', format: 'mp4' as const }
    const first = render(<AnimeVideoPlayer {...baseProps} source={source} />)
    first.unmount()
    const second = render(<AnimeVideoPlayer {...baseProps} source={source} />)
    const video = second.container.querySelector('video')!
    Object.defineProperty(video, 'duration', { configurable: true, value: 100 })
    video.currentTime = 20
    ;(second.container.querySelector('[aria-label="Anime video player"]') as HTMLElement).focus()
    fireEvent.keyDown(video, { key: 'ArrowRight' })
    expect(video.currentTime).toBe(25)
  })
})
