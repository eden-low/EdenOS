import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../components/ui/button'
import { CityPicker, TimeZonePicker, TimeZoneSummary } from './BirthplaceFields'
import { calculateDateOnlyNatal, calculateExactNatal, calculateSunSignForDate, type NatalChart } from './astrologyAdapter'
import { ELEMENT_LABELS, HOUSE_MEANINGS, MODALITY_LABELS, ZODIAC_SIGNS, planetMeta, zodiacForLongitude } from './astrologyData'
import { dateInTimeZone, isValidIanaTimeZone, resolveZonedDateTime, validateAstrologyDate, type ZonedCandidate } from './astrologyTime'
import type { BirthCity } from './birthplaceData'
import { NatalChartWheel, PlanetLegend } from './NatalChartWheel'

interface FormFields {
  date: string
  time: string
  timeKnown: boolean
  timeZone: string
  latitude: string
  longitude: string
}

const initialFields: FormFields = { date: '', time: '', timeKnown: true, timeZone: '', latitude: '', longitude: '' }

function locationFrom(fields: FormFields): { latitude: number; longitude: number } | undefined {
  if (!fields.latitude && !fields.longitude) return undefined
  return { latitude: Number(fields.latitude), longitude: Number(fields.longitude) }
}

function formatLongitude(longitude: number): string {
  const { sign, degree } = zodiacForLongitude(longitude)
  return `${sign.glyph} ${sign.chinese} ${degree.toFixed(2)}°`
}

