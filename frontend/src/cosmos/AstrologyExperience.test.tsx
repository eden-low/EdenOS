import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AstrologyExperience } from './AstrologyExperience'

function setNatal(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function selectCity(query: string, optionName: RegExp) {
  fireEvent.change(screen.getByRole('combobox', { name: /Birth City/ }), { target: { value: query } })
  fireEvent.click(screen.getByRole('option', { name: optionName }))
}

function selectNatalZone(query: string, optionName: RegExp) {
  fireEvent.change(screen.getByRole('combobox', { name: /Birthplace timezone/ }), { target: { value: query } })
  fireEvent.click(screen.getByRole('option', { name: optionName }))
}

function openAdvanced() {
  fireEvent.click(screen.getByRole('button', { name: /高级设置 \/ Advanced/ }))
}

describe('local Astrology experience', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows all 12 signs without requiring birth information', () => {
    render(<AstrologyExperience />)
    expect(screen.getByRole('heading', { name: '热带黄道与本命盘' })).toBeTruthy()
    for (const sign of ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座']) {
      expect(screen.getByRole('heading', { name: new RegExp(sign) })).toBeTruthy()
    }
  })

  it('gives the simple Sun Sign form a friendly searchable timezone picker', () => {
    render(<AstrologyExperience />)
    fireEvent.change(screen.getByLabelText('出生日期 / Date'), { target: { value: '2024-03-20' } })
    fireEvent.change(screen.getByRole('combobox', { name: /Birth timezone/ }), { target: { value: 'Malaysia' } })
    fireEvent.click(screen.getByRole('option', { name: /Malaysia Time.*Asia\/Kuala_Lumpur/ }))
    expect(screen.getByText('UTC+08:00')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '查看太阳星座' }))
    expect(screen.getByRole('status').textContent).toContain('双鱼座 / 白羊座')
  })

  it('selects Kuala Lumpur and fills verified coordinates, timezone, and date-specific offset', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '1990-04-29')
    setNatal(/Local civil time/, '05:00')
    selectCity('Kuala Lumpur', /吉隆坡.*Kuala Lumpur.*Malaysia/)
    expect(screen.getByText('Malaysia Time')).toBeTruthy()
    expect(screen.getByText('UTC+08:00')).toBeTruthy()
    expect(screen.getAllByText('Asia/Kuala_Lumpur').length).toBeGreaterThan(0)
    openAdvanced()
    expect(screen.getByLabelText(/Latitude/).getAttribute('value')).toBe('3.1412')
    expect(screen.getByLabelText(/Longitude/).getAttribute('value')).toBe('101.68653')
    expect(screen.getByLabelText(/Manual timezone override/).getAttribute('value')).toBe('Asia/Kuala_Lumpur')
  })

  it('keeps primary birthplace controls in full-width mobile rows and hides manual fields by default', () => {
    render(<AstrologyExperience />)
    const city = screen.getByRole('combobox', { name: /Birth City/ })
    const zone = screen.getByRole('combobox', { name: /Birthplace timezone/ })
    expect(city.closest('.astrology-form-wide')).toBeTruthy()
    expect(zone.closest('.astrology-form-wide')).toBeTruthy()
    const advanced = screen.getByRole('button', { name: /高级设置 \/ Advanced/ })
    expect(advanced.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByLabelText(/Latitude/)).toBeNull()
    fireEvent.click(advanced)
    expect(screen.getByLabelText(/Latitude/).getAttribute('inputmode')).toBe('decimal')
    expect(screen.getByLabelText(/Longitude/).getAttribute('inputmode')).toBe('decimal')
  })

  it('selects an overseas city with a different IANA timezone', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2000-07-15')
    setNatal(/Local civil time/, '12:00')
    selectCity('New York', /纽约.*New York City.*United States/)
    expect(screen.getByText('Eastern Daylight Time')).toBeTruthy()
    expect(screen.getByText('UTC-04:00')).toBeTruthy()
    expect(screen.getAllByText('America/New_York').length).toBeGreaterThan(0)
    openAdvanced()
    expect(screen.getByLabelText(/Latitude/).getAttribute('value')).toBe('40.71427')
    expect(screen.getByLabelText(/Longitude/).getAttribute('value')).toBe('-74.00597')
  })

  it('renders exact planets, Ascendant, MC, Whole Sign houses, and aspects from a selected city', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '1990-04-29')
    setNatal(/Local civil time/, '05:00')
    selectCity('Tokyo', /东京.*Tokyo.*Japan/)
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '1990-04-29 · 05:00' })).toBeTruthy()
    expect(screen.getByRole('img', { name: /^本命盘圆盘 \/ Natal chart wheel/ })).toBeTruthy()
    expect(screen.getByText('整宫制 / Whole Sign Houses')).toBeTruthy()
    expect(screen.getByText('ASC · 上升')).toBeTruthy()
    expect(screen.getByText('MC · 天顶')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '十大行星之间' })).toBeTruthy()
  })

  it('clears a calculated chart as soon as the birthplace changes', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '1990-04-29')
    setNatal(/Local civil time/, '05:00')
    selectCity('Kuala Lumpur', /吉隆坡.*Kuala Lumpur.*Malaysia/)
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '1990-04-29 · 05:00' })).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: /Birth City/ }), { target: { value: 'Tokyo' } })
    expect(screen.queryByRole('heading', { name: '1990-04-29 · 05:00' })).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: /东京.*Tokyo.*Japan/ }))
    expect(screen.queryByRole('img', { name: /^本命盘圆盘/ })).toBeNull()
  })

  it('supports an unknown-city fallback through manual Advanced fields', () => {
    render(<AstrologyExperience />)
    fireEvent.change(screen.getByRole('combobox', { name: /Birth City/ }), { target: { value: 'Atlantis' } })
    expect(screen.getByText('没有找到这个城市')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '打开高级设置 / Manual entry' }))
    setNatal(/Birth date/, '2000-01-01')
    setNatal(/Local civil time/, '00:00')
    setNatal(/Latitude/, '-33.5')
    setNatal(/Longitude/, '18.4')
    setNatal(/Manual timezone override/, 'Africa/Johannesburg')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '2000-01-01 · 00:00' })).toBeTruthy()
  })

  it('validates a manually entered timezone and paired coordinate ranges', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2000-01-01')
    setNatal(/Local civil time/, '12:00')
    openAdvanced()
    setNatal(/Manual timezone override/, 'Not/AZone')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('有效 IANA 时区')
    setNatal(/Manual timezone override/, 'UTC')
    setNatal(/Latitude/, '91')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('同时填写')
    setNatal(/Longitude/, '0')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('纬度')
  })

  it('keeps a graceful partial chart when timezone is selected but coordinates are unknown', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2000-01-01')
    setNatal(/Local civil time/, '00:00')
    selectNatalZone('UTC', /Coordinated Universal Time.*UTC/)
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByText('未提供经纬度，因此不生成上升、MC 或十二宫。')).toBeTruthy()
    expect(screen.getAllByText('宫位未计算')).toHaveLength(10)
  })

  it('preserves unknown-time behavior with a selected city', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2024-01-03')
    selectCity('Kuala Lumpur', /吉隆坡.*Kuala Lumpur.*Malaysia/)
    fireEvent.click(screen.getByRole('radio', { name: '未知 / Unknown' }))
    expect(screen.queryByLabelText(/Local civil time/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '2024-01-03 · 时间未知' })).toBeTruthy()
    expect(screen.getByRole('img', { name: /^黄道十二宫参考圆盘 \/ Zodiac reference wheel/ })).toBeTruthy()
    expect(screen.getAllByText('处女座 / 天秤座').length).toBeGreaterThan(0)
    expect(screen.queryByText('ASC · 上升')).toBeNull()
  })

  it('preserves nonexistent and ambiguous DST handling for a selected city', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2024-03-10')
    setNatal(/Local civil time/, '02:30')
    selectCity('New York', /纽约.*New York City.*United States/)
    expect(screen.getByText('这个本地时间不存在')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('本地时间不存在')
    setNatal(/Birth date/, '2024-11-03')
    setNatal(/Local civil time/, '01:30')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('出现两次')
    fireEvent.click(screen.getByRole('radio', { name: /UTC-04:00/ }))
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '2024-11-03 · 01:30' })).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /UTC-05:00/ }))
    expect(screen.queryByRole('heading', { name: '2024-11-03 · 01:30' })).toBeNull()
  })

  it('does not persist or transmit birth information', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2000-01-01')
    selectCity('Kuala Lumpur', /吉隆坡.*Kuala Lumpur.*Malaysia/)
    fireEvent.click(screen.getByRole('radio', { name: '未知 / Unknown' }))
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(localStorageSpy).not.toHaveBeenCalled()
  })
})
