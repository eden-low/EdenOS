import { useEffect, useRef, useState } from 'react'
import type { AnimeEpisodeSource } from '../../types/anime'
import { useAnimeText } from '../../services/animeI18n'
import { animePlayerShortcuts } from '../../domain/animePlayerShortcuts'
import { animeSourceStartupTimeoutMs } from '../../domain/anime'

export type AnimeSourceFailureReason = 'startup-timeout' | 'media-error' | 'hls-fatal' | 'unsupported'

export function AnimeVideoPlayer({ source, resumeAt, onProgress, onPause, onPrevious, onNext, onReady, onSourceFailure }: {
  source: AnimeEpisodeSource
  resumeAt: number
  onProgress: (position: number, duration: number) => void
  onPause: (position: number, duration: number) => void
  onPrevious: () => void
  onNext: () => void
  onReady: () => void
  onSourceFailure: (reason: AnimeSourceFailureReason) => void
}) {
  const t = useAnimeText()
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)
  const focusBeforeFullscreenRef = useRef<HTMLElement | null>(null)
  const playerFullscreenRef = useRef(false)
  const failedRef = useRef(false)
  const activeRef = useRef(false)
  const callbacksRef = useRef({ onReady, onSourceFailure })
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { callbacksRef.current = { onReady, onSourceFailure } }, [onReady, onSourceFailure])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    activeRef.current = true
    let cancelled = false
    let destroy: (() => void) | undefined
    let recoveredFatalError = false
    let ready = false
    failedRef.current = false
    setError(null)
    video.removeAttribute('src')
    video.load()

    function fail(reason: AnimeSourceFailureReason, message: string) {
      if (cancelled || failedRef.current) return
      failedRef.current = true
      setError(message)
      callbacksRef.current.onSourceFailure(reason)
    }
    const startupTimer = setTimeout(() => {
      if (!ready) fail('startup-timeout', t('sourceFailover'))
    }, animeSourceStartupTimeoutMs)
    function markReady() {
      if (ready || cancelled) return
      ready = true
      clearTimeout(startupTimer)
      callbacksRef.current.onReady()
    }
    async function attach() {
      if (source.format === 'mp4' || video!.canPlayType('application/vnd.apple.mpegurl')) {
        video!.src = source.url
        return
      }
      try {
        const { default: Hls } = await import('hls.js')
        if (cancelled) return
        if (!Hls.isSupported()) { fail('unsupported', t('hlsUnsupported')); return }
        const hls = new Hls()
        destroy = () => hls.destroy()
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return
          if (!recoveredFatalError && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            recoveredFatalError = true
            hls.startLoad()
            return
          }
          if (!recoveredFatalError && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            recoveredFatalError = true
            hls.recoverMediaError()
            return
          }
          fail('hls-fatal', t('hlsFailed'))
        })
        hls.loadSource(source.url)
        hls.attachMedia(video!)
      } catch { fail('unsupported', t('hlsLoadFailed')) }
    }
    video.addEventListener('loadedmetadata', markReady)
    video.addEventListener('canplay', markReady)
    video.addEventListener('playing', markReady)
    void attach()
    return () => {
      activeRef.current = false
      cancelled = true
      clearTimeout(startupTimer)
      video.removeEventListener('loadedmetadata', markReady)
      video.removeEventListener('canplay', markReady)
      video.removeEventListener('playing', markReady)
      destroy?.()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [source, t])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (target instanceof Element && (target.closest('input, textarea, select, [contenteditable], [role="dialog"]:not(.anime-player-dialog)') || (target instanceof HTMLElement && target.isContentEditable))) return
      const video = videoRef.current
      const player = playerRef.current
      if (!video || !player || !(player.contains(document.activeElement) || document.fullscreenElement === video)) return
      if (animePlayerShortcuts.toggle.includes(event.key as ' ' & 'k')) {
        if (event.repeat) return
        event.preventDefault()
        if (video.paused) void video.play()
        else video.pause()
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const range = video.seekable
        const start = range.length ? range.start(0) : 0
        const end = range.length ? range.end(range.length - 1) : video.duration
        if (Number.isFinite(video.currentTime) && Number.isFinite(end)) {
          event.preventDefault()
          video.currentTime = Math.min(end, Math.max(start, video.currentTime + (event.key === 'ArrowLeft' ? -5 : 5)))
        }
      }
      if (event.key === 'ArrowDown') { event.preventDefault(); video.volume = Math.max(0, video.volume - 0.1) }
      if (event.key === 'ArrowUp') { event.preventDefault(); video.volume = Math.min(1, video.volume + 0.1) }
      if (event.key.toLowerCase() === 'f' && !event.repeat) {
        if (document.fullscreenElement === video) { event.preventDefault(); void document.exitFullscreen?.() }
        else if (!document.fullscreenElement && video.requestFullscreen) {
          event.preventDefault()
          focusBeforeFullscreenRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : player
          void video.requestFullscreen()
        }
      }
      if (event.key === '[') { event.preventDefault(); onPrevious() }
      if (event.key === ']') { event.preventDefault(); onNext() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onNext, onPrevious])

  useEffect(() => {
    function handleFullscreenChange() {
      const video = videoRef.current
      if (video && document.fullscreenElement === video) {
        playerFullscreenRef.current = true
        focusBeforeFullscreenRef.current ??= document.activeElement instanceof HTMLElement ? document.activeElement : playerRef.current
      } else if (playerFullscreenRef.current) {
        playerFullscreenRef.current = false
        const focusTarget = focusBeforeFullscreenRef.current
        focusBeforeFullscreenRef.current = null
        if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true })
        else playerRef.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return <div ref={playerRef} tabIndex={0} aria-label="Anime video player" className="relative aspect-video overflow-hidden rounded-xl bg-black outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)]">
    <video
      ref={videoRef}
      controls
      playsInline
      className="size-full"
      onLoadedMetadata={(event) => {
        const video = event.currentTarget
        if (resumeAt > 0 && Number.isFinite(video.duration)) video.currentTime = Math.min(resumeAt, Math.max(0, video.duration - 0.25))
      }}
      onTimeUpdate={(event) => onProgress(event.currentTarget.currentTime, event.currentTarget.duration || 0)}
      onPause={(event) => onPause(event.currentTarget.currentTime, event.currentTarget.duration || 0)}
      onError={() => {
        if (!activeRef.current || failedRef.current) return
        failedRef.current = true
        setError(t('mediaFailed'))
        callbacksRef.current.onSourceFailure('media-error')
      }}
    />
    {error && <div role="alert" className="absolute inset-x-4 bottom-16 rounded-xl bg-black/85 p-3 text-sm text-white">{error}</div>}
  </div>
}