export function AstrologyExperience() {
  const now = useMemo(() => new Date(), [])
  const [sunDate, setSunDate] = useState('')
  const [sunTimeZone, setSunTimeZone] = useState('')
  const [sunSigns, setSunSigns] = useState<string[] | null>(null)
  const [sunError, setSunError] = useState<string | null>(null)
  const [fields, setFields] = useState(initialFields)
  const [selectedCity, setSelectedCity] = useState<BirthCity | null>(null)
  const [cityPickerVersion, setCityPickerVersion] = useState(0)
  const [zonePickerVersion, setZonePickerVersion] = useState(0)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [chart, setChart] = useState<NatalChart | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ambiguous, setAmbiguous] = useState<ZonedCandidate[]>([])
  const [selectedUtc, setSelectedUtc] = useState<number | null>(null)

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((current) => ({ ...current, [key]: value }))
    setChart(null)
    setError(null)
    setAmbiguous([])
    setSelectedUtc(null)
  }

  function chooseCity(city: BirthCity) {
    setSelectedCity(city)
    setFields((current) => ({ ...current, timeZone: city.timeZone, latitude: String(city.latitude), longitude: String(city.longitude) }))
    setChart(null)
    setError(null)
    setAmbiguous([])
    setSelectedUtc(null)
  }

  function beginCitySearch() {
    setChart(null)
    setError(null)
    setAmbiguous([])
    setSelectedUtc(null)
    setSelectedCity(null)
    setFields((current) => ({ ...current, timeZone: '', latitude: '', longitude: '' }))
  }

  function updateManualLocation(key: 'latitude' | 'longitude', value: string) {
    setSelectedCity(null)
    setCityPickerVersion((version) => version + 1)
    update(key, value)
  }

  function submitSun(event: FormEvent) {
    event.preventDefault()
    if (!isValidIanaTimeZone(sunTimeZone)) {
      setSunError('请输入有效的 IANA 时区，例如 Asia/Kuala_Lumpur。')
      return
    }
    const dateError = validateAstrologyDate(sunDate, dateInTimeZone(now, sunTimeZone))
    if (dateError) {
      setSunError(dateError)
      return
    }
    const signs = calculateSunSignForDate(sunDate, sunTimeZone)
    setSunSigns(signs)
    setSunError(null)
  }

  function validateForm(): string | null {
    if (!isValidIanaTimeZone(fields.timeZone)) return '请输入出生地的有效 IANA 时区，例如 Asia/Kuala_Lumpur。'
    const dateError = validateAstrologyDate(fields.date, dateInTimeZone(now, fields.timeZone))
    if (dateError) return dateError
    if (fields.timeKnown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.time)) return '请输入有效的本地出生时间（小时与分钟）。'
    const hasLatitude = fields.latitude.trim() !== ''
    const hasLongitude = fields.longitude.trim() !== ''
    if (hasLatitude !== hasLongitude) return '纬度与经度须同时填写，或同时留空。'
    if (hasLatitude) {
      const latitude = Number(fields.latitude)
      const longitude = Number(fields.longitude)
      if (!Number.isFinite(latitude) || latitude <= -90 || latitude >= 90) return '纬度须为大于 -90 且小于 90 的数字。'
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return '经度须为 -180 至 180 的数字。'
    }
    return null
  }

  function submitChart(event: FormEvent) {
    event.preventDefault()
    const validation = validateForm()
    if (validation) {
      setError(validation)
      return
    }
    try {
      if (!fields.timeKnown) {
        setChart(calculateDateOnlyNatal(fields.date, fields.timeZone))
        setAmbiguous([])
        setError(null)
        return
      }
      const resolution = resolveZonedDateTime({ date: fields.date, time: fields.time, timeZone: fields.timeZone })
      if (resolution.status === 'invalid-zone') {
        setError('无法识别这个 IANA 时区。')
        return
      }
      if (resolution.status === 'nonexistent') {
        setError('这个本地时间不存在，通常发生在夏令时向前跳转时。请检查时间。')
        return
      }
      if (resolution.status === 'ambiguous') {
        setAmbiguous(resolution.candidates)
        if (selectedUtc === null || !resolution.candidates.some((candidate) => candidate.utcMs === selectedUtc)) {
          setError('这个本地时间在夏令时回拨时出现两次。请选择当时采用的 UTC 偏移。')
          return
        }
        setChart(calculateExactNatal(selectedUtc, locationFrom(fields)))
      } else {
        setAmbiguous([])
        setChart(calculateExactNatal(resolution.candidate.utcMs, locationFrom(fields)))
      }
      setError(null)
    } catch {
      setError('暂时无法计算星盘，请检查输入后重试。')
    }
  }

  return <div id="cosmos-astrology-panel" role="tabpanel" aria-labelledby="cosmos-astrology-tab">
    <section className="cosmos-reading astrology-intro mx-auto mt-7 max-w-5xl rounded-[var(--card-radius)] p-5 sm:mt-9 sm:p-8" aria-labelledby="astrology-heading">
      <p className="section-label">Western Astrology · 本地西洋占星</p>
      <h2 id="astrology-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">热带黄道与本命盘</h2>
      <p className="cosmos-context mt-3 max-w-3xl text-sm leading-7">使用本地天文计算呈现太阳、月亮、行星、上升点、天顶、整宫制宫位与主要相位。内容属于西洋占星的传统象征语言，不是科学人格测量或可靠预测。</p>

      <form className="astrology-sun-tool mt-7" onSubmit={submitSun} noValidate>
        <div><p className="section-label">Simple Sun Sign · 太阳星座</p><h3 className="mt-1">按当天真实太阳黄经判断</h3><p className="cosmos-context mt-2 text-xs leading-5">交界日会计算出生地时区内整天的太阳位置；若当天换座，会明确标示不确定。</p></div>
        <label className="astrology-field"><span>出生日期 / Date</span><input type="date" min="1970-01-01" value={sunDate} onChange={(event) => { setSunDate(event.target.value); setSunSigns(null); setSunError(null) }} /></label>
        <TimeZonePicker value={sunTimeZone} onChange={(timeZone) => { setSunTimeZone(timeZone); setSunSigns(null); setSunError(null) }} label="出生地时区 / Birth timezone" />
        <Button type="submit" className="cosmos-secondary min-h-12">查看太阳星座</Button>
        <div className="astrology-form-wide"><TimeZoneSummary timeZone={sunTimeZone} date={sunDate} /></div>
        {sunError && <p className="cosmos-error astrology-form-wide text-sm" role="alert">{sunError}</p>}
        {sunSigns && <p className="astrology-sun-result astrology-form-wide" role="status">{sunSigns.length === 1
          ? <>太阳星座：<strong>{ZODIAC_SIGNS.find((sign) => sign.id === sunSigns[0])?.glyph} {ZODIAC_SIGNS.find((sign) => sign.id === sunSigns[0])?.chinese}</strong></>
          : <>这一天太阳会换座：<strong>{sunSigns.map((id) => ZODIAC_SIGNS.find((sign) => sign.id === id)?.chinese).join(' / ')}</strong>。需要出生时间才能确定。</>}</p>}
      </form>
    </section>

    <section className="cosmos-reading mx-auto mt-6 max-w-5xl rounded-[var(--card-radius)] p-5 sm:p-8" aria-labelledby="natal-form-heading">
      <p className="section-label">Natal Chart · 出生星盘</p>
      <h2 id="natal-form-heading" className="mt-2 text-xl font-semibold">出生资料</h2>
      <p className="cosmos-context mt-2 text-sm leading-6">日期与时间须为出生地点当时钟表显示的本地民用时间。不会采用设备时区，也不会自动猜测出生城市。</p>
      <form className="astrology-form mt-6" onSubmit={submitChart} noValidate>
        <label className="astrology-field"><span>公历出生日期 / Birth date</span><input type="date" min="1970-01-01" value={fields.date} onChange={(event) => update('date', event.target.value)} /></label>
        <fieldset className="astrology-time-choice astrology-form-wide"><legend>出生时间 / Birth time</legend><label><input type="radio" name="astrology-time-known" checked={fields.timeKnown} onChange={() => update('timeKnown', true)} />已知 / Known</label><label><input type="radio" name="astrology-time-known" checked={!fields.timeKnown} onChange={() => { update('timeKnown', false); update('time', '') }} />未知 / Unknown</label></fieldset>
        {fields.timeKnown && <label className="astrology-field"><span>本地时间 / Local civil time</span><input type="time" step="60" value={fields.time} onChange={(event) => update('time', event.target.value)} /></label>}
        <div className="astrology-form-wide"><CityPicker key={cityPickerVersion} selectedCity={selectedCity} onSelect={chooseCity} onSearchChange={beginCitySearch} onManual={() => setAdvancedOpen(true)} /></div>
        {selectedCity && <div className="astrology-city-card astrology-form-wide"><div><strong>{selectedCity.chineseName} · {selectedCity.name}</strong><span>{selectedCity.country}</span></div><small>{selectedCity.latitude.toFixed(5)}°, {selectedCity.longitude.toFixed(5)}°</small></div>}
        <div className="astrology-form-wide"><TimeZonePicker key={`${selectedCity?.id ?? 'manual-zone'}-${zonePickerVersion}`} value={fields.timeZone} onChange={(timeZone) => update('timeZone', timeZone)} label="出生地时区 / Birthplace timezone" /></div>
        <div className="astrology-form-wide"><TimeZoneSummary timeZone={fields.timeZone} date={fields.date} time={fields.timeKnown && fields.time ? fields.time : undefined} /></div>
        <div className="astrology-advanced astrology-form-wide">
          <button type="button" aria-expanded={advancedOpen} aria-controls="astrology-advanced-fields" onClick={() => setAdvancedOpen((open) => !open)}><span>高级设置 / Advanced</span><small>手动坐标与 IANA 时区</small><i aria-hidden="true">⌄</i></button>
          {advancedOpen && <div id="astrology-advanced-fields" className="astrology-advanced-fields">
            <div className="astrology-coordinate-fields">
              <label className="astrology-field"><span>纬度 / Latitude</span><input type="number" inputMode="decimal" min="-89.999" max="89.999" step="any" placeholder="3.1412" value={fields.latitude} onChange={(event) => updateManualLocation('latitude', event.target.value)} /></label>
              <label className="astrology-field"><span>经度 / Longitude</span><input type="number" inputMode="decimal" min="-180" max="180" step="any" placeholder="101.68653" value={fields.longitude} onChange={(event) => updateManualLocation('longitude', event.target.value)} /></label>
            </div>
            <label className="astrology-field"><span>IANA 时区手动覆盖 / Manual timezone override</span><input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="Europe/Prague" value={fields.timeZone} onChange={(event) => { setZonePickerVersion((version) => version + 1); update('timeZone', event.target.value.trim()) }} /><small>时区是民用时间规则身份，不是固定 UTC 偏移。仅输入完整有效的 IANA 名称。</small></label>
          </div>}
        </div>
        <p className="astrology-location-note astrology-form-wide">城市资料会填入地理坐标与 IANA 时区。UTC 偏移随后按出生日期和时间从时区规则计算。若城市不在列表中，请手动输入；系统不会猜测。离线城市资料来自 GeoNames（CC BY 4.0）。</p>
        {!fields.timeKnown && <p className="astrology-unknown-note astrology-form-wide">不会代填中午。系统会检查这个本地日期从开始到结束的行星星座；可能换座的天体会标为不确定，上升、天顶、宫位、相位与精确度数不显示。</p>}
        {ambiguous.length > 1 && <fieldset className="astrology-offset-choice astrology-form-wide"><legend>选择当时的 UTC 偏移</legend>{ambiguous.map((candidate) => <label key={candidate.utcMs}><input type="radio" name="astrology-offset" checked={selectedUtc === candidate.utcMs} onChange={() => { setSelectedUtc(candidate.utcMs); setChart(null); setError(null) }} />{candidate.offsetLabel} · {candidate.isoUtc}</label>)}</fieldset>}
        {error && <p id="astrology-form-error" className="cosmos-error astrology-form-wide text-sm" role="alert">{error}</p>}
        <Button type="submit" className="cosmos-draw astrology-form-wide min-h-12 w-full sm:w-auto">计算本命盘 / Calculate</Button>
      </form>
    </section>

    {chart && <AstrologyResult chart={chart} fields={fields} city={selectedCity} />}
    <ZodiacReference />
  </div>
}

