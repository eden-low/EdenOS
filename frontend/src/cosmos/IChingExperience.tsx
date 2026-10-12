import { useMemo, useRef, useState } from 'react'
import { Button } from '../components/ui/button'
import { HexagramDiagram } from './HexagramDiagram'
import { lineValueName, tossThreeCoins, type CoinOutcome, type CoinToss } from './ichingCoins'
import { createIChingReading, createIChingReflection, movingLineLabel, type IChingReading } from './ichingReading'
import { getTrigram, trigrams, type YinYang } from './ichingTrigrams'

export function IChingExperience() {
  const [started, setStarted] = useState(false)
  const [question, setQuestion] = useState('')
  const [tosses, setTosses] = useState<CoinToss[]>([])
  const [error, setError] = useState<string | null>(null)
  const tossCount = useRef(0)
  const reading = useMemo(() => tosses.length === 6 ? createIChingReading(tosses.map((toss) => toss.value)) : null, [tosses])
  const developingLines = Array.from({ length: 6 }, (_, index) => tosses[index] ? (tosses[index].value === 7 || tosses[index].value === 9 ? 1 : 0) : null) as Array<YinYang | null>
  const lastToss = tosses.at(-1)

  function startReading() {
    setStarted(true)
    setError(null)
  }

  function tossCoins() {
    if (tossCount.current >= 6) return
    try {
      const toss = tossThreeCoins()
      tossCount.current += 1
      setTosses((current) => [...current, toss])
      setError(null)
    } catch {
      setError('暂时无法掷铜钱，请重试。')
    }
  }

  function reset() {
    tossCount.current = 0
    setStarted(false)
    setQuestion('')
    setTosses([])
    setError(null)
  }

  return <>
    <section className="cosmos-reading iching-experience mx-auto mt-7 max-w-5xl rounded-[var(--card-radius)] p-5 sm:mt-9 sm:p-8" aria-labelledby="iching-heading">
      <div className="cosmos-reading-copy">
        <p className="section-label">I Ching · Three-Coin Method</p>
        <h2 id="iching-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">六次掷币，由下而上成卦</h2>
        <p className="mt-3 text-sm leading-7">每次独立掷三枚铜钱：正面计 3，背面计 2。初次为最下方的初爻，第六次为最上方的上爻。</p>
      </div>

      {!started ? <div className="iching-intro mt-7">
        <div className="iching-method-note">
          <p className="section-label">开始前 · Introduction</p>
          <p className="mt-3 text-sm leading-7">六与九是动爻，会改变阴阳并形成变卦；七与八保持不变。问题只保留在此页面的组件内存中。</p>
        </div>
        <label className="iching-question mt-5">
          <span>想带着什么问题？（可选）</span>
          <textarea value={question} maxLength={200} rows={3} onChange={(event) => setQuestion(event.target.value)} placeholder="把问题留在这里，不会上传或保存。" />
        </label>
        <Button type="button" className="cosmos-draw mt-6 min-h-12 w-full sm:w-auto" onClick={startReading}>开始起卦 / Start Reading</Button>
      </div> : reading ? <IChingResult reading={reading} question={question} onReset={reset} /> : <div className="iching-casting mt-7">
        <div className="iching-progress" aria-live="polite">
          <span>进度 · Progress</span>
          <strong>{tosses.length} / 6</strong>
          <div><i style={{ width: `${(tosses.length / 6) * 100}%` }} /></div>
        </div>

        <div className="iching-casting-layout mt-6">
          <div>
            <HexagramDiagram lines={developingLines} values={tosses.map((toss) => toss.value)} label={`正在形成的卦象，已完成 ${tosses.length} 爻；图中由上到下显示第六爻至初爻`} />
            <p className="cosmos-context mt-3 text-center text-xs">视觉从上爻到初爻排列；掷币顺序从初爻开始。</p>
          </div>
          <div className="iching-toss-panel" aria-live="polite">
            {lastToss ? <>
              <p className="section-label">第 {tosses.length} 爻 · 最新结果</p>
              <CoinRow coins={lastToss.coins} />
              <p className="iching-toss-value mt-4"><strong>{lastToss.value}</strong> · {lineValueName(lastToss.value)}{lastToss.value === 6 || lastToss.value === 9 ? ' · 动爻' : ''}</p>
            </> : <>
              <p className="section-label">第一爻 · Bottom line</p>
              <h3 className="mt-3 text-xl font-semibold">准备掷出初爻</h3>
              <p className="cosmos-context mt-3 text-sm leading-7">三枚铜钱各自独立，四种爻值自然呈现 1:3:3:1 的传统概率。</p>
            </>}
            <Button type="button" className="cosmos-draw mt-6 min-h-12 w-full sm:w-auto" onClick={tossCoins}>掷铜钱 / Toss Coins</Button>
            {error && <p role="alert" className="cosmos-error mt-4 text-sm">{error}</p>}
          </div>
        </div>

        {tosses.length > 0 && <ol className="iching-toss-history mt-6" aria-label="Coin toss history">
          {tosses.map((toss, index) => <li key={index}><span>{movingLineLabel(index + 1)}</span><CoinRow coins={toss.coins} compact /><strong>{toss.value}</strong></li>)}
        </ol>}
        <button type="button" className="iching-reset-link mt-6" onClick={reset}>重新开始并清除问题 / Reset</button>
      </div>}
    </section>

    <BaguaReference />
    <p className="cosmos-disclaimer mx-auto mt-6 max-w-5xl text-xs leading-6">易经内容供文化探索、娱乐与个人反思。卦象与本地反思提示不构成可靠预测，也不应代替专业建议。</p>
  </>
}

