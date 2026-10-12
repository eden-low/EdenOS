export type CryptoRandomSource = Pick<Crypto, 'getRandomValues'>
export type RandomIndex = (exclusiveMaximum: number) => number

export function secureRandomIndex(length: number, cryptoSource: CryptoRandomSource): number {
  if (!Number.isSafeInteger(length) || length < 1 || length > 0x100000000) throw new RangeError('Invalid random range')
  const range = 0x100000000
  const ceiling = range - (range % length)
  const values = new Uint32Array(1)
  do { cryptoSource.getRandomValues(values) } while (values[0] >= ceiling)
  return values[0] % length
}

export const browserRandomIndex: RandomIndex = (length) => {
  const cryptoSource = typeof globalThis.crypto === 'undefined' ? null : globalThis.crypto
  if (cryptoSource) return secureRandomIndex(length, cryptoSource)
  if (!Number.isSafeInteger(length) || length < 1) throw new RangeError('Invalid random range')
  return Math.floor(Math.random() * length)
}
