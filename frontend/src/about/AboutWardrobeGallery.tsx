import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { AboutWardrobePreview } from './AboutWardrobePreview'
import { wardrobeContent as copy, wardrobeLooks, wardrobeName, wardrobeNumber } from './aboutWardrobeContent'
import './aboutWardrobe.css'

const overlaySelector = '.genesis-boot-screen, [role="dialog"][data-state="open"], [role="alertdialog"]'
function obstructed() { return document.visibilityState === 'hidden' || Boolean(document.querySelector(overlaySelector)) }

export function AboutWardrobeGallery() {
  const [index, setIndex] = useState(0)
  const [blocked, setBlocked] = useState(obstructed)
  const identity = useId()
  const summary = `${identity}-summary`
  const description = `${identity}-description`
  useEffect(() => {
    const check = () => setBlocked(obstructed())
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] })
    document.addEventListener('visibilitychange', check)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', check) }
  }, [])
  function select(next: number | ((current: number) => number)) {
    // Guard synchronously as well as disabling/inerting the background. A real
    // modal must win even before its MutationObserver notification is delivered.
    if (!blocked && !obstructed()) setIndex(next)
  }
  const move = (amount: number) => select(current => (current + amount + wardrobeLooks.length) % wardrobeLooks.length)
  const look = wardrobeLooks[index]
  return <section id={copy.id} tabIndex={-1} className="about-glass about-section about-wardrobe" aria-labelledby="about-wardrobe-heading">
    <p className="about-eyebrow"><Sparkles aria-hidden="true" size={15} />{copy.eyebrow}</p>
    <h2 id="about-wardrobe-heading">{copy.title}</h2><p>{copy.description}</p>
    <fieldset className="about-wardrobe-layout" disabled={blocked} inert={blocked || undefined}>
      <legend className="sr-only">{copy.choices}</legend>
      <div className="about-wardrobe-main">
        <AboutWardrobePreview look={look} blocked={blocked}
          onNext={() => move(1)} describedBy={`${summary} ${description}`} />
        <div className="about-wardrobe-copy">
          <div className="about-wardrobe-copy-size" aria-hidden="true" inert>
            {wardrobeLooks.map(item => <div key={item.id}>
              <div className="about-wardrobe-summary"><p className="about-wardrobe-number">13 / 13</p><h3><span>{item.english}</span><span>{item.name}</span></h3></div>
              <p className="about-wardrobe-description">{item.description}</p>
            </div>)}
          </div>
          <div className="about-wardrobe-copy-current">
            <div id={summary} className="about-wardrobe-summary">
              <p className="about-wardrobe-number">{wardrobeNumber(index)}</p>
              <h3><span lang="en">{look.english}</span><span>{look.name}</span></h3>
            </div>
            <p id={description} className="about-wardrobe-description">{look.description}</p>
          </div>
        </div>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{wardrobeNumber(index)}，{wardrobeName(look)}</p>
      </div>
      <div className="about-wardrobe-picker">
        <div className="about-wardrobe-step">
          <button type="button" onClick={() => move(-1)}><ArrowLeft size={18} aria-hidden="true" />{copy.previous}</button>
          <button type="button" onClick={() => move(1)}>{copy.next}<ArrowRight size={18} aria-hidden="true" /></button>
        </div>
        <div className="about-wardrobe-grid" role="group" aria-label={copy.choices}>
          {wardrobeLooks.map((item, at) => <button type="button" key={item.id} data-wardrobe-choice={item.id}
            aria-label={`${String(at + 1).padStart(2, '0')} ${wardrobeName(item)}`} aria-pressed={at === index} onClick={() => select(at)}>
            <span className="about-wardrobe-card-top"><span>{String(at + 1).padStart(2, '0')}</span>{at === index && <Check size={15} aria-hidden="true" />}</span>
            <span className="about-wardrobe-card-name">{item.name}</span><span className="about-wardrobe-card-english" lang="en">{item.english}</span>
          </button>)}
        </div>
      </div>
    </fieldset>
  </section>
}
