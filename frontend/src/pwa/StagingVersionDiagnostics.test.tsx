import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StagingVersionDiagnostics, StagingVersionPanel } from './StagingVersionDiagnostics'

const sha = 'a'.repeat(40), newer = 'b'.repeat(40)
const build = { schema: 1 as const, sha }
const reply = (serverSha = sha) => new Response(JSON.stringify({ schema: 1, sha: serverSha }), { headers: { 'content-type': 'application/json' } })
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('staging diagnostic presentation and interruption safety', () => {
  it('renders nothing in ordinary/local/Production builds', () => {
    const { container } = render(<StagingVersionDiagnostics />)
    expect(container.textContent).toBe('')
  })
  it('always identifies the loaded build and makes no automatic request or storage change', () => {
    const fetcher = vi.fn(), clear = vi.spyOn(Storage.prototype, 'clear'), remove = vi.spyOn(Storage.prototype, 'removeItem')
    vi.stubGlobal('fetch', fetcher)
    render(<StagingVersionPanel build={build} />)
    expect(screen.getByText(sha)).toBeTruthy()
    expect(screen.getByText('Loaded Build SHA')).toBeTruthy()
    expect(screen.queryByText('Server Build SHA')).toBeNull()
    expect(fetcher).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled()
  })
  it.each([sha, newer])('keeps the loaded SHA separate from a checked server SHA: %s', async (serverSha) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(serverSha)))
    render(<StagingVersionPanel build={build} />)
    fireEvent.click(screen.getByRole('button', { name: 'Check server version' }))
    await screen.findByText(serverSha === sha ? 'Loaded build matches the server.' : 'A different build is on the server. This page is still running the loaded build above.')
    expect(screen.getByText('Loaded Build SHA').nextElementSibling?.textContent).toBe(sha)
  })
  it('reports failed server and worker inspection without losing the loaded-build evidence', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Error('synthetic offline')))
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration: vi.fn().mockRejectedValue(Error('synthetic unavailable')) } })
    render(<StagingVersionPanel build={build} />)
    fireEvent.click(screen.getByRole('button', { name: 'Check server version' }))
    await screen.findByText('Could not verify the server build. Your current session is unchanged.')
    expect(screen.getByText('Could not inspect')).toBeTruthy(); expect(screen.getByText(sha)).toBeTruthy()
  })
  it('cannot start a check during an account operation', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    render(<StagingVersionPanel build={build} disabled />)
    const button = screen.getByRole('button', { name: 'Check server version' }) as HTMLButtonElement
    expect(button.disabled).toBe(true); fireEvent.click(button); expect(fetcher).not.toHaveBeenCalled()
  })
  it('does not queue duplicate requests while a check is in progress', async () => {
    let resolve!: (response: Response) => void
    const fetcher = vi.fn(() => new Promise<Response>(done => { resolve = done })); vi.stubGlobal('fetch', fetcher)
    render(<StagingVersionPanel build={build} />)
    fireEvent.click(screen.getByRole('button', { name: 'Check server version' }))
    fireEvent.click(screen.getByRole('button', { name: 'Checking version…' }))
    expect(fetcher).toHaveBeenCalledOnce()
    resolve(reply()); await screen.findByText('Loaded build matches the server.')
  })
  it('aborts and releases its deadline when Account closes, ignoring a late response', async () => {
    vi.useFakeTimers()
    let signal!: AbortSignal, resolve!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn((_url, options) => { signal = options.signal; return new Promise<Response>(done => { resolve = done }) }))
    const view = render(<StagingVersionPanel build={build} />)
    fireEvent.click(screen.getByRole('button', { name: 'Check server version' }))
    view.unmount(); expect(signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0)
    resolve(reply(newer)); await Promise.resolve()
    expect(screen.queryByText(newer)).toBeNull()
  })
  it('times out a stalled network check and permits another manual attempt', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))))
    render(<StagingVersionPanel build={build} />)
    fireEvent.click(screen.getByRole('button', { name: 'Check server version' }))
    await vi.advanceTimersByTimeAsync(8000)
    vi.useRealTimers()
    await waitFor(() => expect((screen.getByRole('button', { name: 'Check server version' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.getByText('Could not verify the server build. Your current session is unchanged.')).toBeTruthy()
  })
})
