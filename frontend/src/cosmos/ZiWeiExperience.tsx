import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../components/ui/button'
import { CityPicker, TimeZonePicker, TimeZoneSummary } from './BirthplaceFields'
import { calculateZiWei, type ZiWeiChart as ZiWeiChartData, type ZiWeiPalace, type ZiWeiTraditionalGender } from './ziweiAdapter'
import { BUREAU_GLOSSARY, MAJOR_STAR_GLOSSARY, PALACE_PRESENTATION, TRANSFORMATION_GLOSSARY, ZIWEI_MAJOR_STARS, ZIWEI_PALACE_NAMES } from './ziweiData'
import { dateInTimeZone, isValidIanaTimeZone, resolveZonedDateTime, type ZonedCandidate } from './astrologyTime'
import type { BirthCity } from './birthplaceData'
import { ZiWeiChart } from './ZiWeiChart'
import { ZiWeiPalaceDetail } from './ZiWeiPalaceDetail'
import { ZIWEI_MAX_DATE, ZIWEI_MIN_DATE, validateZiWeiDate, ziWeiHourLabel, ziWeiTimeIndex } from './ziweiTime'
import type { CosmosReadingSnapshot } from './cosmosAiTypes'
import { ziWeiSnapshot } from './ziweiSnapshot'

interface FormFields {
  date: string
  time: string
  timeKnown: boolean
  timeZone: string
  gender: ZiWeiTraditionalGender | ''
}

const initialFields: FormFields = { date: '', time: '', timeKnown: true, timeZone: '', gender: '' }

