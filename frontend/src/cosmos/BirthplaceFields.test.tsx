import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CityPicker, TimeZonePicker } from './BirthplaceFields'
import type { BirthCity } from './birthplaceData'

function CityHarness({ onSelect = vi.fn() }: { onSelect?: (city: BirthCity) => void }) {
  const [city, setCity] = useState<BirthCity | null>(null)
  return <CityPicker selectedCity={city} onSelect={(next) => { setCity(next); onSelect(next) }} onSearchChange={() => setCity(null)} onManual={vi.fn()} />
}

function TimeZoneHarness({ onChange = vi.fn() }: { onChange?: (timeZone: string) => void }) {
  const [timeZone, setTimeZone] = useState('')
  return <TimeZonePicker value={timeZone} onChange={(next) => { setTimeZone(next); onChange(next) }} />
}

describe('birthplace pickers', () => {
  it('commits a city on touch before an iPhone-style blur can close the list', () => {
    const onSelect = vi.fn()
    render(<CityHarness onSelect={onSelect} />)
    const input = screen.getByRole<HTMLInputElement>('combobox', { name: /Birth City/ })
    fireEvent.change(input, { target: { value: 'Kuala Lumpur' } })
    const option = screen.getByRole('option', { name: /吉隆坡.*Kuala Lumpur.*Malaysia/ })

    fireEvent.pointerDown(option, { pointerType: 'touch' })
    fireEvent.blur(input, { relatedTarget: null })

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0].id).toBe('kuala-lumpur')
    expect(input.value).toContain('Kuala Lumpur')
    expect(screen.queryByRole('listbox', { name: 'Birth city results' })).toBeNull()
  })

  it('commits a timezone on touch and updates the controlled visible input', () => {
    const onChange = vi.fn()
    render(<TimeZoneHarness onChange={onChange} />)
    const input = screen.getByRole<HTMLInputElement>('combobox', { name: /Timezone/ })
    fireEvent.change(input, { target: { value: 'Malaysia' } })
    const option = screen.getByRole('option', { name: /Malaysia Time.*Asia\/Kuala_Lumpur/ })

    fireEvent.pointerDown(option, { pointerType: 'touch' })
    fireEvent.blur(input, { relatedTarget: null })

    expect(onChange).toHaveBeenLastCalledWith('Asia/Kuala_Lumpur')
    expect(input.value).toContain('Malaysia Time')
    expect(screen.getByText('Asia/Kuala_Lumpur')).toBeTruthy()
  })

  it('keeps click activation available for keyboard users', () => {
    const onChange = vi.fn()
    render(<TimeZoneHarness onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: /Timezone/ }), { target: { value: 'Tokyo' } })
    fireEvent.click(screen.getByRole('option', { name: /Japan Time.*Asia\/Tokyo/ }))
    expect(onChange).toHaveBeenLastCalledWith('Asia/Tokyo')
  })
})