function AstrologyResult({ chart, fields, city }: { chart: NatalChart; fields: FormFields; city: BirthCity | null }) {
  const sun = chart.placements.find((placement) => placement.id === 'sun')
  const moon = chart.placements.find((placement) => placement.id === 'moon')
  const ascendant = chart.kind === 'exact' && chart.ascendant !== null ? zodiacForLongitude(chart.ascendant) : null
  return <section className="astrology-results mx-auto mt-6 max-w-5xl" aria-labelledby="astrology-results-heading" aria-live="polite">
    <div className="astrology-result-title"><div><p className="section-label">Calculation result · 本地计算结果</p><h2 id="astrology-results-heading">{fields.date}{fields.timeKnown ? ` · ${fields.time}` : ' · 时间未知'}</h2></div><span>{city ? `${city.chineseName} · ` : ''}{fields.timeZone} · Tropical</span></div>
    <div className="astrology-chart-layout mt-5">
      <div><NatalChartWheel chart={chart} /><PlanetLegend chart={chart} /></div>
      <div className="astrology-big-three">
        <KeyPlacement title="太阳星座" english="Sun Sign" placement={sun} symbolism="传统上象征核心表达与生命方向。" />
        <KeyPlacement title="月亮星座" english="Moon Sign" placement={moon} symbolism="传统上象征情绪、习惯与内在体验。" />
        <article><p>上升星座 <span>Rising Sign</span></p>{ascendant ? <strong>{ascendant.sign.glyph} {ascendant.sign.chinese}<small>{ascendant.degree.toFixed(2)}°</small></strong> : <strong className="is-unavailable">无法计算</strong>}<small>{ascendant ? '传统上象征外在呈现与进入经验的方式。' : '需要已知出生时间及经纬度。'}</small></article>
      </div>
    </div>

    <section className="astrology-panel mt-6" aria-labelledby="planetary-placements-heading"><p className="section-label">Planetary placements · 行星落座</p><h3 id="planetary-placements-heading" className="mt-2">十大行星</h3><div className="astrology-placement-list mt-4">{chart.placements.map((placement) => {
      const planet = planetMeta(placement.id)
      if (placement.longitude === null) return <article key={placement.id}><span className="astrology-planet-name"><i>{planet.glyph}</i><strong>{planet.chinese}<small>{planet.english}</small></strong></span><span>{placement.possibleSigns.map((id) => ZODIAC_SIGNS.find((sign) => sign.id === id)?.chinese).join(' / ')}{placement.possibleSigns.length > 1 && <small>当天换座，时间未知</small>}</span><span>度数与宫位未知</span></article>
      return <article key={placement.id}><span className="astrology-planet-name"><i>{planet.glyph}</i><strong>{planet.chinese}<small>{planet.english}</small></strong></span><span>{formatLongitude(placement.longitude)}</span><span>{placement.house ? `第 ${placement.house} 宫` : '宫位未计算'}</span></article>
    })}</div></section>

    {chart.kind === 'exact' && <>
      <section className="astrology-panel astrology-angle-panel mt-6" aria-labelledby="angles-heading"><p className="section-label">Angles & houses · 角点与宫位</p><h3 id="angles-heading" className="mt-2">整宫制 / Whole Sign Houses</h3>{chart.ascendant !== null && chart.midheaven !== null ? <><div className="astrology-angle-values mt-4"><p><span>ASC · 上升</span><strong>{formatLongitude(chart.ascendant)}</strong></p><p><span>MC · 天顶</span><strong>{formatLongitude(chart.midheaven)}</strong></p></div><p className="cosmos-context mt-4 text-xs leading-5">第一宫从上升星座的 0° 开始，每宫对应一个完整星座。MC 作为独立角点显示，不假定总在第十整宫。</p></> : <p className="astrology-empty mt-4">未提供经纬度，因此不生成上升、MC 或十二宫。</p>}</section>
      <section className="astrology-panel mt-6" aria-labelledby="aspects-heading"><p className="section-label">Major aspects · 主要相位</p><h3 id="aspects-heading" className="mt-2">十大行星之间</h3>{chart.aspects.length ? <ul className="astrology-aspect-list mt-4">{chart.aspects.map((aspect) => <li key={`${aspect.first}-${aspect.second}`}><span>{planetMeta(aspect.first).glyph} {planetMeta(aspect.first).chinese} · {planetMeta(aspect.second).glyph} {planetMeta(aspect.second).chinese}</span><strong>{aspect.definition.glyph} {aspect.definition.chinese}<small>{aspect.separation.toFixed(2)}° · 偏差 {aspect.deviation.toFixed(2)}°</small></strong><p>{aspect.definition.symbolism}</p></li>)}</ul> : <p className="astrology-empty mt-4">在本版本的固定容许度内没有主要相位。</p>}<p className="cosmos-context mt-4 text-xs leading-5">容许度：合相/对分 8°，四分/三分 7°，六合 5°。不含角点相位。</p></section>
    </>}
    {chart.kind === 'date-only' && <p className="astrology-partial-note mt-6">这是日期范围结果：没有把任何时刻冒充出生时间。稳定落座仍可参考；标示两个星座的天体需要出生时间才能确定。</p>}
    <section className="astrology-assumptions mt-6"><h3>计算约定与隐私</h3><ul><li>热带黄道；视地心、真日期黄道经度，含光行差修正。</li><li>已知时间时由 IANA 时区解析为 UTC；夏令时重复时间必须明确选择偏移，不存在的本地时间会被拒绝。</li><li>支持 1970-01-01 至今天；极点纬度不支持。结果不包含逆行、交点、凯龙星或预测技法。</li><li>出生资料与结果仅保留在当前 React 内存，不保存、不上传，不调用 Firebase、Gemini、地理编码或第三方占星 API。</li></ul></section>
  </section>
}

