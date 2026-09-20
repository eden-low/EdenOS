import { describe, expect, it } from 'vitest'
import { createPrivacyLockRecord, isValidPrivacyPin, privacyRetryDelayMs, verifyPrivacyPin } from './privacyLock'

describe('privacy lock verifier', () => {
  it('accepts exactly six digits and stores a salted verifier without plaintext', async () => {
    expect(isValidPrivacyPin('123456')).toBe(true)
    expect(isValidPrivacyPin('12345')).toBe(false)
    expect(isValidPrivacyPin('12345a')).toBe(false)
    const record = await createPrivacyLockRecord('123456')
    expect(JSON.stringify(record)).not.toContain('123456')
    expect(record.kdf).toBe('PBKDF2-SHA-256')
    expect(record.iterations).toBeGreaterThanOrEqual(200_000)
    expect(await verifyPrivacyPin('123456', record)).toBe(true)
    expect(await verifyPrivacyPin('654321', record)).toBe(false)
  })

  it('adds a bounded increasing delay after repeated failures', () => {
    expect(privacyRetryDelayMs(2)).toBe(0)
    expect(privacyRetryDelayMs(3)).toBeGreaterThan(0)
    expect(privacyRetryDelayMs(20)).toBeLessThanOrEqual(30_000)
  })
})
