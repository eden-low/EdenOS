import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PrivacyLockContext, unlockedPrivacyLock } from '../../privacy/privacyLockContext'
import { FinancialAmount } from './FinancialAmount'

describe('FinancialAmount', () => {
  it('masks money and requests unlock while leaving unlocked values visible', () => {
    const requestUnlock = vi.fn()
    const { rerender } = render(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, enabled: true, locked: true, requestUnlock }}><FinancialAmount amountSen={1250} /></PrivacyLockContext.Provider>)
    fireEvent.click(screen.getByRole('button', { name: 'Unlock financial value' }))
    expect(requestUnlock).toHaveBeenCalledOnce()
    expect(screen.queryByText('RM 12.50')).toBeNull()
    rerender(<PrivacyLockContext.Provider value={unlockedPrivacyLock}><FinancialAmount amountSen={1250} /></PrivacyLockContext.Provider>)
    expect(screen.getByText('RM 12.50')).toBeTruthy()
  })
})
