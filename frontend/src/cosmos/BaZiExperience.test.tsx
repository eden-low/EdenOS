import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BaZiExperience } from './BaZiExperience'

function setDate(value: string) {
  fireEvent.change(screen.getByLabelText(/Gregorian birth date/), { target: { value } })
}

describe('local BaZi experience', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('validates required birth information and impossible dates', () => {
    render(<BaZiExperience />)
    fireEvent.click(screen.getByRole('button', { name: '排出四柱 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('有效的公历出生日期')
    setDate('2024-02-29')
    fireEvent.click(screen.getByRole('button', { name: '排出四柱 / Calculate' }))
    expect(screen.getByRole('alert').textContent).toContain('出生时间')
  })

  it('renders four pillars, Day Master, visible elements, and Ten Gods for known time', () => {
    render(<BaZiExperience />)
    setDate('1990-05-15')
    fireEvent.change(screen.getByLabelText(/Local civil time/), { target: { value: '10:00' } })
    fireEvent.click(screen.getByRole('button', { name: '排出四柱 / Calculate' }))
    expect(screen.getByRole('heading', { name: '1990-05-15 · 10:00' })).toBeTruthy()
    for (const pillar of ['庚午', '辛巳', '庚辰', '辛巳']) expect(screen.getAllByLabelText(new RegExp(pillar)).length).toBeGreaterThan(0)
    expect(screen.getByText('基础可见字符计数')).toBeTruthy()
    expect(screen.getByText(/共 8 个明字/)).toBeTruthy()
    expect(screen.getAllByText('日主').length).toBeGreaterThan(0)
  })

  it('keeps unknown time blank and surfaces boundary uncertainty', () => {
    render(<BaZiExperience />)
    setDate('2021-02-03')
    fireEvent.click(screen.getByRole('radio', { name: '未知 / Unknown' }))
    expect(screen.queryByLabelText(/Local civil time/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '排出四柱 / Calculate' }))
    expect(screen.getByRole('heading', { name: '2021-02-03 · 时间未知' })).toBeTruthy()
    expect(screen.getByText('交节不确定性')).toBeTruthy()
    expect(screen.getByText(/不会代填出生时刻/)).toBeTruthy()
    expect(screen.getAllByText('未知').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText(/共 2 个明字/)).toBeTruthy()
  })

  it('recalculates in place without persistence or network access', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<BaZiExperience />)
    setDate('1990-05-15')
    fireEvent.click(screen.getByRole('radio', { name: '未知 / Unknown' }))
    fireEvent.click(screen.getByRole('button', { name: '排出四柱 / Calculate' }))
    expect(screen.getByRole('heading', { name: '1990-05-15 · 时间未知' })).toBeTruthy()
    setDate('2000-01-01')
    fireEvent.click(screen.getByRole('button', { name: '排出四柱 / Calculate' }))
    expect(screen.getByRole('heading', { name: '2000-01-01 · 时间未知' })).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(storageSpy).not.toHaveBeenCalled()
  })
})
