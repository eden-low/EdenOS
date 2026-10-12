import { useId, useMemo, useState, type FocusEvent } from 'react'
import { cityLabel, searchBirthCities, searchTimeZones, timeZoneOption, type BirthCity, type TimeZoneOption } from './birthplaceData'
import { describeTimeZone, isValidIanaTimeZone } from './astrologyTime'

function leaveComposite(event: FocusEvent<HTMLDivElement>, close: () => void) {
  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close()
}

export function CityPicker({ selectedCity, onSelect, onSearchChange, onManual }: {
  selectedCity: BirthCity | null
  onSelect: (city: BirthCity) => void
  onSearchChange: () => void
  onManual: () => void
}) {
  const listId = useId()
  const [query, setQuery] = useState(selectedCity ? cityLabel(selectedCity) : '')
  const [open, setOpen] = useState(false)
  const matches = useMemo(() => searchBirthCities(query), [query])

  return <div className="astrology-search-field" onBlur={(event) => leaveComposite(event, () => setOpen(false))}>
    <label htmlFor={`${listId}-input`}>出生城市 / Birth City</label>
    <div className="astrology-search-input">
      <span aria-hidden="true">⌕</span>
      <input id={`${listId}-input`} type="search" role="combobox" autoComplete="off" autoCapitalize="words" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} placeholder="搜索城市，例如 Kuala Lumpur" value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); onSearchChange() }} />
    </div>
    <small>不会读取当前位置，也不会自动选择城市。</small>
    {open && <div id={listId} className="astrology-search-results" role="listbox" aria-label="Birth city results">
      {matches.map((city) => <button key={city.id} type="button" role="option" aria-selected={selectedCity?.id === city.id} onClick={() => { onSelect(city); setQuery(cityLabel(city)); setOpen(false) }}><strong>{city.chineseName} · {city.name}</strong><span>{city.country} · {city.timeZone}</span></button>)}
      {matches.length === 0 && <div className="astrology-search-empty"><strong>没有找到这个城市</strong><span>不会猜测坐标。请改用手动位置资料。</span><button type="button" onClick={() => { setOpen(false); onManual() }}>打开高级设置 / Manual entry</button></div>}
    </div>}
  </div>
}

function optionLabel(option: TimeZoneOption): string {
  return `${option.name} · ${option.region}`
}

export function TimeZonePicker({ value, onChange, label = '时区 / Timezone' }: { value: string; onChange: (timeZone: string) => void; label?: string }) {
  const listId = useId()
  const selected = timeZoneOption(value)
  const [query, setQuery] = useState(selected ? optionLabel(selected) : value)
  const [open, setOpen] = useState(false)
  const matches = useMemo(() => searchTimeZones(query), [query])
  const customZone = query.trim()
  const canUseCustom = isValidIanaTimeZone(customZone) && !matches.some(({ id }) => id === customZone)

  function choose(timeZone: string) {
    onChange(timeZone)
    const option = timeZoneOption(timeZone)
    setQuery(option ? optionLabel(option) : timeZone)
    setOpen(false)
  }

  return <div className="astrology-search-field astrology-timezone-picker" onBlur={(event) => leaveComposite(event, () => setOpen(false))}>
    <label htmlFor={`${listId}-input`}>{label}</label>
    <div className="astrology-search-input">
      <span aria-hidden="true">◷</span>
      <input id={`${listId}-input`} type="search" role="combobox" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck="false" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} placeholder="搜索 Malaysia、London 或 Asia/Tokyo" value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); onChange('') }} />
    </div>
    {value && <small className="astrology-selected-iana">{value}</small>}
    {open && <div id={listId} className="astrology-search-results" role="listbox" aria-label="Timezone results">
      {matches.map((option) => <button key={option.id} type="button" role="option" aria-selected={value === option.id} onClick={() => choose(option.id)}><strong>{option.name}</strong><span>{option.region} · {option.id}</span></button>)}
      {canUseCustom && <button type="button" role="option" aria-selected={value === customZone} onClick={() => choose(customZone)}><strong>使用这个 IANA 时区</strong><span>{customZone}</span></button>}
      {matches.length === 0 && !canUseCustom && <div className="astrology-search-empty"><strong>没有匹配的时区</strong><span>可输入完整有效的 IANA 名称，例如 Europe/Prague。</span></div>}
    </div>}
  </div>
}

export function TimeZoneSummary({ timeZone, date, time }: { timeZone: string; date: string; time?: string }) {
  if (!timeZone) return <p className="astrology-timezone-summary is-pending">选择城市或时区后，这里会显示出生时刻采用的时区资料。</p>
  const fallbackName = timeZoneOption(timeZone)?.name ?? 'Selected timezone'
  const presentation = describeTimeZone(timeZone, date, time)
  if (presentation.status === 'invalid-zone') return <p className="astrology-timezone-summary is-error"><strong>无法识别时区</strong><span>{timeZone}</span></p>
  if (presentation.status === 'nonexistent') return <p className="astrology-timezone-summary is-error"><strong>这个本地时间不存在</strong><span>{timeZone} · 请检查夏令时跳转</span></p>
  const names = presentation.names.length ? presentation.names.join(' / ') : fallbackName
  const offsets = presentation.offsets.length ? presentation.offsets.join(' / ') : '选择出生日期后显示历史 UTC 偏移'
  return <p className="astrology-timezone-summary" aria-live="polite"><strong>{names}</strong><span>{offsets}</span><code>{timeZone}</code>{presentation.status === 'ambiguous' && <small>这个本地时间出现两次；计算时需要选择偏移。</small>}</p>
}
