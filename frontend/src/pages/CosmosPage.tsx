import { useState } from 'react'
import { Button } from '../components/ui/button'
import { TarotCardVisual } from '../cosmos/TarotCardVisual'
import { drawTarotCard, type TarotReading } from '../cosmos/drawTarotCard'
import './cosmos.css'

export function CosmosPage() {
  const [reading, setReading] = useState<TarotReading | null>(null)
  const [error, setError] = useState(false)

  function draw() {
    try {
      setReading(drawTarotCard())
      setError(false)
    } catch {
      setError(true)
    }
  }

  return <div className="cosmos-page mx-auto min-h-[calc(100dvh-6rem)] w-full max-w-[92rem] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
    <header className="cosmos-header">
      <p className="section-label">Eden OS · Cosmos</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Cosmos <span className="cosmos-title-zh">星象探索</span></h1>
      <p className="mt-3 max-w-xl text-sm leading-7">从一张塔罗牌开始，借传统象征停下来看看当下的想法。</p>
    </header>

    <section className="cosmos-reading mx-auto mt-7 max-w-4xl rounded-[var(--card-radius)] p-5 sm:mt-9 sm:p-8" aria-labelledby="cosmos-reading-heading">
      <div className="cosmos-reading-copy">
        <p className="section-label">单张塔罗抽牌 · One card reading</p>
        <h2 id="cosmos-reading-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">给此刻一点空间</h2>
        <p className="mt-3 text-sm leading-7">在心里留一个问题，按下抽牌。每次从完整的 78 张牌中随机抽取，并随机呈现正位或逆位。</p>
      </div>

      <div className="cosmos-reading-layout mt-7">
        <TarotCardVisual reading={reading} />
        <div className="cosmos-result" aria-live="polite">
          {reading ? <>
            <p className="section-label">你抽到的牌 · {reading.orientation === 'upright' ? '正位' : '逆位'}</p>
            <h3 className="mt-3 text-3xl font-semibold">{reading.card.name}</h3>
            <p className="cosmos-english mt-1 text-sm">{reading.card.englishName}</p>
            <p className="cosmos-meaning mt-6 text-base leading-8">{reading.card[reading.orientation]}</p>
            <p className="cosmos-context mt-4 text-sm">这张牌的象征可以作为一个提问：它与你眼下的经历有什么关联？</p>
          </> : <>
            <p className="section-label">等待揭晓</p>
            <h3 className="mt-3 text-2xl font-semibold">一张牌，一个观察自己的角度</h3>
            <p className="cosmos-context mt-4 text-sm leading-7">结果只停留在此页。想再看一次时，随时重新抽取。</p>
          </>}
          <Button type="button" className="cosmos-draw mt-7 min-h-12 w-full sm:w-auto" onClick={draw}>{reading ? '再抽一次' : '抽一张牌'}</Button>
          {error && <p role="alert" className="cosmos-error mt-3 text-sm">暂时无法抽牌，请重试。</p>}
        </div>
      </div>
    </section>

    <p className="cosmos-disclaimer mx-auto mt-6 max-w-4xl text-xs leading-6">塔罗仅供文化探索、娱乐与个人反思，不是可靠的预测，也不应代替专业建议。</p>
  </div>
}
