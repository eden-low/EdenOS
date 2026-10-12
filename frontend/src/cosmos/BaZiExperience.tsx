import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../components/ui/button'
import { analyzeBaZi } from './baziAnalysis'
import {
  BAZI_MIN_DATE,
  BAZI_TIMEZONE_LABEL,
  calculateBaZi,
  malaysiaToday,
  validateBaZiInput,
  type BaZiChart,
  type BaZiPillar,
  type PillarKey,
} from './baziAdapter'
import {
  EARTHLY_BRANCHES,
  ELEMENT_LABELS,
  HEAVENLY_STEMS,
  TEN_GOD_GLOSSARY,
  YIN_YANG_LABELS,
  type FiveElement,
  type TenGod,
} from './baziData'

const PILLAR_LABELS: Record<PillarKey, { chinese: string; english: string }> = {
  year: { chinese: '年柱', english: 'Year' },
  month: { chinese: '月柱', english: 'Month' },
  day: { chinese: '日柱', english: 'Day' },
  hour: { chinese: '时柱', english: 'Hour' },
}

const ELEMENT_ORDER: FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water']

export function BaZiExperience() {
  const [date, setDate] = useState('')
  const [timeKnown, setTimeKnown] = useState(true)
  const [time, setTime] = useState('')
  const [chart, setChart] = useState<BaZiChart | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = useMemo(() => malaysiaToday(), [])

  function submit(event: FormEvent) {
    event.preventDefault()
    const input = { date, timeKnown, time: timeKnown ? time : undefined }
    const validation = validateBaZiInput(input, today)
    if (!validation.ok) {
      setError(validation.error)
      return
    }
    try {
      setChart(calculateBaZi(input, today))
      setError(null)
    } catch {
      setError('暂时无法完成排盘，请检查输入后重试。')
    }
  }

  return <div id="cosmos-bazi-panel" role="tabpanel" aria-labelledby="cosmos-bazi-tab">
    <section className="cosmos-reading bazi-intro mx-auto mt-7 max-w-5xl rounded-[var(--card-radius)] p-5 sm:mt-9 sm:p-8" aria-labelledby="bazi-heading">
      <p className="section-label">Four Pillars · 本地八字排盘</p>
      <h2 id="bazi-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">四柱、五行与十神</h2>
      <p className="cosmos-context mt-3 max-w-3xl text-sm leading-7">以出生地的本地民用时间排出年、月、日、时四柱。Phase 3A 仅支持现代马来西亚 UTC+08:00，不进行经度真太阳时换算，也不提供命运预测。</p>

      <form className="bazi-form mt-7" onSubmit={submit} noValidate>
        <div className="bazi-form-grid">
          <label className="bazi-field">
            <span>公历出生日期 / Gregorian birth date</span>
            <input type="date" min={BAZI_MIN_DATE} max={today} value={date} onChange={(event) => { setDate(event.target.value); setError(null) }} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'bazi-form-error' : 'bazi-date-help'} />
            <small id="bazi-date-help">支持 1982-01-01 至今天的现代马来西亚日期。</small>
          </label>
          <label className="bazi-field">
            <span>出生地时区 / Birthplace timezone</span>
            <select value="Asia/Kuala_Lumpur" disabled aria-describedby="bazi-timezone-help"><option value="Asia/Kuala_Lumpur">{BAZI_TIMEZONE_LABEL}</option></select>
            <small id="bazi-timezone-help">输入须为出生地点钟表显示的本地时间；不会采用浏览器当前时区。</small>
          </label>
        </div>

        <fieldset className="bazi-time-choice mt-5">
          <legend>出生时间是否已知？ / Is the birth time known?</legend>
          <label><input type="radio" name="birth-time-known" checked={timeKnown} onChange={() => { setTimeKnown(true); setError(null) }} />已知 / Known</label>
          <label><input type="radio" name="birth-time-known" checked={!timeKnown} onChange={() => { setTimeKnown(false); setTime(''); setError(null) }} />未知 / Unknown</label>
        </fieldset>

        {timeKnown && <label className="bazi-field bazi-time-field mt-5">
          <span>本地出生时间 / Local civil time</span>
          <input type="time" step="60" value={time} onChange={(event) => { setTime(event.target.value); setError(null) }} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'bazi-form-error' : 'bazi-time-help'} />
          <small id="bazi-time-help">请输入小时和分钟。23:00–23:59 采用晚子时日柱仍属当日的约定。</small>
        </label>}

        {!timeKnown && <p className="bazi-unknown-note mt-5 text-sm leading-6">不会代填出生时刻。可确定时显示前三柱，时柱保持“未知”；若当天跨越立春或月令交节，相应柱也会标示不确定。</p>}
        {error && <p id="bazi-form-error" role="alert" className="cosmos-error mt-4 text-sm">{error}</p>}
        <Button type="submit" className="cosmos-draw mt-6 min-h-12 w-full sm:w-auto">排出四柱 / Calculate</Button>
      </form>
    </section>

    {chart && <BaZiResult chart={chart} />}

    <section className="bazi-assumptions mx-auto mt-6 max-w-5xl" aria-labelledby="bazi-assumptions-heading">
      <h2 id="bazi-assumptions-heading">计算约定与隐私</h2>
      <ul>
        <li>年柱以立春交节为界；月柱以十二个“节”的精确时刻为界，不按农历月份直接替代。</li>
        <li>采用 00:00 换日（sect 2）：23:00–23:59 的日柱仍属当日，子时从 23:00 开始；另一常见流派会在 23:00 换日。</li>
        <li>出生资料与结果仅保留在当前页面内存，不保存、不上传，也不会调用 Firebase、Gemini 或其他服务。</li>
      </ul>
    </section>
  </div>
}

