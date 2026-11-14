import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PrivacyLockContext, unlockedPrivacyLock } from '../../privacy/privacyLockContext'
import { PrivacyLockSettings } from './PrivacyLockSettings'

describe('PrivacyLockSettings', () => {
  it('requires a matching six-digit confirmation before setup', async () => {
    const setup = vi.fn(async () => undefined)
    render(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, setup }}><PrivacyLockSettings /></PrivacyLockContext.Provider>)
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }))
    fireEvent.change(screen.getByLabelText('New 6-digit PIN'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('Confirm PIN'), { target: { value: '654321' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enable Privacy Lock' }))
    expect(screen.getByRole('alert').textContent).toContain('does not match')
    expect(setup).not.toHaveBeenCalled()
  })

  it('requires the current PIN to change or disable the local verifier', async () => {
    const changePin = vi.fn(async () => false)
    const disable = vi.fn(async () => true)
    const value = { ...unlockedPrivacyLock, enabled: true, changePin, disable }
    render(<PrivacyLockContext.Provider value={value}><PrivacyLockSettings /></PrivacyLockContext.Provider>)
    fireEvent.click(screen.getByRole('button', { name: 'Change PIN' }))
    fireEvent.change(screen.getByLabelText('Current PIN'), { target: { value: '000000' } })
    fireEvent.change(screen.getByLabelText('New 6-digit PIN'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('Confirm PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save new PIN' }))
    await waitFor(() => expect(changePin).toHaveBeenCalledWith('000000', '123456'))
    expect(screen.getByRole('alert').textContent).toContain('incorrect')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel PIN changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))
    fireEvent.change(screen.getByLabelText('Current PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Disable Privacy Lock' }))
    await waitFor(() => expect(disable).toHaveBeenCalledWith('123456'))
  })

  it('edits inline, focuses the PIN and clears cancelled input without changing protection', () => {
    const setup = vi.fn()
    render(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, setup }}><PrivacyLockSettings /></PrivacyLockContext.Provider>)
    const enable = screen.getByRole('button', { name: 'Enable' })
    enable.focus()
    fireEvent.click(enable)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByLabelText('New 6-digit PIN'))
    fireEvent.change(screen.getByLabelText('New 6-digit PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel PIN changes' }))
    expect(document.activeElement).toBe(enable)
    fireEvent.click(enable)
    expect((screen.getByLabelText('New 6-digit PIN') as HTMLInputElement).value).toBe('')
    expect(setup).not.toHaveBeenCalled()
  })

  it('unlocks inline through the existing verifier without opening the global dialog', async () => {
    const unlock = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true), requestUnlock = vi.fn()
    render(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, enabled: true, locked: true, unlock, requestUnlock }}><PrivacyLockSettings /></PrivacyLockContext.Provider>)
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByLabelText('Current PIN'))
    expect((screen.getByRole('button', { name: 'Unlock' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Current PIN'), { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    await screen.findByText('That PIN is incorrect.')
    fireEvent.change(screen.getByLabelText('Current PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    await waitFor(() => expect(screen.queryByLabelText('Current PIN')).toBeNull())
    expect(unlock).toHaveBeenNthCalledWith(1, '000000')
    expect(unlock).toHaveBeenNthCalledWith(2, '123456')
    expect(requestUnlock).not.toHaveBeenCalled()
  })

  it('preserves the existing unlock retry deadline', async () => {
    const unlock = vi.fn()
    render(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, enabled: true, locked: true, retryAt: Date.now() + 60_000, unlock }}><PrivacyLockSettings /></PrivacyLockContext.Provider>)
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    fireEvent.change(screen.getByLabelText('Current PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    await screen.findByText('Please wait briefly before trying again.')
    expect(unlock).not.toHaveBeenCalled()
  })
})
