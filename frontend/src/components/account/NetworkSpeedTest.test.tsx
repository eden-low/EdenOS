import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NetworkSpeedTest } from './NetworkSpeedTest'

const mock = vi.hoisted(() => ({ run: vi.fn() }))
vi.mock('../../services/networkSpeedTest', () => ({ runNetworkSpeedTest: mock.run, speedTestDataUsageMb: 14, SpeedTestError: class extends Error {} }))

describe('NetworkSpeedTest', () => {
  afterEach(() => mock.run.mockReset())

  it('does not test in the background and displays supported measurements and data cost', async () => {
    mock.run.mockImplementation(async (_signal: AbortSignal, onResult: (phase: string, value: number) => void) => {
      onResult('latency', 23); onResult('download', 80); onResult('upload', 12)
    })
    render(<NetworkSpeedTest />)
    expect(mock.run).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Network Speed'))
    expect(screen.getByText('14 MB', { exact: false })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start Speed Test' }))
    await waitFor(() => expect(screen.getByText('80.0 Mbps')).toBeTruthy())
    expect(screen.getByText('12.0 Mbps')).toBeTruthy()
    expect(screen.getByText('23.0 ms')).toBeTruthy()
  })

  it('cancels an active test and leaves missing measurements blank', async () => {
    mock.run.mockImplementation((signal: AbortSignal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')))
    }))
    render(<NetworkSpeedTest />)
    fireEvent.click(screen.getByText('Network Speed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start Speed Test' }))
    expect(screen.getAllByText('-- Mbps')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('cancelled'))
    expect(mock.run).toHaveBeenCalledOnce()
  })
})
