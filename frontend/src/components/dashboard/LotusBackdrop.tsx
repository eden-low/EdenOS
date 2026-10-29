import { useEffect, useState, type CSSProperties } from 'react'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
const viewportAnchorStyle = { position: 'fixed', inset: 0, width: 'auto', pointerEvents: 'none' } satisfies CSSProperties

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
    <div className="today-lotus-backdrop" style={viewportAnchorStyle} data-animated={animated ? 'true' : 'false'} data-viewport-anchored="true" aria-hidden="true">
      <div className="today-lotus-aurora" />
      <svg className="today-lotus-art" viewBox="0 0 960 760" preserveAspectRatio="xMidYMid meet" focusable="false" role="presentation">
        <defs>
          <linearGradient id="eden-lotus-ivory" x1="0.18" y1="0" x2="0.82" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.94" /><stop offset="0.38" stopColor="#f1eff8" stopOpacity="0.72" /><stop offset="0.72" stopColor="#c9c0e2" stopOpacity="0.38" /><stop offset="1" stopColor="#776a9b" stopOpacity="0.1" /></linearGradient>
          <linearGradient id="eden-lotus-pearl" x1="0" y1="0.12" x2="1" y2="0.9"><stop offset="0" stopColor="#fffef9" stopOpacity="0.86" /><stop offset="0.44" stopColor="#dcdced" stopOpacity="0.52" /><stop offset="1" stopColor="#8a7cae" stopOpacity="0.12" /></linearGradient>
          <linearGradient id="eden-lotus-violet" x1="0.08" y1="0" x2="0.92" y2="1"><stop offset="0" stopColor="#f7f2ff" stopOpacity="0.78" /><stop offset="0.46" stopColor="#baa6ec" stopOpacity="0.46" /><stop offset="1" stopColor="#67528f" stopOpacity="0.12" /></linearGradient>
          <linearGradient id="eden-lotus-deep-violet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#cfc0f4" stopOpacity="0.54" /><stop offset="0.55" stopColor="#846cae" stopOpacity="0.28" /><stop offset="1" stopColor="#392b58" stopOpacity="0.06" /></linearGradient>
          <linearGradient id="eden-lotus-champagne" x1="0.12" y1="0" x2="0.88" y2="1"><stop offset="0" stopColor="#fffdf5" stopOpacity="0.9" /><stop offset="0.5" stopColor="#e8c998" stopOpacity="0.48" /><stop offset="1" stopColor="#8f6942" stopOpacity="0.1" /></linearGradient>
          <linearGradient id="eden-lotus-edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#b8a5e7" stopOpacity="0.12" /><stop offset="0.5" stopColor="#fff9e9" stopOpacity="0.72" /><stop offset="1" stopColor="#d7b67f" stopOpacity="0.2" /></linearGradient>
          <linearGradient id="eden-lotus-vein" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#c9aff3" stopOpacity="0.06" /><stop offset="0.55" stopColor="#fffdf7" stopOpacity="0.52" /><stop offset="1" stopColor="#ead2aa" stopOpacity="0.1" /></linearGradient>
          <radialGradient id="eden-lotus-core" cx="50%" cy="48%" r="52%"><stop offset="0" stopColor="#ffffff" stopOpacity="0.96" /><stop offset="0.2" stopColor="#fff1d3" stopOpacity="0.76" /><stop offset="0.46" stopColor="#d6c5ff" stopOpacity="0.48" /><stop offset="1" stopColor="#8265bd" stopOpacity="0" /></radialGradient>
          <radialGradient id="eden-lotus-atmosphere" cx="50%" cy="48%" r="52%"><stop offset="0" stopColor="#e9ddff" stopOpacity="0.3" /><stop offset="0.42" stopColor="#aa88df" stopOpacity="0.12" /><stop offset="0.72" stopColor="#c69b62" stopOpacity="0.04" /><stop offset="1" stopColor="#302143" stopOpacity="0" /></radialGradient>
          <filter id="eden-lotus-core-glow" x="-80%" y="-80%" width="260%" height="260%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="11" /></filter>
        </defs>

        <ellipse className="lotus-atmosphere" cx="480" cy="432" rx="390" ry="306" fill="url(#eden-lotus-atmosphere)" />
        <ellipse className="lotus-aura-ring lotus-aura-ring-outer" cx="480" cy="442" rx="326" ry="248" />
        <ellipse className="lotus-aura-ring lotus-aura-ring-inner" cx="480" cy="449" rx="242" ry="184" />

        <g className="lotus-bloom">
          <g className="lotus-petal-tier lotus-tier-shadow">
            <path className="lotus-petal" d="M480 512C402 404 416 215 480 84C544 215 558 404 480 512Z" fill="url(#eden-lotus-deep-violet)" />
            <path className="lotus-petal" d="M436 520C312 449 266 278 322 154C413 245 458 391 436 520Z" fill="url(#eden-lotus-deep-violet)" />
            <path className="lotus-petal" d="M524 520C648 449 694 278 638 154C547 245 502 391 524 520Z" fill="url(#eden-lotus-deep-violet)" />
            <path className="lotus-petal" d="M396 536C266 505 168 382 181 244C299 289 389 397 396 536Z" fill="url(#eden-lotus-deep-violet)" />
            <path className="lotus-petal" d="M564 536C694 505 792 382 779 244C661 289 571 397 564 536Z" fill="url(#eden-lotus-deep-violet)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-crown">
            <path className="lotus-petal" d="M480 511C439 417 446 247 480 123C514 247 521 417 480 511Z" fill="url(#eden-lotus-ivory)" />
            <path className="lotus-petal" d="M462 519C381 432 361 290 408 184C472 277 488 405 462 519Z" fill="url(#eden-lotus-pearl)" />
            <path className="lotus-petal" d="M498 519C579 432 599 290 552 184C488 277 472 405 498 519Z" fill="url(#eden-lotus-pearl)" />
            <path className="lotus-petal" d="M441 527C337 462 298 337 329 232C420 305 461 420 441 527Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal" d="M519 527C623 462 662 337 631 232C540 305 499 420 519 527Z" fill="url(#eden-lotus-violet)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-chalice">
            <path className="lotus-petal" d="M470 536C406 477 394 364 430 280C484 357 497 461 470 536Z" fill="url(#eden-lotus-ivory)" />
            <path className="lotus-petal" d="M490 536C554 477 566 364 530 280C476 357 463 461 490 536Z" fill="url(#eden-lotus-ivory)" />
            <path className="lotus-petal" d="M450 542C356 508 304 414 316 317C409 359 459 447 450 542Z" fill="url(#eden-lotus-pearl)" />
            <path className="lotus-petal" d="M510 542C604 508 656 414 644 317C551 359 501 447 510 542Z" fill="url(#eden-lotus-pearl)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-open">
            <path className="lotus-petal" d="M421 553C303 536 220 445 214 334C323 349 411 438 421 553Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal" d="M539 553C657 536 740 445 746 334C637 349 549 438 539 553Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal" d="M387 566C264 575 154 510 111 408C228 391 348 452 387 566Z" fill="url(#eden-lotus-pearl)" />
            <path className="lotus-petal" d="M573 566C696 575 806 510 849 408C732 391 612 452 573 566Z" fill="url(#eden-lotus-pearl)" />
            <path className="lotus-petal" d="M355 581C250 616 139 591 70 519C175 477 305 505 355 581Z" fill="url(#eden-lotus-deep-violet)" />
            <path className="lotus-petal" d="M605 581C710 616 821 591 890 519C785 477 655 505 605 581Z" fill="url(#eden-lotus-deep-violet)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-bowl">
            <path className="lotus-petal" d="M480 574C419 541 395 455 430 378C486 426 507 510 480 574Z" fill="url(#eden-lotus-champagne)" />
            <path className="lotus-petal" d="M480 574C541 541 565 455 530 378C474 426 453 510 480 574Z" fill="url(#eden-lotus-champagne)" />
            <path className="lotus-petal" d="M433 581C327 587 236 532 197 448C299 440 404 494 433 581Z" fill="url(#eden-lotus-ivory)" />
            <path className="lotus-petal" d="M527 581C633 587 724 532 763 448C661 440 556 494 527 581Z" fill="url(#eden-lotus-ivory)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-foreground">
            <path className="lotus-petal" d="M480 594C368 628 248 624 144 578C257 548 379 551 480 594Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal" d="M480 594C592 628 712 624 816 578C703 548 581 551 480 594Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal" d="M480 601C395 625 309 629 229 610C305 582 398 579 480 601Z" fill="url(#eden-lotus-champagne)" />
            <path className="lotus-petal" d="M480 601C565 625 651 629 731 610C655 582 562 579 480 601Z" fill="url(#eden-lotus-champagne)" />
          </g>

          <g className="lotus-veins">
            <path d="M480 493C480 380 480 242 480 138" /><path d="M456 505C431 401 420 299 414 207" /><path d="M504 505C529 401 540 299 546 207" />
            <path d="M433 519C393 432 363 343 341 254" /><path d="M527 519C567 432 597 343 619 254" /><path d="M408 540C342 476 282 411 230 350" />
            <path d="M552 540C618 476 678 411 730 350" /><path d="M378 559C291 530 211 490 137 431" /><path d="M582 559C669 530 749 490 823 431" />
            <path d="M438 567C400 525 369 479 342 432" /><path d="M522 567C560 525 591 479 618 432" /><path d="M468 580C455 529 449 478 450 425" />
            <path d="M492 580C505 529 511 478 510 425" /><path d="M480 597C480 559 480 520 480 481" />
          </g>

          <g className="lotus-core-light" filter="url(#eden-lotus-core-glow)"><ellipse cx="480" cy="535" rx="74" ry="58" fill="url(#eden-lotus-core)" /></g>
          <g className="lotus-heart">
            <ellipse cx="480" cy="537" rx="54" ry="40" fill="url(#eden-lotus-core)" />
            <circle cx="480" cy="518" r="4.2" /><circle cx="460" cy="528" r="3.2" /><circle cx="500" cy="528" r="3.2" /><circle cx="448" cy="545" r="2.6" />
            <circle cx="512" cy="545" r="2.6" /><circle cx="468" cy="550" r="2.4" /><circle cx="492" cy="550" r="2.4" />
          </g>
        </g>

        <g className="lotus-particles">
          <circle className="lotus-particle lotus-particle-1" cx="151" cy="258" r="2.2" /><circle className="lotus-particle lotus-particle-2" cx="220" cy="168" r="3" />
          <circle className="lotus-particle lotus-particle-3" cx="326" cy="110" r="1.8" /><circle className="lotus-particle lotus-particle-4" cx="406" cy="67" r="2.5" />
          <circle className="lotus-particle lotus-particle-5" cx="552" cy="73" r="1.8" /><circle className="lotus-particle lotus-particle-6" cx="651" cy="119" r="2.8" />
          <circle className="lotus-particle lotus-particle-7" cx="756" cy="190" r="1.9" /><circle className="lotus-particle lotus-particle-8" cx="819" cy="289" r="2.4" />
          <circle className="lotus-particle lotus-particle-9" cx="106" cy="394" r="1.7" /><circle className="lotus-particle lotus-particle-10" cx="858" cy="414" r="2.8" />
          <circle className="lotus-particle lotus-particle-11" cx="191" cy="617" r="2" /><circle className="lotus-particle lotus-particle-12" cx="317" cy="677" r="2.7" />
          <circle className="lotus-particle lotus-particle-13" cx="650" cy="669" r="1.8" /><circle className="lotus-particle lotus-particle-14" cx="774" cy="603" r="2.3" />
        </g>
      </svg>
    </div>
  )
}
