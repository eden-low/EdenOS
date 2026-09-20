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
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    fireEvent.click(screen.getByRole('button', { name: 'Disable' }))
    fireEvent.change(screen.getByLabelText('Current PIN'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Disable Privacy Lock' }))
    await waitFor(() => expect(disable).toHaveBeenCalledWith('123456'))
  })
})
