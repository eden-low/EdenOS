import type { TarotReading } from './drawTarotCard'

export function TarotCardVisual({ reading }: { reading: TarotReading | null }) {
  return <div className="cosmos-card" aria-hidden="true">
    <div className="cosmos-card-inner">
      <span className="cosmos-card-corner">✦</span>
      {reading ? <div className="cosmos-card-face">
        <span className="cosmos-card-arcana">{reading.card.arcana === 'major' ? '大阿尔卡那' : '小阿尔卡那'}</span>
        <span className="cosmos-card-sigil">{reading.card.suit === 'cups' ? '☾' : reading.card.suit === 'swords' ? '✧' : reading.card.suit === 'pentacles' ? '◇' : '✦'}</span>
        <strong>{reading.card.name}</strong>
        <span className="cosmos-card-english">{reading.card.englishName}</span>
      </div> : <div className="cosmos-card-back">
        <svg viewBox="0 0 160 160" fill="none" focusable="false">
          <circle cx="80" cy="80" r="61" stroke="currentColor" strokeWidth="1" />
          <circle cx="80" cy="80" r="45" stroke="currentColor" strokeWidth="0.7" />
          <path d="M80 9v142M9 80h142M30 30l100 100M130 30 30 130" stroke="currentColor" strokeWidth="0.6" />
          <path d="M80 41 91 69 119 80 91 91 80 119 69 91 41 80 69 69Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" />
          <circle cx="80" cy="80" r="5" fill="currentColor" />
        </svg>
        <span>COSMOS</span>
      </div>}
      <span className="cosmos-card-corner">✦</span>
    </div>
  </div>
}
