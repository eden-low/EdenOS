import { ArrowDown, Sparkles } from 'lucide-react'
import { aboutContent } from './aboutContent'
import hero from './assets/eden-about-hero.webp'

export function AboutHero() {
  return <header className="about-hero about-glass">
    <div className="about-hero-copy">
      <p className="about-eyebrow"><Sparkles aria-hidden="true" size={15} />{aboutContent.eyebrow}</p>
      <h1 lang="en">{aboutContent.title}</h1>
      <p className="about-subtitle">{aboutContent.subtitle}</p>
      <p className="about-introduction">{aboutContent.introduction}</p>
      <a id="about-meet-eden-link" className="about-jump" href="#interactive-eden">{aboutContent.jumpLabel}<ArrowDown aria-hidden="true" size={17} /></a>
    </div>
    <figure className="about-hero-figure">
      <span aria-hidden="true" className="about-orbit about-orbit-one" />
      <span aria-hidden="true" className="about-orbit about-orbit-two" />
      <img src={hero} alt={aboutContent.heroAlt} width="256" height="512" fetchPriority="high" />
      <figcaption>{aboutContent.heroCaption}</figcaption>
    </figure>
  </header>
}