function KeyPlacement({ title, english, placement, symbolism }: { title: string; english: string; placement: NatalChart['placements'][number] | undefined; symbolism: string }) {
  if (!placement) return null
  const possibleSigns = 'possibleSigns' in placement ? placement.possibleSigns : [placement.sign]
  const names = possibleSigns.map((id) => ZODIAC_SIGNS.find((sign) => sign.id === id)?.chinese).join(' / ')
  const sign = placement.sign ? ZODIAC_SIGNS.find((item) => item.id === placement.sign) : null
  return <article><p>{title} <span>{english}</span></p><strong>{sign?.glyph} {sign?.chinese ?? names}<small>{placement.degree !== null ? `${placement.degree.toFixed(2)}°` : possibleSigns.length > 1 ? '不确定' : '时间未知'}</small></strong><small>{symbolism}</small></article>
}

function ZodiacReference() {
  return <section className="astrology-zodiac-reference mx-auto mt-6 max-w-5xl" aria-labelledby="zodiac-reference-heading"><p className="section-label">Zodiac reference · 十二星座</p><h2 id="zodiac-reference-heading" className="mt-2 text-xl font-semibold">热带黄道象征参考</h2><div className="astrology-zodiac-grid mt-5">{ZODIAC_SIGNS.map((sign) => <article key={sign.id}><span aria-hidden="true">{sign.glyph}</span><div><h3>{sign.chinese}<small>{sign.english}</small></h3><p>{ELEMENT_LABELS[sign.element].chinese}象 · {ELEMENT_LABELS[sign.element].english} · {MODALITY_LABELS[sign.modality].chinese} / {MODALITY_LABELS[sign.modality].english}</p><small>{sign.symbolism}</small></div></article>)}</div><details className="astrology-house-reference mt-5"><summary>查看十二宫传统主题 / Twelve houses</summary><ol>{HOUSE_MEANINGS.map((meaning, index) => <li key={meaning}><strong>第 {index + 1} 宫</strong><span>{meaning}</span></li>)}</ol></details></section>
}
