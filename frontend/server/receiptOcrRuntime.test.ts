// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createReceiptOcrRuntime } from './receiptOcrRuntime'

afterEach(() => vi.unstubAllEnvs())

describe('receipt server configuration', () => {
  it('does not start extraction without a server Gemini key', () => {
    vi.stubEnv('EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON', JSON.stringify({
      project_id: 'project', client_email: 'service@example.test', private_key: 'private',
    }))
    vi.stubEnv('GEMINI_API_KEY', '')
    expect(createReceiptOcrRuntime().isConfigured()).toBe(false)
  })

  it('requires Firebase Admin credentials independently of Gemini', () => {
    vi.stubEnv('EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON', '')
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    expect(createReceiptOcrRuntime().isConfigured()).toBe(false)
  })

  it('rejects an unsupported provider setting without selecting another provider', () => {
    vi.stubEnv('EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON', JSON.stringify({
      project_id: 'project', client_email: 'service@example.test', private_key: 'private',
    }))
    vi.stubEnv('GEMINI_API_KEY', 'server-test-key')
    vi.stubEnv('RECEIPT_AI_PROVIDER', 'other')
    expect(createReceiptOcrRuntime().isConfigured()).toBe(false)
  })
})
