import { MAJOR_STAR_GLOSSARY, PALACE_PRESENTATION, TRANSFORMATION_GLOSSARY } from './ziweiData'
import type { ZiWeiPalace } from './ziweiAdapter'

function StarLabel({ name, brightness, transformation }: ZiWeiPalace['majorStars'][number]) {
  return <span className="ziwei-star-label">
    <strong>{name}</strong>
    {brightness && <small>{brightness}</small>}
    {transformation && <i aria-label={`化${transformation}`}>化{transformation}</i>}
  </span>
}

export function ZiWeiPalaceDetail({ palace }: { palace: ZiWeiPalace }) {
  const presentation = PALACE_PRESENTATION[palace.name]
  return <article className="ziwei-palace-detail" aria-live="polite" aria-labelledby="ziwei-palace-detail-heading">
    <header>
      <div>
        <p className="section-label">Selected Palace · 宫位详情</p>
        <h3 id="ziwei-palace-detail-heading">{presentation.label} <small>{presentation.english}</small></h3>
      </div>
      <div className="ziwei-palace-markers">
        {palace.isLifePalace && <span>命宫 · Life</span>}
        {palace.isBodyPalace && <span>身宫 · Body</span>}
      </div>
    </header>
    <p className="ziwei-stem-branch"><span>宫干支</span><strong>{palace.heavenlyStem}{palace.earthlyBranch}</strong></p>
    <p className="cosmos-context text-sm leading-6">{presentation.description}</p>

    <section className="ziwei-detail-section" aria-labelledby="ziwei-major-heading">
      <h4 id="ziwei-major-heading">十四主星</h4>
      {palace.majorStars.length ? <div className="ziwei-detail-stars">
        {palace.majorStars.map((star) => <div key={star.name}><StarLabel {...star} /><p>{MAJOR_STAR_GLOSSARY[star.name as keyof typeof MAJOR_STAR_GLOSSARY]}</p></div>)}
      </div> : <p className="ziwei-empty">本宫无十四主星。空宫仍是十二宫结构的一部分。</p>}
    </section>

    <section className="ziwei-detail-section" aria-labelledby="ziwei-support-heading">
      <h4 id="ziwei-support-heading">重要辅曜与煞曜</h4>
      {palace.supportingStars.length ? <div className="ziwei-supporting-list">{palace.supportingStars.map((star) => <StarLabel key={star.name} {...star} />)}</div> : <p className="ziwei-empty">当前精简层没有列出重要辅曜。</p>}
    </section>

    {palace.transformations.length > 0 && <section className="ziwei-detail-section" aria-labelledby="ziwei-transform-heading">
      <h4 id="ziwei-transform-heading">生年四化</h4>
      <div className="ziwei-transform-detail">{palace.transformations.map((item) => <div key={item.transformation}><strong>{item.star}化{item.transformation}</strong><p>{TRANSFORMATION_GLOSSARY[item.transformation]}</p></div>)}</div>
    </section>}
  </article>
}
