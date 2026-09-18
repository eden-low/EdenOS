import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { DailyContext } from './DailyContext'
import { DailyWeather } from './DailyWeather'

const providerResponse = {
  current: { time: '2026-09-18T14:15', temperature_2m: 30.4, weather_code: 2 },
  daily: { temperature_2m_max: [33.2], temperature_2m_min: [25.1], precipitation_probability_max: [45] },
}

function setGeolocation(value: Geolocation | undefined) {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value })
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.unstubAllGlobals()
  setGeolocation(undefined)
})

it('does not ask for location or fetch weather before an explicit click', () => {
  const getCurrentPosition = vi.fn()
  setGeolocation({ getCurrentPosition } as unknown as Geolocation)
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  render(<DailyWeather />)
  expect(screen.getByRole('button', { name: 'Enable weather' })).toBeTruthy()
  expect(getCurrentPosition).not.toHaveBeenCalled()
  expect(fetcher).not.toHaveBeenCalled()
})

it('shows normalized current weather after permission and keeps it on remount', async () => {
  const getCurrentPosition = vi.fn((success: PositionCallback) => success({
    coords: { latitude: 3.14159, longitude: 101.69123 },
  } as GeolocationPosition))
  setGeolocation({ getCurrentPosition } as unknown as Geolocation)
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => providerResponse }))
  vi.stubGlobal('fetch', fetcher)
  const { unmount } = render(<DailyWeather />)
  fireEvent.click(screen.getByRole('button', { name: 'Enable weather' }))
  await waitFor(() => expect(screen.getByText(/30°C/)).toBeTruthy())
  expect(screen.getByText(/Partly cloudy/)).toBeTruthy()
  expect(screen.getByText(/H 33° · L 25° · Precipitation 45%/)).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Weather data: Open-Meteo' }).getAttribute('rel')).toBe('noopener noreferrer')
  expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  expect(fetcher).toHaveBeenCalledTimes(1)
  unmount()
  render(<DailyWeather />)
  expect(screen.getByText(/30°C/)).toBeTruthy()
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
  expect(getCurrentPosition).toHaveBeenCalledTimes(1)
})

it('handles denied permission quietly and leaves the rest of Today usable', async () => {
  const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
    error({ code: 1 } as GeolocationPositionError)
  })
  setGeolocation({ getCurrentPosition } as unknown as Geolocation)
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
  render(<><DailyContext referenceDate={new Date(2026, 8, 18)} /><p>Monthly Spending</p></>)
  expect(screen.getByText('Monthly Spending')).toBeTruthy()
  expect(getCurrentPosition).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Enable weather' }))
  await waitFor(() => expect(screen.getByText('Location access denied.')).toBeTruthy())
  expect(screen.getByText('Monthly Spending')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
})

it('keeps Today usable when the provider fails after location permission', async () => {
  setGeolocation({ getCurrentPosition: (success: PositionCallback) => success({
    coords: { latitude: 3.14, longitude: 101.69 },
  } as GeolocationPosition) } as Geolocation)
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
  render(<><DailyWeather /><p>Monthly Spending</p></>)
  fireEvent.click(screen.getByRole('button', { name: 'Enable weather' }))
  await waitFor(() => expect(screen.getByText('Weather unavailable.')).toBeTruthy())
  expect(screen.getByText('Monthly Spending')).toBeTruthy()
})
