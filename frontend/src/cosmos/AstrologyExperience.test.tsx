import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AstrologyExperience } from './AstrologyExperience'

function setNatal(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
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

  it('calculates a simple Sun Sign and surfaces a boundary day', () => {
    render(<AstrologyExperience />)
    const dateInputs = screen.getAllByLabelText(/Date/)
    fireEvent.change(dateInputs[0], { target: { value: '2024-03-20' } })
    fireEvent.change(screen.getByLabelText(/IANA 时区/), { target: { value: 'Asia/Kuala_Lumpur' } })
    fireEvent.click(screen.getByRole('button', { name: '查看太阳星座' }))
    expect(screen.getByRole('status').textContent).toContain('双鱼座 / 白羊座')
  })

  it('validates timezone, paired coordinates, and latitude range', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2000-01-01')
    setNatal(/Birthplace timezone/, 'Not/AZone')
    setNatal(/Local civil time/, '12:00')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('有效 IANA 时区')
    setNatal(/Birthplace timezone/, 'UTC')
    setNatal(/Latitude/, '91')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('同时填写')
    setNatal(/Longitude/, '0')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('纬度')
  })

  it('renders exact planets, Ascendant, MC, Whole Sign houses, and aspects', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '1990-04-29')
    setNatal(/Birthplace timezone/, 'Asia/Kuala_Lumpur')
    setNatal(/Local civil time/, '05:00')
    setNatal(/Latitude/, '35.6762')
    setNatal(/Longitude/, '139.6503')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '1990-04-29 · 05:00' })).toBeTruthy()
    expect(screen.getByRole('img', { name: /^本命盘圆盘 \/ Natal chart wheel/ })).toBeTruthy()
    expect(screen.getByText('整宫制 / Whole Sign Houses')).toBeTruthy()
    expect(screen.getByText('ASC · 上升')).toBeTruthy()
    expect(screen.getByText('MC · 天顶')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '十大行星' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '十大行星之间' })).toBeTruthy()
  })

  it('keeps a graceful partial chart when location is unknown', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2000-01-01')
    setNatal(/Birthplace timezone/, 'UTC')
    setNatal(/Local civil time/, '00:00')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByText('未提供经纬度，因此不生成上升、MC 或十二宫。')).toBeTruthy()
    expect(screen.getAllByText('宫位未计算')).toHaveLength(10)
  })

  it('does not fabricate time, Moon degree, angles, houses, or aspects when time is unknown', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2024-01-03')
    setNatal(/Birthplace timezone/, 'Asia/Kuala_Lumpur')
    fireEvent.click(screen.getByRole('radio', { name: '未知 / Unknown' }))
    expect(screen.queryByLabelText(/Local civil time/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '2024-01-03 · 时间未知' })).toBeTruthy()
    expect(screen.getByRole('img', { name: /^黄道十二宫参考圆盘 \/ Zodiac reference wheel/ })).toBeTruthy()
    expect(screen.getAllByText('处女座 / 天秤座').length).toBeGreaterThan(0)
    expect(screen.getByText(/没有把任何时刻冒充出生时间/)).toBeTruthy()
    expect(screen.queryByText('ASC · 上升')).toBeNull()
    expect(screen.queryByRole('heading', { name: '十大行星之间' })).toBeNull()
  })

  it('rejects nonexistent DST time and requires offset choice for an ambiguous time', () => {
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2024-03-10')
    setNatal(/Birthplace timezone/, 'America/New_York')
    setNatal(/Local civil time/, '02:30')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('本地时间不存在')
    setNatal(/Birth date/, '2024-11-03')
    setNatal(/Local civil time/, '01:30')
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('出现两次')
    fireEvent.click(screen.getByRole('radio', { name: /UTC-04:00/ }))
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '2024-11-03 · 01:30' })).toBeTruthy()
  })

  it('does not persist or transmit birth information', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<AstrologyExperience />)
    setNatal(/Birth date/, '2000-01-01')
    setNatal(/Birthplace timezone/, 'UTC')
    fireEvent.click(screen.getByRole('radio', { name: '未知 / Unknown' }))
    fireEvent.click(screen.getByRole('button', { name: '计算本命盘 / Calculate' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(localStorageSpy).not.toHaveBeenCalled()
  })
})
