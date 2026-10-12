import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZiWeiExperience } from './ZiWeiExperience'

function setField(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function selectCity(query: string, option: RegExp) {
  fireEvent.change(screen.getByRole('combobox', { name: /Birth City/ }), { target: { value: query } })
  fireEvent.click(screen.getByRole('option', { name: option }))
}

function chooseMale() {
  fireEvent.click(screen.getByRole('radio', { name: '男盘' }))
}

function completeReferenceForm() {
  setField(/Birth date/, '1990-06-15')
  setField(/Local civil time/, '09:30')
  selectCity('Kuala Lumpur', /吉隆坡.*Kuala Lumpur.*Malaysia/)
  chooseMale()
}

describe('local Zi Wei experience', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('uses the offline city and readable date-specific timezone experience without coordinates', () => {
    render(<ZiWeiExperience />)
    setField(/Birth date/, '1990-06-15')
    setField(/Local civil time/, '09:30')
    selectCity('Kuala Lumpur', /吉隆坡.*Kuala Lumpur.*Malaysia/)
    expect(screen.getByRole<HTMLInputElement>('combobox', { name: /Civil timezone/ }).value).toContain('Malaysia Time')
    expect(screen.getByText('Malaysia Time')).toBeTruthy()
    expect(screen.getByText('UTC+08:00')).toBeTruthy()
    expect(screen.getAllByText('Asia/Kuala_Lumpur').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/Latitude/)).toBeNull()
    expect(screen.queryByLabelText(/Longitude/)).toBeNull()
    expect(screen.getByText(/仅使用民用时区/)).toBeTruthy()
  })

  it('requires an explicit traditional option and never defaults it', () => {
    render(<ZiWeiExperience />)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '男盘' }).checked).toBe(false)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '女盘' }).checked).toBe(false)
    setField(/Birth date/, '1990-06-15')
    setField(/Local civil time/, '09:30')
    selectCity('Kuala Lumpur', /吉隆坡.*Kuala Lumpur.*Malaysia/)
    fireEvent.click(screen.getByRole('radio', { name: '女盘' }))
    fireEvent.click(screen.getByRole('radio', { name: '男盘' }))
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '男盘' }).checked).toBe(true)
  })

  it('renders a real twelve-palace chart, Life and Body markers, stars, and Four Transformations', () => {
    render(<ZiWeiExperience />)
    completeReferenceForm()
    fireEvent.click(screen.getByRole('button', { name: '生成紫微命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '1990-06-15 · 09:30 · 男盘' })).toBeTruthy()
    expect(document.querySelectorAll('.ziwei-palace-cell')).toHaveLength(12)
    expect(screen.getAllByText('火六局').length).toBeGreaterThan(0)
    expect(screen.getAllByText('太阳化禄').length).toBeGreaterThan(0)
    expect(screen.getAllByText('武曲化权').length).toBeGreaterThan(0)
    expect(screen.getAllByText('太阴化科').length).toBeGreaterThan(0)
    expect(screen.getAllByText('天同化忌').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /命宫.*己丑.*命宫.*查看详情/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', { name: /命宫.*Life/ })).toBeTruthy()
  })

  it('lets an iPhone user inspect readable palace details below the compact chart', () => {
    render(<ZiWeiExperience />)
    completeReferenceForm()
    fireEvent.click(screen.getByRole('button', { name: '生成紫微命盘 / Calculate' }))
    const spouse = screen.getByRole('button', { name: /夫妻宫.*丁亥.*身宫.*查看详情/ })
    fireEvent.click(spouse)
    expect(spouse.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', { name: /夫妻宫.*Partnership/ })).toBeTruthy()
    expect(screen.getByText('身宫 · Body')).toBeTruthy()
    expect(document.querySelector('.ziwei-chart-grid')).toBeTruthy()
    expect(document.querySelector('.ziwei-chart-layout')).toBeTruthy()
  })

  it('clears stale results whenever birth information changes', () => {
    render(<ZiWeiExperience />)
    completeReferenceForm()
    fireEvent.click(screen.getByRole('button', { name: '生成紫微命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '1990-06-15 · 09:30 · 男盘' })).toBeTruthy()
    setField(/Local civil time/, '11:30')
    expect(screen.queryByRole('heading', { name: '1990-06-15 · 09:30 · 男盘' })).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: /Birth City/ }), { target: { value: 'Tokyo' } })
    expect(document.querySelector('.ziwei-chart-grid')).toBeNull()
  })

  it('does not fabricate a chart when birth time is unknown', () => {
    render(<ZiWeiExperience />)
    setField(/Birth date/, '1990-06-15')
    selectCity('Kuala Lumpur', /吉隆坡.*Kuala Lumpur.*Malaysia/)
    chooseMale()
    fireEvent.click(screen.getByRole('radio', { name: '未知 / Unknown' }))
    expect(screen.queryByLabelText(/Local civil time/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '生成紫微命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('需要出生时辰')
    expect(document.querySelector('.ziwei-chart-grid')).toBeNull()
    expect(screen.getByRole('heading', { name: '术语参考' })).toBeTruthy()
  })

  it('supports an unlisted-city fallback with a manually chosen IANA timezone', () => {
    render(<ZiWeiExperience />)
    fireEvent.change(screen.getByRole('combobox', { name: /Birth City/ }), { target: { value: 'Atlantis' } })
    fireEvent.click(screen.getByRole('button', { name: '打开高级设置 / Manual entry' }))
    expect(screen.getByText(/不猜测坐标/)).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: /Civil timezone/ }), { target: { value: 'UTC' } })
    fireEvent.click(screen.getByRole('option', { name: /Coordinated Universal Time.*UTC/ }))
    expect(screen.getAllByText('UTC').length).toBeGreaterThan(0)
  })

  it('rejects invalid zones and preserves nonexistent and ambiguous DST handling', () => {
    render(<ZiWeiExperience />)
    setField(/Birth date/, '2024-03-10')
    setField(/Local civil time/, '02:30')
    selectCity('New York', /纽约.*New York City.*United States/)
    chooseMale()
    fireEvent.click(screen.getByRole('button', { name: '生成紫微命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('本地时间不存在')
    setField(/Birth date/, '2024-11-03')
    setField(/Local civil time/, '01:30')
    fireEvent.click(screen.getByRole('button', { name: '生成紫微命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('出现两次')
    fireEvent.click(screen.getByRole('radio', { name: /UTC-04:00/ }))
    fireEvent.click(screen.getByRole('button', { name: '生成紫微命盘 / Calculate' }))
    expect(screen.getByRole('heading', { name: '2024-11-03 · 01:30 · 男盘' })).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: /Civil timezone/ }), { target: { value: 'Not/AZone' } })
    expect(document.querySelector('.ziwei-chart-grid')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '生成紫微命盘 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('有效的 IANA')
  })

  it('keeps birth data in memory without network or browser persistence', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<ZiWeiExperience />)
    completeReferenceForm()
    fireEvent.click(screen.getByRole('button', { name: '生成紫微命盘 / Calculate' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(localStorageSpy).not.toHaveBeenCalled()
  })
})