function BaZiResult({ chart }: { chart: BaZiChart }) {
  const analysis = analyzeBaZi(chart)
  return <section className="bazi-results mx-auto mt-7 max-w-5xl" aria-labelledby="bazi-results-heading" aria-live="polite">
    <div className="bazi-result-title">
      <div><p className="section-label">Calculation result · 排盘结果</p><h2 id="bazi-results-heading">{chart.input.date}{chart.input.time ? ` · ${chart.input.time}` : ' · 时间未知'}</h2></div>
      <span>{BAZI_TIMEZONE_LABEL}</span>
    </div>

    {chart.uncertainty.length > 0 && <div className="bazi-boundary-warning mt-4" role="status"><strong>交节不确定性</strong>{chart.uncertainty.map((note) => <p key={note}>{note}</p>)}</div>}

    <div className="bazi-pillars mt-5">
      {(['year', 'month', 'day', 'hour'] as const).map((key) => <PillarCard key={key} pillarKey={key} pillar={chart.pillars[key]} tenGod={analysis.tenGods.find((item) => item.pillar === key)?.label ?? null} />)}
    </div>

    <div className="bazi-analysis-grid mt-6">
      <article className="bazi-panel bazi-day-master">
        <p className="section-label">Day Master · 日主</p>
        <div className="bazi-day-master-value mt-3"><strong>{analysis.dayMaster.character}</strong><div><h3>{analysis.dayMaster.pinyin}</h3><p>{YIN_YANG_LABELS[analysis.dayMaster.yinYang].chinese} · {ELEMENT_LABELS[analysis.dayMaster.element].chinese} / {ELEMENT_LABELS[analysis.dayMaster.element].english}</p></div></div>
        <p className="cosmos-context mt-4 text-sm leading-6">日干是十神关系的参照点。这里仅展示传统分类结构，不据此推断人格、健康、财富或未来。</p>
      </article>

      <article className="bazi-panel">
        <p className="section-label">Visible elements · 明字五行</p>
        <h3 className="mt-2">基础可见字符计数</h3>
        <div className="bazi-elements mt-4">
          {ELEMENT_ORDER.map((element) => {
            const count = analysis.visibleElements[element]
            return <div key={element} className={`bazi-element is-${element}`}><span>{ELEMENT_LABELS[element].chinese}<small>{ELEMENT_LABELS[element].english}</small></span><div aria-hidden="true"><i style={{ width: `${(count / analysis.visibleCharacterCount) * 100}%` }} /></div><strong>{count}</strong></div>
          })}
        </div>
        <p className="cosmos-context mt-4 text-xs leading-5">只统计已显示柱的天干与地支，共 {analysis.visibleCharacterCount} 个明字；不含藏干。原始数量不代表整体强弱、喜用神或元素“完全缺失”。</p>
      </article>
    </div>

    <section className="bazi-panel mt-6" aria-labelledby="ten-gods-heading">
      <p className="section-label">Ten Gods · 十神</p>
      <h3 id="ten-gods-heading" className="mt-2">以日主为基准的天干关系</h3>
      <div className="bazi-ten-gods mt-4">
        {analysis.tenGods.map((item) => <div key={item.pillar}><span>{PILLAR_LABELS[item.pillar].chinese}</span><strong>{item.label}</strong>{item.label !== '日主' && <small>{TEN_GOD_GLOSSARY[item.label]}</small>}</div>)}
        {!chart.pillars.hour && <div className="is-unknown"><span>时柱</span><strong>未知</strong><small>未分配时干十神。</small></div>}
      </div>
      <details className="bazi-glossary mt-5"><summary>查看十神术语表 / Glossary</summary><dl>{(Object.entries(TEN_GOD_GLOSSARY) as [TenGod, string][]).map(([name, meaning]) => <div key={name}><dt>{name}</dt><dd>{meaning}</dd></div>)}</dl></details>
    </section>
  </section>
}

function PillarCard({ pillarKey, pillar, tenGod }: { pillarKey: PillarKey; pillar: BaZiPillar | null; tenGod: '日主' | TenGod | null }) {
  const label = PILLAR_LABELS[pillarKey]
  if (!pillar) return <article className="bazi-pillar is-unknown"><p>{label.chinese}<span>{label.english}</span></p><strong>未知</strong><small>{pillarKey === 'hour' ? '出生时间未提供' : '交节时刻未确定'}</small></article>
  const stem = HEAVENLY_STEMS[pillar.stem]
  const branch = EARTHLY_BRANCHES[pillar.branch]
  return <article className="bazi-pillar">
    <p>{label.chinese}<span>{label.english}</span></p>
    <div className="bazi-pillar-chars" aria-label={`${label.chinese} ${pillar.text}`}><strong>{pillar.stem}</strong><strong>{pillar.branch}</strong></div>
    <div className="bazi-pillar-meta"><span>天干 · {YIN_YANG_LABELS[stem.yinYang].chinese}{ELEMENT_LABELS[stem.element].chinese}</span><span>地支 · {YIN_YANG_LABELS[branch.yinYang].chinese}{ELEMENT_LABELS[branch.element].chinese}</span></div>
    {tenGod && <small className="bazi-pillar-god">{tenGod}</small>}
  </article>
}
