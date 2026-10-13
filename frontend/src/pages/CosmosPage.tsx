import { lazy, Suspense, useCallback, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '../components/ui/button'
import { IChingExperience } from '../cosmos/IChingExperience'
import { TarotCardVisual } from '../cosmos/TarotCardVisual'
import { combinedTarotReflection } from '../cosmos/tarotReflection'
import { selectTarotCards, validateTarotPositions, type TarotSelection } from '../cosmos/tarotSelection'
import { shuffleTarotDeck } from '../cosmos/tarotShuffle'
import type { TarotCard } from '../cosmos/tarotDeck'
import type { CosmosReadingSnapshot, CosmosSnapshotMap, CosmosSystemId } from '../cosmos/cosmosAiTypes'
import { tarotSnapshot } from '../cosmos/tarotSnapshot'
import './cosmos.css'

const BaZiExperience = lazy(() => import('../cosmos/BaZiExperience').then((module) => ({ default: module.BaZiExperience })))
const AstrologyExperience = lazy(() => import('../cosmos/AstrologyExperience').then((module) => ({ default: module.AstrologyExperience })))
const ZiWeiExperience = lazy(() => import('../cosmos/ZiWeiExperience').then((module) => ({ default: module.ZiWeiExperience })))
const AskCosmosExperience = lazy(() => import('../cosmos/AskCosmosExperience').then((module) => ({ default: module.AskCosmosExperience })))

type ReadingMode = 'single' | 'three'
type ReadingStage = 'shuffle' | 'select' | 'reveal'
type CosmosExperience = CosmosSystemId | 'ai'

const cosmosExperiences: { id: CosmosExperience; chinese: string; english: string }[] = [
  { id: 'tarot', chinese: '塔罗', english: 'Tarot' },
  { id: 'iching', chinese: '易经', english: 'I Ching' },
  { id: 'bazi', chinese: '八字', english: 'BaZi' },
  { id: 'astrology', chinese: '占星', english: 'Astrology' },
  { id: 'ziwei', chinese: '紫微', english: 'Zi Wei' },
  { id: 'ai', chinese: 'AI 解读', english: 'Ask Cosmos' },
]

const emptyNumbers = () => ['', '', '']
const spreadPositions = [
  { label: '过去', englishLabel: 'Past' },
  { label: '现在', englishLabel: 'Present' },
  { label: '发展方向', englishLabel: 'Future Direction' },
] as const

export function CosmosPage() {
  const [experience, setExperience] = useState<CosmosExperience>('tarot')
  const tabRefs = useRef<Partial<Record<CosmosExperience, HTMLButtonElement | null>>>({})
  const [mode, setMode] = useState<ReadingMode>('single')
  const [stage, setStage] = useState<ReadingStage>('shuffle')
  const [shuffledDeck, setShuffledDeck] = useState<TarotCard[] | null>(null)
  const [numbers, setNumbers] = useState(emptyNumbers)
  const [reading, setReading] = useState<TarotSelection[]>([])
  const [error, setError] = useState<string | null>(null)
  const [shuffleVersion, setShuffleVersion] = useState(0)
  const [snapshots, setSnapshots] = useState<CosmosSnapshotMap>({})

  const updateSnapshot = useCallback((system: CosmosSystemId, snapshot: CosmosReadingSnapshot | null) => {
    setSnapshots((current) => {
      if (snapshot) return current[system] === snapshot ? current : { ...current, [system]: snapshot }
      if (!current[system]) return current
      const next = { ...current }
      delete next[system]
      return next
    })
  }, [])
  const handleIChingSnapshot = useCallback((snapshot: CosmosReadingSnapshot | null) => updateSnapshot('iching', snapshot), [updateSnapshot])
  const handleBaZiSnapshot = useCallback((snapshot: CosmosReadingSnapshot | null) => updateSnapshot('bazi', snapshot), [updateSnapshot])
  const handleAstrologySnapshot = useCallback((snapshot: CosmosReadingSnapshot | null) => updateSnapshot('astrology', snapshot), [updateSnapshot])
  const handleZiWeiSnapshot = useCallback((snapshot: CosmosReadingSnapshot | null) => updateSnapshot('ziwei', snapshot), [updateSnapshot])

  function resetReading(nextMode: ReadingMode = mode) {
    setMode(nextMode)
    setStage('shuffle')
    setShuffledDeck(null)
    setNumbers(emptyNumbers())
    setReading([])
    setError(null)
    updateSnapshot('tarot', null)
  }

  function changeMode(nextMode: ReadingMode) {
    if (nextMode !== mode) resetReading(nextMode)
  }

  function shuffle() {
    try {
      setShuffledDeck(shuffleTarotDeck())
      setNumbers(emptyNumbers())
      setReading([])
      setError(null)
      setShuffleVersion((value) => value + 1)
      setStage('select')
      updateSnapshot('tarot', null)
    } catch {
      setError('暂时无法完成洗牌，请重试。')
    }
  }

  function reveal(event: FormEvent) {
    event.preventDefault()
    if (!shuffledDeck) {
      setError('请先洗牌。')
      return
    }
    const count = mode === 'single' ? 1 : 3
    const validation = validateTarotPositions(numbers.slice(0, count), count, shuffledDeck.length)
    if (!validation.ok) {
      setError(validation.error)
      return
    }
    try {
      const result = selectTarotCards(shuffledDeck, validation.positions)
      setReading(result)
      updateSnapshot('tarot', tarotSnapshot(result, mode))
      setError(null)
      setStage('reveal')
    } catch {
      setError('暂时无法揭示牌面，请重试。')
    }
  }

  function handleExperienceKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: CosmosExperience) {
    const index = cosmosExperiences.findIndex((item) => item.id === current)
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % cosmosExperiences.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + cosmosExperiences.length) % cosmosExperiences.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = cosmosExperiences.length - 1
    else return
    event.preventDefault()
    const next = cosmosExperiences[nextIndex].id
    setExperience(next)
    tabRefs.current[next]?.focus()
  }

  return <div className="cosmos-page mx-auto min-h-[calc(100dvh-6rem)] w-full max-w-[92rem] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
    <header className="cosmos-header">
      <p className="section-label">Eden OS · Cosmos</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Cosmos <span className="cosmos-title-zh">象数探索</span></h1>
      <p className="mt-3 max-w-xl text-sm leading-7">先在设备上完成传统象征体验；如你明确同意，也可把所选衍生结果交给 Gemini 协助反思。</p>
    </header>

    <div className="cosmos-experience-tabs mt-6" role="tablist" aria-label="Cosmos experiences">
      {cosmosExperiences.map((item) => <button key={item.id} ref={(node) => { tabRefs.current[item.id] = node }} id={`cosmos-${item.id}-tab`} type="button" role="tab" tabIndex={experience === item.id ? 0 : -1} aria-selected={experience === item.id} aria-controls={`cosmos-${item.id}-panel`} onClick={() => setExperience(item.id)} onKeyDown={(event) => handleExperienceKeyDown(event, item.id)}><strong>{item.chinese}</strong><span>{item.english}</span></button>)}
    </div>

    {experience === 'tarot' ? <div id="cosmos-tarot-panel" role="tabpanel" aria-labelledby="cosmos-tarot-tab">
    <section className="cosmos-reading mx-auto mt-7 max-w-5xl rounded-[var(--card-radius)] p-5 sm:mt-9 sm:p-8" aria-labelledby="cosmos-reading-heading">
      <div className="cosmos-reading-copy">
        <p className="section-label">Tarot reading · 本地塔罗解读</p>
        <h2 id="cosmos-reading-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">洗牌、选择、揭示</h2>
        <p className="mt-3 text-sm leading-7">数字代表本次洗牌后的牌堆位置。相同数字在下一次洗牌后可能对应不同的牌。</p>
      </div>

      <div className="cosmos-mode-selector mt-6" aria-label="Reading mode">
        <button type="button" aria-pressed={mode === 'single'} onClick={() => changeMode('single')}>单张牌 <span>Single Card</span></button>
        <button type="button" aria-pressed={mode === 'three'} onClick={() => changeMode('three')}>三张牌 <span>Three Cards</span></button>
      </div>

      <ol className="cosmos-steps mt-6" aria-label="Reading steps">
        {([['shuffle', '1', '洗牌'], ['select', '2', '选数字'], ['reveal', '3', '揭示']] as const).map(([step, number, label]) => <li key={step} aria-current={stage === step ? 'step' : undefined}><span>{number}</span>{label}</li>)}
      </ol>

      {stage !== 'reveal' ? <div className="cosmos-reading-layout mt-7">
        <div key={shuffleVersion} className={stage === 'select' ? 'cosmos-shuffle-visual' : undefined}><TarotCardVisual reading={null} /></div>
        <div className="cosmos-result" aria-live="polite">
          {stage === 'shuffle' ? <>
            <p className="section-label">第一步 · Shuffle</p>
            <h3 className="mt-3 text-2xl font-semibold">先为这次解读洗牌</h3>
            <p className="cosmos-context mt-4 text-sm leading-7">完整的 78 张牌会在你的设备上重新排列。牌面会保持隐藏，直到你完成数字选择。</p>
            <Button type="button" className="cosmos-draw mt-7 min-h-12 w-full sm:w-auto" onClick={shuffle}>洗牌 / Shuffle</Button>
          </> : <form onSubmit={reveal} noValidate>
            <p className="section-label">第二步 · Select numbers</p>
            <h3 className="mt-3 text-2xl font-semibold">{mode === 'single' ? '选择一个数字' : '为三个位置选择数字'}</h3>
            <p className="cosmos-context mt-3 text-sm leading-7">请输入 1 至 78 的整数。{mode === 'three' ? '三个数字不能重复，并共用当前这一次洗牌顺序。' : ''}</p>
            <div className={`cosmos-number-grid mt-5 ${mode === 'three' ? 'cosmos-number-grid-three' : ''}`}>
              {Array.from({ length: mode === 'single' ? 1 : 3 }, (_, index) => {
                const position = spreadPositions[index]
                const label = mode === 'single' ? '选牌数字 / Card number' : `${position.label} / ${position.englishLabel}`
                return <label key={position?.englishLabel ?? 'single'}><span>{label}</span><input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={numbers[index]} onChange={(event) => { const next = [...numbers]; next[index] = event.target.value; setNumbers(next); setError(null) }} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'tarot-selection-error' : undefined} placeholder="1–78" /></label>
              })}
            </div>
            {error && <p id="tarot-selection-error" role="alert" className="cosmos-error mt-4 text-sm">{error}</p>}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button type="submit" className="cosmos-draw min-h-12">揭示牌面 / Reveal</Button>
              <Button type="button" variant="secondary" className="cosmos-secondary" onClick={shuffle}>重新洗牌 / Reshuffle</Button>
            </div>
            <p className="cosmos-context mt-3 text-xs">重新洗牌会清空尚未揭示的数字。</p>
          </form>}
          {stage === 'shuffle' && error && <p role="alert" className="cosmos-error mt-4 text-sm">{error}</p>}
        </div>
      </div> : <div className="mt-8" aria-live="polite">
        <p className="section-label">第三步 · Reveal</p>
        <h3 className="mt-2 text-2xl font-semibold">{mode === 'single' ? '你的单张牌' : '过去、现在与发展方向'}</h3>
        <div className={`cosmos-revealed-grid mt-7 ${mode === 'three' ? 'cosmos-revealed-grid-three' : ''}`}>
          {reading.map((selection, index) => <RevealedCard key={`${selection.card.id}-${index}`} selection={selection} index={index} mode={mode} />)}
        </div>
        {mode === 'three' && reading.length === 3 && <section className="cosmos-combined mt-7" aria-labelledby="combined-reflection-heading"><p className="section-label">Combined reflection · 综合反思</p><h4 id="combined-reflection-heading" className="mt-2 text-xl font-semibold">把三张牌连成一条线索</h4><p className="mt-3 text-sm leading-7">{combinedTarotReflection(reading)}</p></section>}
        <div className="mt-7 text-center"><Button type="button" className="cosmos-draw min-h-12" onClick={() => resetReading()}>新解读 / New Reading</Button><p className="cosmos-context mt-3 text-xs">开始新解读会清除本次结果，并回到洗牌步骤。</p></div>
      </div>}
    </section>

    <p className="cosmos-disclaimer mx-auto mt-6 max-w-5xl text-xs leading-6">塔罗仅供文化探索、娱乐与个人反思，不是可靠的预测，也不应代替专业建议。</p>
    </div> : experience === 'iching' ? <div id="cosmos-iching-panel" role="tabpanel" aria-labelledby="cosmos-iching-tab"><IChingExperience onSnapshotChange={handleIChingSnapshot} /></div> : experience === 'bazi' ? <Suspense fallback={<div className="cosmos-reading bazi-loading mx-auto mt-7 max-w-5xl rounded-[var(--card-radius)] p-5" role="status">正在载入本地历法引擎…</div>}><BaZiExperience onSnapshotChange={handleBaZiSnapshot} /></Suspense> : experience === 'astrology' ? <Suspense fallback={<div className="cosmos-reading bazi-loading mx-auto mt-7 max-w-5xl rounded-[var(--card-radius)] p-5" role="status">正在载入本地天文引擎…</div>}><AstrologyExperience onSnapshotChange={handleAstrologySnapshot} /></Suspense> : experience === 'ziwei' ? <Suspense fallback={<div className="cosmos-reading bazi-loading mx-auto mt-7 max-w-5xl rounded-[var(--card-radius)] p-5" role="status">正在载入本地紫微排盘引擎…</div>}><ZiWeiExperience onSnapshotChange={handleZiWeiSnapshot} /></Suspense> : <Suspense fallback={<div className="cosmos-reading bazi-loading mx-auto mt-7 max-w-5xl rounded-[var(--card-radius)] p-5" role="status">正在载入 Ask Cosmos…</div>}><AskCosmosExperience snapshots={snapshots} onOpenSystem={setExperience} /></Suspense>}
  </div>
}

function RevealedCard({ selection, index, mode }: { selection: TarotSelection; index: number; mode: ReadingMode }) {
  const spreadPosition = spreadPositions[index]
  const positionLabel = mode === 'single' ? '单张牌 · Single Card' : `${spreadPosition.label} · ${spreadPosition.englishLabel}`
  const orientationLabel = selection.orientation === 'upright' ? '正位 · Upright' : '逆位 · Reversed'
  return <article className="cosmos-revealed-card" style={{ '--reveal-index': index } as CSSProperties} aria-label={`${positionLabel}: ${selection.card.name}, ${orientationLabel}`}>
    <p className="section-label">{positionLabel}</p>
    <div className="mt-4"><TarotCardVisual reading={selection} /></div>
    <p className="cosmos-card-position mt-4">牌堆位置 {selection.position} · {orientationLabel}</p>
    <h4 className="mt-2 text-xl font-semibold">{selection.card.name}</h4>
    <p className="cosmos-english mt-1 text-sm">{selection.card.englishName}</p>
    <p className="cosmos-meaning mt-4 text-sm leading-7">{selection.card[selection.orientation]}</p>
  </article>
}
