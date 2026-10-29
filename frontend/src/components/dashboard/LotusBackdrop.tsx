import { useEffect, useState } from 'react'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

function canAnimateLotus() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false
  const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia(reducedMotionQuery).matches
  return document.visibilityState !== 'hidden' && !reducedMotion
}

/** Decorative Today-only artwork. Motion is CSS-driven and only its paused state reaches React. */
export function LotusBackdrop() {
  const [animated, setAnimated] = useState(canAnimateLotus)

  useEffect(() => {
    const motionPreference = typeof window.matchMedia === 'function' ? window.matchMedia(reducedMotionQuery) : null
    const syncAnimation = () => setAnimated(canAnimateLotus())

    document.addEventListener('visibilitychange', syncAnimation)
    if (motionPreference?.addEventListener) motionPreference.addEventListener('change', syncAnimation)
    else motionPreference?.addListener?.(syncAnimation)
    syncAnimation()

    return () => {
      document.removeEventListener('visibilitychange', syncAnimation)
      if (motionPreference?.removeEventListener) motionPreference.removeEventListener('change', syncAnimation)
      else motionPreference?.removeListener?.(syncAnimation)
    }
  }, [])

  return (
    <div className="today-lotus-backdrop" data-animated={animated ? 'true' : 'false'} aria-hidden="true">
      <div className="today-lotus-aurora" />
      <svg className="today-lotus-art" viewBox="0 0 960 720" focusable="false" role="presentation">
        <defs>
          <linearGradient id="eden-lotus-silver" x1="0" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.82" />
            <stop offset="0.48" stopColor="#dfe2f4" stopOpacity="0.46" />
            <stop offset="1" stopColor="#9b91ca" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="eden-lotus-violet" x1="0" y1="0" x2="1" y2="0.82">
            <stop offset="0" stopColor="#f7f3ff" stopOpacity="0.72" />
            <stop offset="0.55" stopColor="#b9a8ee" stopOpacity="0.34" />
            <stop offset="1" stopColor="#75649f" stopOpacity="0.09" />
          </linearGradient>
          <linearGradient id="eden-lotus-gold" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#fffdf5" stopOpacity="0.72" />
            <stop offset="0.62" stopColor="#dfc08b" stopOpacity="0.3" />
            <stop offset="1" stopColor="#8e6c43" stopOpacity="0.08" />
          </linearGradient>
          <radialGradient id="eden-lotus-heart" cx="50%" cy="46%" r="54%">
            <stop offset="0" stopColor="#fffdf6" stopOpacity="0.88" />
            <stop offset="0.38" stopColor="#d8cbff" stopOpacity="0.42" />
            <stop offset="1" stopColor="#8c72c0" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse className="lotus-halo" cx="480" cy="428" rx="318" ry="245" fill="url(#eden-lotus-heart)" />

        <g className="lotus-bloom">
          <g className="lotus-petal-layer lotus-petal-layer-back">
            <path d="M480 455C423 386 427 240 480 126C533 240 537 386 480 455Z" fill="url(#eden-lotus-silver)" />
            <path d="M461 462C375 409 334 281 367 185C438 244 478 351 461 462Z" fill="url(#eden-lotus-violet)" />
            <path d="M499 462C585 409 626 281 593 185C522 244 482 351 499 462Z" fill="url(#eden-lotus-violet)" />
            <path d="M432 471C333 450 257 350 264 251C357 282 425 363 432 471Z" fill="url(#eden-lotus-silver)" />
            <path d="M528 471C627 450 703 350 696 251C603 282 535 363 528 471Z" fill="url(#eden-lotus-silver)" />
          </g>

          <g className="lotus-petal-layer lotus-petal-layer-middle">
            <path d="M472 478C393 443 345 343 362 256C433 299 478 386 472 478Z" fill="url(#eden-lotus-silver)" />
            <path d="M488 478C567 443 615 343 598 256C527 299 482 386 488 478Z" fill="url(#eden-lotus-silver)" />
            <path d="M444 490C344 486 258 417 239 324C338 329 421 391 444 490Z" fill="url(#eden-lotus-violet)" />
            <path d="M516 490C616 486 702 417 721 324C622 329 539 391 516 490Z" fill="url(#eden-lotus-violet)" />
          </g>

          <g className="lotus-petal-layer lotus-petal-layer-front">
            <path d="M480 501C430 464 417 373 480 295C543 373 530 464 480 501Z" fill="url(#eden-lotus-gold)" />
            <path d="M454 509C361 513 275 468 237 392C334 382 424 426 454 509Z" fill="url(#eden-lotus-silver)" />
            <path d="M506 509C599 513 685 468 723 392C626 382 536 426 506 509Z" fill="url(#eden-lotus-silver)" />
            <path d="M414 525C308 549 204 523 143 459C244 427 357 448 414 525Z" fill="url(#eden-lotus-violet)" />
            <path d="M546 525C652 549 756 523 817 459C716 427 603 448 546 525Z" fill="url(#eden-lotus-violet)" />
            <path d="M480 531C380 558 280 553 196 515C288 493 390 496 480 531Z" fill="url(#eden-lotus-gold)" />
            <path d="M480 531C580 558 680 553 764 515C672 493 570 496 480 531Z" fill="url(#eden-lotus-gold)" />
          </g>

          <ellipse className="lotus-heart" cx="480" cy="455" rx="52" ry="38" fill="url(#eden-lotus-heart)" />
        </g>

        <g className="lotus-particles">
          <circle className="lotus-particle lotus-particle-1" cx="212" cy="244" r="3.2" />
          <circle className="lotus-particle lotus-particle-2" cx="298" cy="155" r="2.1" />
          <circle className="lotus-particle lotus-particle-3" cx="389" cy="105" r="2.6" />
          <circle className="lotus-particle lotus-particle-4" cx="572" cy="91" r="2" />
          <circle className="lotus-particle lotus-particle-5" cx="675" cy="168" r="3.1" />
          <circle className="lotus-particle lotus-particle-6" cx="756" cy="278" r="2.2" />
          <circle className="lotus-particle lotus-particle-7" cx="168" cy="387" r="1.8" />
          <circle className="lotus-particle lotus-particle-8" cx="793" cy="403" r="2.8" />
          <circle className="lotus-particle lotus-particle-9" cx="350" cy="586" r="1.9" />
          <circle className="lotus-particle lotus-particle-10" cx="625" cy="575" r="2.4" />
        </g>
      </svg>
    </div>
  )
}
