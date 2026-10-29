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
          <linearGradient id="eden-lotus-ivory" x1="0.12" y1="0" x2="0.82" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.98" /><stop offset="0.3" stopColor="#f8f6ff" stopOpacity="0.82" />
            <stop offset="0.68" stopColor="#cfc8e7" stopOpacity="0.4" /><stop offset="1" stopColor="#6f608f" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="eden-lotus-pearl-left" x1="0" y1="0.12" x2="0.94" y2="0.9">
            <stop offset="0" stopColor="#fffefb" stopOpacity="0.92" /><stop offset="0.42" stopColor="#e9e6f4" stopOpacity="0.6" />
            <stop offset="0.76" stopColor="#b09bcf" stopOpacity="0.28" /><stop offset="1" stopColor="#695282" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="eden-lotus-pearl-right" x1="1" y1="0.08" x2="0.08" y2="0.94">
            <stop offset="0" stopColor="#fffaf0" stopOpacity="0.92" /><stop offset="0.4" stopColor="#ede5f2" stopOpacity="0.58" />
            <stop offset="0.74" stopColor="#b59bc9" stopOpacity="0.26" /><stop offset="1" stopColor="#725276" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="eden-lotus-violet" x1="0.08" y1="0" x2="0.92" y2="1">
            <stop offset="0" stopColor="#faf5ff" stopOpacity="0.82" /><stop offset="0.38" stopColor="#c7b2f1" stopOpacity="0.54" />
            <stop offset="0.72" stopColor="#8569ba" stopOpacity="0.24" /><stop offset="1" stopColor="#493765" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="eden-lotus-indigo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d7caf8" stopOpacity="0.62" /><stop offset="0.48" stopColor="#8771bb" stopOpacity="0.32" />
            <stop offset="1" stopColor="#2d2348" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="eden-lotus-champagne" x1="0.08" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#fffef8" stopOpacity="0.94" /><stop offset="0.42" stopColor="#f0d9ad" stopOpacity="0.58" />
            <stop offset="0.76" stopColor="#c08d55" stopOpacity="0.26" /><stop offset="1" stopColor="#6d4934" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="eden-lotus-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#b9a5f0" stopOpacity="0.16" /><stop offset="0.36" stopColor="#ffffff" stopOpacity="0.78" />
            <stop offset="0.68" stopColor="#fff1ce" stopOpacity="0.72" /><stop offset="1" stopColor="#d1a367" stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id="eden-lotus-vein" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#b99eea" stopOpacity="0.04" /><stop offset="0.42" stopColor="#eee7ff" stopOpacity="0.48" />
            <stop offset="0.78" stopColor="#fffdf7" stopOpacity="0.7" /><stop offset="1" stopColor="#ebc989" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="eden-lotus-trail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a58be6" stopOpacity="0" /><stop offset="0.48" stopColor="#eee8ff" stopOpacity="0.68" />
            <stop offset="0.72" stopColor="#f6dca8" stopOpacity="0.46" /><stop offset="1" stopColor="#f6dca8" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="eden-lotus-core" cx="50%" cy="45%" r="56%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="1" /><stop offset="0.18" stopColor="#fff4d8" stopOpacity="0.88" />
            <stop offset="0.42" stopColor="#dfd3ff" stopOpacity="0.58" /><stop offset="0.72" stopColor="#9f79d2" stopOpacity="0.2" />
            <stop offset="1" stopColor="#6c4c9a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="eden-lotus-atmosphere" cx="50%" cy="48%" r="54%">
            <stop offset="0" stopColor="#f2eaff" stopOpacity="0.34" /><stop offset="0.34" stopColor="#a88bdc" stopOpacity="0.16" />
            <stop offset="0.68" stopColor="#c89b60" stopOpacity="0.05" /><stop offset="1" stopColor="#2c203f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="eden-lotus-moon-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#f6f0ff" stopOpacity="0.3" /><stop offset="0.48" stopColor="#8063c1" stopOpacity="0.1" />
            <stop offset="1" stopColor="#41315d" stopOpacity="0" />
          </radialGradient>
          <filter id="eden-lotus-core-glow" x="-70%" y="-80%" width="240%" height="260%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        <g className="lotus-atmosphere-layer">
          <ellipse className="lotus-atmosphere lotus-atmosphere-wide" cx="480" cy="430" rx="420" ry="328" fill="url(#eden-lotus-atmosphere)" />
          <ellipse className="lotus-atmosphere lotus-atmosphere-core" cx="480" cy="440" rx="252" ry="222" fill="url(#eden-lotus-moon-halo)" />
          <ellipse className="lotus-aura-ring lotus-aura-ring-outer" cx="480" cy="440" rx="360" ry="272" />
          <ellipse className="lotus-aura-ring lotus-aura-ring-mid" cx="480" cy="448" rx="292" ry="220" />
          <ellipse className="lotus-aura-ring lotus-aura-ring-inner" cx="480" cy="452" rx="224" ry="168" />
        </g>

        <g className="lotus-stars lotus-stars-far">
          <circle cx="92" cy="180" r="1.2" /><circle cx="148" cy="294" r="0.9" /><circle cx="198" cy="102" r="1.4" />
          <circle cx="262" cy="214" r="0.8" /><circle cx="311" cy="54" r="1.1" /><circle cx="376" cy="158" r="0.7" />
          <circle cx="431" cy="92" r="1.3" /><circle cx="529" cy="74" r="0.8" /><circle cx="583" cy="142" r="1.2" />
          <circle cx="648" cy="62" r="0.9" /><circle cx="701" cy="190" r="1.4" /><circle cx="770" cy="112" r="0.8" />
          <circle cx="832" cy="236" r="1.1" /><circle cx="872" cy="356" r="0.8" /><circle cx="114" cy="448" r="1.3" />
          <circle cx="844" cy="508" r="1.2" /><circle cx="238" cy="656" r="0.8" /><circle cx="742" cy="662" r="1" />
        </g>
        <g className="lotus-stars lotus-stars-near">
          <circle cx="174" cy="214" r="2.3" /><circle cx="236" cy="338" r="1.7" /><circle cx="294" cy="128" r="2.6" />
          <circle cx="388" cy="62" r="2" /><circle cx="563" cy="94" r="1.8" /><circle cx="666" cy="150" r="2.7" />
          <circle cx="784" cy="278" r="2" /><circle cx="826" cy="416" r="2.5" /><circle cx="156" cy="568" r="1.8" />
          <circle cx="690" cy="622" r="2.2" />
        </g>
        <g className="lotus-trails">
          <path className="lotus-trail lotus-trail-1" d="M112 352C214 272 276 206 360 146" />
          <path className="lotus-trail lotus-trail-2" d="M606 116C706 164 790 248 844 340" />
          <path className="lotus-trail lotus-trail-3" d="M182 612C294 664 382 676 454 662" />
        </g>

        <g className="lotus-bloom">
          <g className="lotus-petal-tier lotus-tier-veil">
            <path className="lotus-petal lotus-petal-center" d="M480 520C394 393 409 188 480 54C553 190 567 394 480 520Z" fill="url(#eden-lotus-indigo)" />
            <path className="lotus-petal lotus-petal-left-a" d="M432 530C292 452 245 252 316 118C414 226 468 394 432 530Z" fill="url(#eden-lotus-indigo)" />
            <path className="lotus-petal lotus-petal-right-b" d="M526 528C668 454 718 264 650 126C548 234 493 394 526 528Z" fill="url(#eden-lotus-indigo)" />
            <path className="lotus-petal lotus-petal-left-b" d="M390 546C245 517 139 372 162 216C292 268 384 397 390 546Z" fill="url(#eden-lotus-indigo)" />
            <path className="lotus-petal lotus-petal-right-a" d="M570 546C715 516 824 382 802 226C671 274 578 401 570 546Z" fill="url(#eden-lotus-indigo)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-shadow">
            <path className="lotus-petal lotus-petal-center" d="M480 520C420 406 425 218 480 88C536 219 542 406 480 520Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal lotus-petal-left-b" d="M443 530C324 450 291 286 350 160C431 260 472 406 443 530Z" fill="url(#eden-lotus-pearl-left)" />
            <path className="lotus-petal lotus-petal-right-a" d="M518 530C638 454 672 294 614 166C530 264 488 406 518 530Z" fill="url(#eden-lotus-pearl-right)" />
            <path className="lotus-petal lotus-petal-left-a" d="M404 544C277 500 197 374 220 240C329 296 403 413 404 544Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal lotus-petal-right-b" d="M557 544C685 504 764 384 744 248C632 301 557 414 557 544Z" fill="url(#eden-lotus-violet)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-crown">
            <path className="lotus-petal lotus-petal-center" d="M480 526C441 418 447 246 480 119C515 248 521 418 480 526Z" fill="url(#eden-lotus-ivory)" />
            <path className="lotus-petal lotus-petal-left-a" d="M462 532C378 435 360 286 409 177C473 278 490 410 462 532Z" fill="url(#eden-lotus-pearl-left)" />
            <path className="lotus-petal lotus-petal-right-b" d="M498 532C582 438 602 294 554 182C489 281 471 410 498 532Z" fill="url(#eden-lotus-pearl-right)" />
            <path className="lotus-petal lotus-petal-left-b" d="M440 539C333 468 297 334 334 226C424 309 463 427 440 539Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal lotus-petal-right-a" d="M520 539C628 472 666 342 632 231C540 312 498 427 520 539Z" fill="url(#eden-lotus-violet)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-chalice">
            <path className="lotus-petal lotus-petal-left-b" d="M470 548C402 483 393 363 432 276C485 359 499 468 470 548Z" fill="url(#eden-lotus-ivory)" />
            <path className="lotus-petal lotus-petal-right-a" d="M490 548C558 486 568 368 530 280C476 361 462 468 490 548Z" fill="url(#eden-lotus-ivory)" />
            <path className="lotus-petal lotus-petal-left-a" d="M450 553C350 514 300 410 319 310C411 361 462 456 450 553Z" fill="url(#eden-lotus-pearl-left)" />
            <path className="lotus-petal lotus-petal-right-b" d="M510 553C611 518 663 418 646 316C552 364 499 456 510 553Z" fill="url(#eden-lotus-pearl-right)" />
            <path className="lotus-petal lotus-petal-left-b" d="M425 560C317 549 239 466 236 366C335 381 420 461 425 560Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal lotus-petal-right-a" d="M535 560C644 552 723 474 724 373C623 385 539 461 535 560Z" fill="url(#eden-lotus-violet)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-open">
            <path className="lotus-petal lotus-petal-left-a" d="M412 565C287 546 199 452 198 340C313 354 405 446 412 565Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal lotus-petal-right-b" d="M548 565C674 550 764 462 764 347C647 358 554 446 548 565Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal lotus-petal-left-b" d="M382 579C250 588 137 516 98 407C220 394 343 460 382 579Z" fill="url(#eden-lotus-pearl-left)" />
            <path className="lotus-petal lotus-petal-right-a" d="M578 579C710 591 825 526 866 416C743 398 618 461 578 579Z" fill="url(#eden-lotus-pearl-right)" />
            <path className="lotus-petal lotus-petal-left-a" d="M348 593C236 630 119 601 48 522C161 480 296 511 348 593Z" fill="url(#eden-lotus-indigo)" />
            <path className="lotus-petal lotus-petal-right-b" d="M612 593C724 632 844 610 916 530C801 483 665 512 612 593Z" fill="url(#eden-lotus-indigo)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-bowl">
            <path className="lotus-petal lotus-petal-left-b" d="M480 586C414 548 393 455 432 372C488 427 508 516 480 586Z" fill="url(#eden-lotus-champagne)" />
            <path className="lotus-petal lotus-petal-right-a" d="M480 586C547 552 569 461 530 376C473 429 452 516 480 586Z" fill="url(#eden-lotus-champagne)" />
            <path className="lotus-petal lotus-petal-left-a" d="M431 592C318 598 221 538 184 447C292 442 403 499 431 592Z" fill="url(#eden-lotus-ivory)" />
            <path className="lotus-petal lotus-petal-right-b" d="M529 592C643 602 742 546 780 455C670 446 557 501 529 592Z" fill="url(#eden-lotus-ivory)" />
          </g>

          <g className="lotus-petal-tier lotus-tier-foreground">
            <path className="lotus-petal lotus-petal-left-b" d="M480 606C360 642 230 636 122 584C244 553 376 558 480 606Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal lotus-petal-right-a" d="M480 606C601 644 732 641 842 590C719 555 584 559 480 606Z" fill="url(#eden-lotus-violet)" />
            <path className="lotus-petal lotus-petal-left-a" d="M480 616C388 642 294 644 207 620C292 588 392 587 480 616Z" fill="url(#eden-lotus-champagne)" />
            <path className="lotus-petal lotus-petal-right-b" d="M480 616C572 644 668 648 755 625C669 590 568 588 480 616Z" fill="url(#eden-lotus-champagne)" />
          </g>

          <g className="lotus-veins">
            <path d="M480 504C480 388 480 238 480 134" /><path d="M456 516C431 408 420 298 414 202" /><path d="M504 516C530 410 541 302 548 207" />
            <path d="M434 532C393 440 363 345 341 250" /><path d="M526 532C568 442 598 350 621 255" /><path d="M407 551C340 482 279 412 225 346" />
            <path d="M553 551C621 484 683 418 737 353" /><path d="M377 571C286 538 204 493 128 429" /><path d="M583 571C675 541 758 500 835 437" />
            <path d="M437 579C398 533 366 483 339 431" /><path d="M523 579C563 535 595 487 623 436" /><path d="M466 592C452 537 447 483 449 426" />
            <path d="M494 592C508 539 514 486 512 429" /><path d="M480 610C480 568 480 527 480 486" /><path d="M404 583C337 569 271 545 208 509" />
            <path d="M556 583C624 571 691 550 756 516" /><path d="M350 588C273 586 198 570 130 538" /><path d="M610 588C688 590 764 578 834 546" />
          </g>

          <g className="lotus-edge-glints">
            <path d="M480 122C464 214 460 310 472 397" /><path d="M410 180C382 278 392 381 437 466" />
            <path d="M554 184C581 282 570 383 523 468" /><path d="M202 344C283 375 350 432 389 508" />
            <path d="M760 350C677 379 609 434 570 510" />
          </g>

          <g className="lotus-core-light" filter="url(#eden-lotus-core-glow)">
            <ellipse cx="480" cy="548" rx="82" ry="64" fill="url(#eden-lotus-core)" />
          </g>
          <g className="lotus-heart">
            <ellipse cx="480" cy="548" rx="58" ry="43" fill="url(#eden-lotus-core)" />
            <g className="lotus-stamens">
              <path d="M480 550L480 514" /><path d="M467 551L458 521" /><path d="M493 551L503 521" />
              <path d="M454 557L440 535" /><path d="M506 557L521 535" /><path d="M473 563L468 537" /><path d="M487 563L492 537" />
              <circle cx="480" cy="512" r="4.4" /><circle cx="457" cy="520" r="3.6" /><circle cx="504" cy="520" r="3.6" />
              <circle cx="438" cy="534" r="3" /><circle cx="523" cy="534" r="3" /><circle cx="467" cy="536" r="2.8" /><circle cx="493" cy="536" r="2.8" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
