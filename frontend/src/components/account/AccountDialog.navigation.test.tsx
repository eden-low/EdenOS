import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountDialog } from './AccountDialog'
import { useFirebaseAuth } from '../../state/useFirebaseAuth'
import { BootAnimationContext } from '../../boot/bootContext'

const mocks = vi.hoisted(() => ({ speed: vi.fn() }))
vi.mock('../../state/useFirebaseAuth', () => ({ useFirebaseAuth: vi.fn() }))
vi.mock('../../services/networkSpeedTest', () => ({ runNetworkSpeedTest: mocks.speed, speedTestDataUsageMb: 14, SpeedTestError: class extends Error {} }))
// Exercise the real staging panel inside Account without enabling it in default builds.
vi.mock('../../pwa/stagingBuildInfo', async (original) => ({ ...await original<object>(), stagingBuildInfo: { schema: 1, sha: 'a'.repeat(40) } }))

const connect = vi.fn(), review = vi.fn(), signOut = vi.fn(), replay = vi.fn(() => true), setEnabled = vi.fn()
function openAccount() {
  render(<BootAnimationContext.Provider value={{ enabled: true, preferenceSaved: true, canReplay: true, replay, setEnabled }}>
    <AccountDialog><button>Open account</button></AccountDialog>
  </BootAnimationContext.Provider>)
  fireEvent.click(screen.getByRole('button', { name: 'Open account' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useFirebaseAuth).mockReturnValue({ uid: 'synthetic-only', isAnonymous: true, email: null,
    connectGoogle: connect, reviewGuestExit: review, signOutGoogle: signOut, discardExistingGoogleChoice: vi.fn(),
  } as unknown as ReturnType<typeof useFirebaseAuth>)
})
afterEach(() => vi.unstubAllGlobals())

describe('Account home and internal tools navigation', () => {
  it('prioritizes account actions and keeps optional tools off the home view', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    openAccount()
    const connectButton = screen.getByRole('button', { name: 'Connect Google account' })
    const theme = screen.getByRole('region', { name: 'Theme' })
    expect(connectButton.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sign Out / Switch Account' }).compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: 'System' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Privacy Lock' })).toBeTruthy()
    expect(screen.queryByText('Network Speed')).toBeNull()
    expect(screen.queryByText('Loaded Build SHA')).toBeNull()
    expect(fetcher).not.toHaveBeenCalled(); expect(mocks.speed).not.toHaveBeenCalled()
  })

  it('uses one dialog, starts tools at the top and restores home scroll and focus on Back', () => {
    openAccount()
    const dialog = screen.getByRole('dialog')
    dialog.scrollTop = 500
    fireEvent.click(screen.getByRole('button', { name: 'Tools & Diagnostics' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Tools & Diagnostics' })).toBe(dialog)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Back to Account' }))
    expect(dialog.scrollTop).toBe(0)
    expect(screen.getByText('Network Speed')).toBeTruthy()
    expect(screen.getByText('Loaded Build SHA')).toBeTruthy()
    expect(mocks.speed).not.toHaveBeenCalled()
    dialog.scrollTop = 300
    fireEvent.click(screen.getByRole('button', { name: 'Back to Account' }))
    expect(dialog.scrollTop).toBe(500)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Tools & Diagnostics' }))
    expect(screen.getByRole('button', { name: 'Sign Out / Switch Account' })).toBeTruthy()
    expect(connect).not.toHaveBeenCalled(); expect(review).not.toHaveBeenCalled(); expect(signOut).not.toHaveBeenCalled()
  })

  it('returns to Account home on reopening and returns focus to the external trigger', async () => {
    openAccount()
    fireEvent.click(screen.getByRole('button', { name: 'Tools & Diagnostics' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open account' }))
    expect(screen.getByRole('dialog', { name: 'Account' })).toBeTruthy()
    expect(screen.queryByText('Network Speed')).toBeNull()
  })

  it('keeps Replay and the animation preference connected to their original controls', () => {
    openAccount()
    fireEvent.click(screen.getByRole('switch', { name: 'Show Boot Animation' }))
    expect(setEnabled).toHaveBeenCalledExactlyOnceWith(false)
    fireEvent.click(screen.getByRole('button', { name: 'Replay Boot Animation' }))
    expect(replay).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each(['back', 'close'] as const)('aborts an explicit speed test on %s, without starting a new one', async (action) => {
    let signal!: AbortSignal
    mocks.speed.mockImplementation((current: AbortSignal) => { signal = current; return new Promise(() => {}) })
    openAccount()
    fireEvent.click(screen.getByRole('button', { name: 'Tools & Diagnostics' }))
    fireEvent.click(screen.getByText('Network Speed'))
    expect(mocks.speed).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Start Speed Test' }))
    expect(signal.aborted).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: action === 'back' ? 'Back to Account' : 'Close dialog' }))
    await waitFor(() => expect(signal.aborted).toBe(true))
    expect(mocks.speed).toHaveBeenCalledOnce()
  })

  it('aborts a manual version check when returning home and ignores its late response', async () => {
    let signal!: AbortSignal, finish!: (value: Response) => void
    const fetcher = vi.fn((_url, options) => { signal = options.signal; return new Promise<Response>(resolve => { finish = resolve }) })
    vi.stubGlobal('fetch', fetcher)
    openAccount()
    fireEvent.click(screen.getByRole('button', { name: 'Tools & Diagnostics' }))
    expect(fetcher).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Check server version' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back to Account' }))
    expect(signal.aborted).toBe(true)
    await act(async () => finish(new Response(JSON.stringify({ schema: 1, sha: 'b'.repeat(40) }), { headers: { 'content-type': 'application/json' } })))
    fireEvent.click(screen.getByRole('button', { name: 'Tools & Diagnostics' }))
    expect(screen.queryByText('Server Build SHA')).toBeNull()
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('keeps PIN setup inside the single Account dialog without changing Guest identity', () => {
    openAccount()
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Account' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel PIN changes' }))
    expect(connect).not.toHaveBeenCalled(); expect(review).not.toHaveBeenCalled(); expect(signOut).not.toHaveBeenCalled()
  })

  it('prevents entry to tools during pending authentication', async () => {
    let finish!: (value: { status: string }) => void
    connect.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    openAccount()
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    expect((screen.getByRole('button', { name: 'Tools & Diagnostics' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Tools & Diagnostics' }))
    expect(screen.getByRole('dialog', { name: 'Account' })).toBeTruthy()
    await act(async () => finish({ status: 'cancelled' }))
    expect(review).not.toHaveBeenCalled(); expect(signOut).not.toHaveBeenCalled()
  })
})
