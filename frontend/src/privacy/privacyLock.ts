export const privacyLockStorageKey = 'edenos.privacyLock.v1'
export const privacyLockIterations = 210_000
export const privacyAutoLockMs = 5 * 60 * 1000

export interface PrivacyLockRecord {
  version: 1
  kdf: 'PBKDF2-SHA-256'
  iterations: number
  salt: string
  verifier: string
}

function encode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decode(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function isValidPrivacyPin(pin: string): boolean { return /^\d{6}$/.test(pin) }

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, material, 256)
  return new Uint8Array(bits)
}

export async function createPrivacyLockRecord(pin: string): Promise<PrivacyLockRecord> {
  if (!isValidPrivacyPin(pin)) throw new Error('PIN must contain exactly 6 digits.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { version: 1, kdf: 'PBKDF2-SHA-256', iterations: privacyLockIterations, salt: encode(salt), verifier: encode(await derive(pin, salt, privacyLockIterations)) }
}

export async function verifyPrivacyPin(pin: string, record: PrivacyLockRecord): Promise<boolean> {
  if (!isValidPrivacyPin(pin)) return false
  const expected = decode(record.verifier)
  const actual = await derive(pin, decode(record.salt), record.iterations)
  if (actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index]
  return difference === 0
}

export function readPrivacyLockRecord(storage: Pick<Storage, 'getItem'>): PrivacyLockRecord | null {
  try {
    const value: unknown = JSON.parse(storage.getItem(privacyLockStorageKey) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const record = value as Partial<PrivacyLockRecord>
    return record.version === 1 && record.kdf === 'PBKDF2-SHA-256' && Number.isSafeInteger(record.iterations) && (record.iterations ?? 0) >= 100_000 && typeof record.salt === 'string' && typeof record.verifier === 'string' ? record as PrivacyLockRecord : null
  } catch { return null }
}

export function privacyRetryDelayMs(failures: number): number {
  return failures < 3 ? 0 : Math.min(30_000, 2_000 * 2 ** (failures - 3))
}