function CoinRow({ coins, compact = false }: { coins: readonly CoinOutcome[]; compact?: boolean }) {
  return <div className={`iching-coins ${compact ? 'is-compact' : 'mt-5'}`} aria-label={coins.map((coin) => coin === 'heads' ? '正面，3' : '背面，2').join('；')}>
    {coins.map((coin, index) => <span key={index} className={coin === 'heads' ? 'is-heads' : 'is-tails'} aria-hidden="true">{coin === 'heads' ? '正' : '背'}<small>{coin === 'heads' ? '3' : '2'}</small></span>)}
  </div>
}

function IChingResult({ reading, question, onReset }: { reading: IChingReading; question: string; onReset: () => void }) {
  const unchanged = reading.movingLines.length === 0
  return <div className="iching-result mt-7" aria-live="polite">
    <p className="section-label">卦象已成 · Reading complete</p>
    {question.trim() && <p className="iching-question-display mt-3">“{question.trim()}”</p>}
    <div className="iching-result-grid mt-6">
      <HexagramResultCard title="本卦 / Primary Hexagram" hexagram={reading.primary} lines={reading.primaryLines} values={reading.lines} upper={reading.upperTrigram.name} lower={reading.lowerTrigram.name} />
      <HexagramResultCard title="变卦 / Relating Hexagram" hexagram={reading.relating} lines={reading.relatingLines} upper={reading.relatingUpperTrigram.name} lower={reading.relatingLowerTrigram.name} unchanged={unchanged} />
    </div>
    <section className="cosmos-combined mt-7" aria-labelledby="iching-reflection-heading">
      <p className="section-label">Local reflection · 本地反思提示</p>
      <h3 id="iching-reflection-heading" className="mt-2 text-xl font-semibold">从本卦看向变化</h3>
      <p className="mt-3 text-sm leading-7">{createIChingReflection(reading)}</p>
      {reading.movingLines.length > 0 && <p className="mt-3 text-sm"><strong>动爻：</strong>{reading.movingLines.map(movingLineLabel).join('、')}</p>}
    </section>
    <div className="mt-7 text-center">
      <Button type="button" className="cosmos-draw min-h-12" onClick={onReset}>新解读 / New Reading</Button>
      <p className="cosmos-context mt-3 text-xs">开始新解读会清除六爻、铜钱结果与问题。</p>
    </div>
  </div>
}

function HexagramResultCard({ title, hexagram, lines, values, upper, lower, unchanged = false }: { title: string; hexagram: IChingReading['primary']; lines: readonly YinYang[]; values?: IChingReading['lines']; upper: string; lower: string; unchanged?: boolean }) {
  return <article className="iching-result-card" aria-label={`${title}，第 ${hexagram.number} 卦 ${hexagram.fullName}`}>
    <p className="section-label">{title}</p>
    <div className="iching-result-heading mt-3"><span aria-hidden="true">{hexagram.symbol}</span><div><h3>第 {hexagram.number} 卦 · {hexagram.fullName}</h3><p>{hexagram.englishName}</p></div></div>
    <div className="mt-5"><HexagramDiagram lines={lines} values={values} label={`第 ${hexagram.number} 卦 ${hexagram.fullName}${values ? '，动爻已标出' : ''}`} /></div>
    <p className="iching-trigram-pair mt-4">上卦：{upper}　下卦：{lower}</p>
    {unchanged && <p className="iching-unchanged mt-3">无动爻，变卦与本卦相同。</p>}
    <blockquote className="mt-4"><span>《象》参考</span>{hexagram.reference}</blockquote>
  </article>
}

function BaguaReference() {
  return <section className="iching-bagua mx-auto mt-7 max-w-5xl rounded-[var(--card-radius)] p-5 sm:p-7" aria-labelledby="bagua-heading">
    <p className="section-label">Bagua reference · 八卦基础</p>
    <h2 id="bagua-heading" className="mt-2 text-xl font-semibold">三爻由下而上记录</h2>
    <p className="cosmos-context mt-3 text-sm leading-7">实线为阳，断线为阴。每张小图仍按视觉习惯从上到下显示，但数据统一以初爻至上爻保存。</p>
    <div className="iching-bagua-grid mt-5">
      {trigrams.map((trigram) => <article key={trigram.id}><span className="iching-trigram-symbol" aria-hidden="true">{trigram.symbol}</span><div><h3>{trigram.name} <small>{trigram.pinyin}</small></h3><p>{trigram.englishName} · {trigram.nature}</p><p>{trigram.attribute}</p></div><HexagramDiagram compact lines={getTrigram(trigram.id).lines} label={`${trigram.name}卦：${trigram.lines.map((line) => line ? '阳' : '阴').join('、')}，由下而上`} /></article>)}
    </div>
  </section>
}
