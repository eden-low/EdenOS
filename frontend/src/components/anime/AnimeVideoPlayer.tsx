import { useEffect, useRef, useState } from 'react'
import type { AnimeEpisodeSource } from '../../types/anime'
import { useAnimeText } from '../../services/animeI18n'
import { animePlayerShortcuts } from '../../domain/animePlayerShortcuts'

export function AnimeVideoPlayer({ source, resumeAt, onProgress, onPause, onPrevious, onNext }: {
  source: AnimeEpisodeSource
  resumeAt: number
  onProgress: (position: number, duration: number) => void
  onPause: (position: number, duration: number) => void
  onPrevious: () => void
  onNext: () => void
}) {
  const t = useAnimeText()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let destroy: (() => void) | undefined
    setError(null)
    video.removeAttribute('src')
    video.load()
    async function attach() {
      if (source.format === 'mp4' || video!.canPlayType('application/vnd.apple.mpegurl')) {
        video!.src = source.url
        return
      }
      try {
        const { default: Hls } = await import('hls.js')
        if (cancelled) return
        if (!Hls.isSupported()) { setError(t('hlsUnsupported')); return }
        const hls = new Hls()
        destroy = () => hls.destroy()
        hls.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) setError(t('hlsFailed')) })
        hls.loadSource(source.url)
        hls.attachMedia(video!)
      } catch { setError(t('hlsLoadFailed')) }
    }
    void attach()
    return () => { cancelled = true; destroy?.(); video.pause(); video.removeAttribute('src'); video.load() }
  }, [source, t])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
      const video = videoRef.current
      if (!video) return
      if (animePlayerShortcuts.toggle.includes(event.key as ' ' & 'k')) { event.preventDefault(); void (video.paused ? video.play() : Promise.resolve(video.pause())) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 10) }
      if (event.key === 'ArrowRight') { event.preventDefault(); video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10) }
      if (event.key === 'ArrowDown') { event.preventDefault(); video.volume = Math.max(0, video.volume - 0.1) }
      if (event.key === 'ArrowUp') { event.preventDefault(); video.volume = Math.min(1, video.volume + 0.1) }
      if (event.key.toLocaleLowerCase() === 'f') { event.preventDefault(); void video.requestFullscreen?.() }
      if (event.key === '[') { event.preventDefault(); onPrevious() }
      if (event.key === ']') { event.preventDefault(); onNext() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onNext, onPrevious])

  return <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
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
      onError={() => setError(t('mediaFailed'))}
    />
    {error && <div role="alert" className="absolute inset-x-4 bottom-16 rounded-xl bg-black/85 p-3 text-sm text-white">{error}</div>}
  </div>
}