export function ZiWeiExperience({ onSnapshotChange }: { onSnapshotChange?: (snapshot: CosmosReadingSnapshot | null) => void }) {
  const now = useMemo(() => new Date(), [])
  const [fields, setFields] = useState(initialFields)
  const [selectedCity, setSelectedCity] = useState<BirthCity | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [chart, setChart] = useState<ZiWeiChartData | null>(null)
  const [selectedPalace, setSelectedPalace] = useState<ZiWeiPalace | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ambiguous, setAmbiguous] = useState<ZonedCandidate[]>([])
  const [selectedUtc, setSelectedUtc] = useState<number | null>(null)

  function clearResult() {
    setChart(null)
    setSelectedPalace(null)
    setError(null)
    setAmbiguous([])
    setSelectedUtc(null)
    onSnapshotChange?.(null)
  }

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((current) => ({ ...current, [key]: value }))
    clearResult()
  }

  function chooseCity(city: BirthCity) {
    setSelectedCity(city)
    setFields((current) => ({ ...current, timeZone: city.timeZone }))
    setManualOpen(false)
    clearResult()
  }

  function beginCitySearch() {
    setSelectedCity(null)
    setFields((current) => ({ ...current, timeZone: '' }))
    clearResult()
  }

  function updateTimeZone(timeZone: string) {
    if (selectedCity?.timeZone !== timeZone) {
      setSelectedCity(null)
    }
    update('timeZone', timeZone)
  }

  function validateForm(): string | null {
    if (!fields.timeKnown) return '紫微斗数十二宫需要出生时辰。不会用中午或随机时辰代替未知时间。'
    if (!isValidIanaTimeZone(fields.timeZone)) return '请选择出生城市或有效的 IANA 民用时区。'
    const dateError = validateZiWeiDate(fields.date, dateInTimeZone(now, fields.timeZone))
    if (dateError) return dateError
    try { ziWeiTimeIndex(fields.time) } catch { return '请输入有效的本地出生时间（小时与分钟）。' }
    if (!fields.gender) return '请选择传统排盘所需的男盘或女盘参数。'
    return null
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const validation = validateForm()
    if (validation) {
      setError(validation)
      setChart(null)
      setSelectedPalace(null)
      return
    }
    const resolution = resolveZonedDateTime({ date: fields.date, time: fields.time, timeZone: fields.timeZone })
    if (resolution.status === 'invalid-zone') {
      setError('无法识别这个 IANA 时区。')
      return
    }
    if (resolution.status === 'nonexistent') {
      setError('这个本地时间不存在，通常发生在夏令时向前跳转时。请检查出生记录。')
      return
    }
    if (resolution.status === 'ambiguous') {
      setAmbiguous(resolution.candidates)
      if (selectedUtc === null || !resolution.candidates.some(({ utcMs }) => utcMs === selectedUtc)) {
        setError('这个本地时间在夏令时回拨时出现两次。请选择出生记录对应的 UTC 偏移。')
        return
      }
    } else {
      setAmbiguous([])
      setSelectedUtc(resolution.candidate.utcMs)
    }
    try {
      const result = calculateZiWei({ date: fields.date, time: fields.time, gender: fields.gender as ZiWeiTraditionalGender }, dateInTimeZone(now, fields.timeZone))
      setChart(result)
      setSelectedPalace(result.palaces.find(({ isLifePalace }) => isLifePalace) ?? result.palaces[0])
      onSnapshotChange?.(ziWeiSnapshot(result, fields.timeZone))
      setError(null)
    } catch (cause) {
      setChart(null)
      setSelectedPalace(null)
      setError(cause instanceof Error ? cause.message : '暂时无法生成命盘，请检查输入后重试。')
    }
  }

  return <div id="cosmos-ziwei-panel" role="tabpanel" aria-labelledby="cosmos-ziwei-tab">
    <section className="cosmos-reading ziwei-intro mx-auto mt-7 max-w-6xl rounded-[var(--card-radius)] p-5 sm:mt-9 sm:p-8" aria-labelledby="ziwei-heading">
      <p className="section-label">Zi Wei Dou Shu · 本地紫微斗数</p>
      <h2 id="ziwei-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">十二宫与十四主星</h2>
      <p className="cosmos-context mt-3 max-w-3xl text-sm leading-7">以公历出生日期、出生地民用时间和传统排盘参数，在设备上换算农历并生成十二宫、命宫、身宫、十四主星、生年四化与五行局。紫微斗数是传统象征系统，不是经科学验证的预测方法。</p>

      <form className="ziwei-form mt-7" onSubmit={submit} noValidate>
        <label className="astrology-field"><span>公历出生日期 / Birth date</span><input type="date" min={ZIWEI_MIN_DATE} max={ZIWEI_MAX_DATE} value={fields.date} onChange={(event) => update('date', event.target.value)} /></label>
        <fieldset className="astrology-time-choice ziwei-time-choice"><legend>出生时间 / Birth time</legend><label><input type="radio" name="ziwei-time-known" checked={fields.timeKnown} onChange={() => update('timeKnown', true)} />已知 / Known</label><label><input type="radio" name="ziwei-time-known" checked={!fields.timeKnown} onChange={() => { update('timeKnown', false); update('time', '') }} />未知 / Unknown</label></fieldset>
        {fields.timeKnown ? <label className="astrology-field"><span>出生地当地钟表时间 / Local civil time</span><input type="time" step="60" value={fields.time} onChange={(event) => update('time', event.target.value)} /><small>{fields.time && /^\d{2}:\d{2}$/.test(fields.time) ? (() => { try { return `对应 ${ziWeiHourLabel(ziWeiTimeIndex(fields.time))}` } catch { return '请输入有效时间。' } })() : '00:00–00:59 为早子时；23:00–23:59 为晚子时。'}</small></label> : <div className="astrology-unknown-note ziwei-unknown-note">出生时辰决定命宫与身宫。时间未知时不会生成完整命盘，也不会代填中午。</div>}

        <div className="ziwei-form-wide"><CityPicker selectedCity={selectedCity} onSelect={chooseCity} onSearchChange={beginCitySearch} onManual={() => setManualOpen(true)} /></div>
        {selectedCity && <div className="astrology-city-card ziwei-form-wide"><div><strong>{selectedCity.chineseName} · {selectedCity.name}</strong><span>{selectedCity.country} · {selectedCity.timeZone}</span></div><small>仅使用民用时区<br />不使用经纬度修正</small></div>}
        <div className="ziwei-form-wide"><TimeZonePicker value={fields.timeZone} onChange={updateTimeZone} label="出生地民用时区 / Civil timezone" /></div>
        <div className="ziwei-form-wide"><TimeZoneSummary timeZone={fields.timeZone} date={fields.date} time={fields.timeKnown ? fields.time : undefined} /></div>
        {manualOpen && !selectedCity && <p className="ziwei-manual-note ziwei-form-wide">若城市不在离线列表，请在上方直接搜索或输入正确的 IANA 时区。此排法只验证当地民用时间，不猜测坐标，也不做真太阳时修正。</p>}

        <fieldset className="ziwei-gender ziwei-form-wide"><legend>传统顺逆参数 / Traditional chart option</legend><label><input type="radio" name="ziwei-gender" checked={fields.gender === '男'} onChange={() => update('gender', '男')} />男盘</label><label><input type="radio" name="ziwei-gender" checked={fields.gender === '女'} onChange={() => update('gender', '女')} />女盘</label><small>这是传统排盘用于运序及部分星曜规则的计算参数，不用于推断或记录你的身份。不会预先选择。</small></fieldset>

        {ambiguous.length > 0 && <fieldset className="astrology-offset-choice ziwei-form-wide"><legend>请选择当时采用的 UTC 偏移</legend>{ambiguous.map((candidate) => <label key={candidate.utcMs}><input type="radio" name="ziwei-offset" checked={selectedUtc === candidate.utcMs} onChange={() => { setSelectedUtc(candidate.utcMs); setError(null); setChart(null); onSnapshotChange?.(null) }} />{candidate.offsetLabel} · {candidate.isoUtc}</label>)}</fieldset>}
        {error && <p className="cosmos-error ziwei-form-wide text-sm" role="alert">{error}</p>}
        <div className="ziwei-form-wide"><Button type="submit" className="cosmos-draw min-h-12 w-full sm:w-auto">生成紫微命盘 / Calculate</Button></div>
      </form>
    </section>

    {chart && selectedPalace && <section className="ziwei-results mx-auto mt-7 max-w-6xl" aria-labelledby="ziwei-results-heading" aria-live="polite">
      <header className="ziwei-result-title">
        <div><p className="section-label">Natal Chart · 本命盘</p><h2 id="ziwei-results-heading">{chart.input.date} · {chart.input.time} · {chart.input.gender}盘</h2></div>
        <Button type="button" variant="secondary" className="cosmos-secondary" onClick={() => { setChart(null); setSelectedPalace(null); onSnapshotChange?.(null) }}>重新输入 / New Chart</Button>
      </header>

      <div className="ziwei-summary-grid mt-5">
        <article><span>农历</span><strong>{chart.lunarDate}</strong><small>{chart.chineseDate}</small></article>
        <article><span>命宫 · 身宫</span><strong>{chart.lifePalaceBranch} · {chart.bodyPalaceBranch}</strong><small>命主 {chart.soulMaster} · 身主 {chart.bodyMaster}</small></article>
        <article><span>五行局</span><strong>{chart.fiveElementsBureau}</strong><small>{BUREAU_GLOSSARY[chart.fiveElementsBureau] ?? '传统排盘的起局分类。'}</small></article>
        <article><span>出生时辰</span><strong>{chart.timeLabel}</strong><small>{ziWeiHourLabel(chart.timeIndex)}</small></article>
      </div>

      <section className="ziwei-transform-summary mt-6" aria-labelledby="ziwei-four-transformations">
        <div><p className="section-label">Birth-year transformations</p><h3 id="ziwei-four-transformations">生年四化</h3></div>
        <div>{(['禄', '权', '科', '忌'] as const).map((transformation) => { const item = chart.transformations.find((entry) => entry.transformation === transformation); return item ? <article key={transformation}><strong>{item.star}化{transformation}</strong><span>{PALACE_PRESENTATION[item.palace].label} · {item.branch}</span><small>{TRANSFORMATION_GLOSSARY[transformation]}</small></article> : null })}</div>
      </section>

      <div className="ziwei-chart-layout mt-6">
        <ZiWeiChart chart={chart} selectedBranch={selectedPalace.earthlyBranch} onSelect={setSelectedPalace} />
        <ZiWeiPalaceDetail palace={selectedPalace} />
      </div>
    </section>}

    <section className="ziwei-reference mx-auto mt-6 max-w-6xl" aria-labelledby="ziwei-reference-heading">
      <h2 id="ziwei-reference-heading">术语参考</h2>
      <details><summary>十二宫主题</summary><div className="ziwei-reference-grid">{ZIWEI_PALACE_NAMES.map((name) => <article key={name}><strong>{PALACE_PRESENTATION[name].label}</strong><small>{PALACE_PRESENTATION[name].english}</small><p>{PALACE_PRESENTATION[name].description}</p></article>)}</div></details>
      <details><summary>十四主星</summary><div className="ziwei-reference-grid">{ZIWEI_MAJOR_STARS.map((name) => <article key={name}><strong>{name}</strong><p>{MAJOR_STAR_GLOSSARY[name]}</p></article>)}</div></details>
      <details><summary>命宫、身宫、四化与五行局</summary><p>命宫是十二宫结构的起点；身宫是附着在既有宫位上的标记，不是第十三宫。生年四化把出生年天干对应的禄、权、科、忌附在四颗星上。五行局是从命宫干支取得的传统起局分类，与 BaZi 的明字五行数量不同。</p></details>
    </section>

    <section className="ziwei-assumptions mx-auto mt-6 max-w-6xl" aria-labelledby="ziwei-assumptions-heading">
      <h2 id="ziwei-assumptions-heading">计算约定与隐私</h2>
      <ul>
        <li>使用 iztro 2.6.2 通行排法：农历正月初一换年、`fixLeap=true`，闰月初一至十五按本月、十六日起按下一月安宫。</li>
        <li>晚子时 23:00–23:59 归入次日；早子时 00:00–00:59 单独保留。日期与时间始终按出生地当地钟表记录传入，不转换成 UTC 日期。</li>
        <li>出生城市只用于取得和验证 IANA 民用时区及夏令时状态。经纬度和真太阳时校正不在本阶段范围。</li>
        <li>出生资料与命盘只保留在当前页面内存，不保存、不上传，也不调用 Firebase、Gemini、iztro AI 或其他网络服务。</li>
      </ul>
    </section>
  </div>
}
