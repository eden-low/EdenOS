import { BrainCircuit, Code2, Gamepad2, Leaf, PenTool, Waves } from 'lucide-react'
import { useEffect } from 'react'
import { AboutHero } from '../about/AboutHero'
import { AboutInteractiveAvatar } from '../about/AboutInteractiveAvatar'
import { AboutWardrobeGallery } from '../about/AboutWardrobeGallery'
import { wardrobeContent } from '../about/aboutWardrobeContent'
import { aboutContent as copy } from '../about/aboutContent'
import '../about/about.css'

const interestIcons = { development: Code2, ai: BrainCircuit, design: PenTool, swimming: Waves, games: Gamepad2, life: Leaf }
const sections = [copy.who, copy.story, copy.interests, copy.interactive, { id: wardrobeContent.id, title: wardrobeContent.navLabel }]

export function AboutPage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = `${copy.title} · EdenOS`
    const scrollToSection = () => {
      const target = sections.find((section) => `#${section.id}` === window.location.hash)
      if (target) document.getElementById(target.id)?.scrollIntoView({ block: 'start' })
    }
    scrollToSection()
    const events = ['hashchange', 'popstate', 'pageshow']
    events.forEach(event => window.addEventListener(event, scrollToSection))
    return () => { document.title = previousTitle; events.forEach(event => window.removeEventListener(event, scrollToSection)) }
  }, [])
  return <div className="about-page core-page" lang="zh-CN">
    <div className="about-stars" aria-hidden="true" />
    <AboutHero />
    <nav className="about-section-nav" aria-label={copy.sectionNavLabel}>
      {sections.map((section) =>
        <a key={section.id} id={`about-jump-${section.id}`} href={`#${section.id}`}>{section.title}</a>)}
    </nav>
    <div className="about-story-grid">
      <section id={copy.who.id} className="about-glass about-section" aria-labelledby="about-who-heading">
        <p className="about-eyebrow">{copy.who.eyebrow}</p><h2 id="about-who-heading">{copy.who.title}</h2>
        <p className="about-greeting">{copy.who.greeting}</p><p>{copy.who.text}</p>
        <aside className="about-placeholder"><p className="about-placeholder-label">{copy.who.placeholderLabel}</p><p>{copy.who.placeholder}</p></aside>
      </section>
      <section id={copy.story.id} className="about-glass about-section" aria-labelledby="about-story-heading">
        <p className="about-eyebrow">{copy.story.eyebrow}</p><h2 id="about-story-heading">{copy.story.title}</h2>
        {copy.story.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <p className="about-story-closing">{copy.story.closing}</p>
      </section>
    </div>
    <section id={copy.interests.id} className="about-section about-interests" aria-labelledby="about-interests-heading">
      <p className="about-eyebrow">{copy.interests.eyebrow}</p><h2 id="about-interests-heading">{copy.interests.title}</h2><p>{copy.interests.description}</p>
      <ul className="about-interests-grid">{copy.interests.items.map((interest) => {
        const Icon = interestIcons[interest.id]
        return <li key={interest.id} className="about-glass about-interest"><Icon aria-hidden="true" size={22} /><h3>{interest.title}</h3><p>{interest.text}</p></li>
      })}</ul>
    </section>
    <section id={copy.interactive.id} className="about-glass about-section about-interactive" aria-labelledby="about-interactive-heading">
      <p className="about-eyebrow">{copy.interactive.eyebrow}</p><h2 id="about-interactive-heading">{copy.interactive.title}</h2>
      <AboutInteractiveAvatar />
    </section>
    <AboutWardrobeGallery />
    <footer className="about-footer">{copy.footer}</footer>
  </div>
}
