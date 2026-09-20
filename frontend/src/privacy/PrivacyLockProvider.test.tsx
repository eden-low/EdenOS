import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrivacyLockProvider } from './PrivacyLockProvider'
import { usePrivacyLock } from './usePrivacyLock'
import * as lockService from './privacyLock'

vi.mock('./privacyLock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./privacyLock')>()
  return { ...actual, readPrivacyLockRecord: vi.fn(), createPrivacyLockRecord: vi.fn(), verifyPrivacyPin: vi.fn() }
})

const record = { version: 1 as const, kdf: 'PBKDF2-SHA-256' as const, iterations: 210000, salt: 'salt', verifier: 'verifier' }

function Harness() {
  const privacy = usePrivacyLock()
  return <><output>{privacy.enabled ? privacy.locked ? 'locked' : 'unlocked' : 'disabled'}</output><button onClick={() => void privacy.setup('123456')}>Setup</button><button onClick={() => void privacy.unlock('123456')}>Unlock</button><button onClick={privacy.lock}>Lock</button></>
}

describe('PrivacyLockProvider', () => {
  beforeEach(() => { localStorage.clear(); vi.mocked(lockService.readPrivacyLockRecord).mockReturnValue(null); vi.mocked(lockService.createPrivacyLockRecord).mockResolvedValue(record); vi.mocked(lockService.verifyPrivacyPin).mockResolvedValue(true) })
  afterEach(() => vi.useRealTimers())

  it('sets up without storing plaintext and supports session lock/unlock', async () => {
    render(<PrivacyLockProvider><Harness /></PrivacyLockProvider>)
    expect(screen.getByText('disabled')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Setup' }))
    await screen.findByText('unlocked')
    expect(localStorage.getItem(lockService.privacyLockStorageKey)).not.toContain('123456')
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }))
    expect(screen.getByText('locked')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    await screen.findByText('unlocked')
  })

  it('starts a fresh session locked when a verifier exists', async () => {
    vi.mocked(lockService.readPrivacyLockRecord).mockReturnValue(record)
    render(<PrivacyLockProvider><Harness /></PrivacyLockProvider>)
    expect(screen.getByText('locked')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    await waitFor(() => expect(screen.getByText('unlocked')).toBeTruthy())
  })

  it('locks after the app returns from an extended background period', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-20T10:00:00Z'))
    vi.mocked(lockService.readPrivacyLockRecord).mockReturnValue(record)
    let visibility: DocumentVisibilityState = 'visible'
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
    render(<PrivacyLockProvider><Harness /></PrivacyLockProvider>)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Unlock' })) })
    expect(screen.getByText('unlocked')).toBeTruthy()
    visibility = 'hidden'; fireEvent(document, new Event('visibilitychange'))
    act(() => vi.advanceTimersByTime(lockService.privacyAutoLockMs + 1))
    visibility = 'visible'; fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByText('locked')).toBeTruthy()
  })
})
