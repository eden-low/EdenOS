import { describe, expect, it } from 'vitest'
import { secureRandomIndex } from './tarotRandom'

function sequenceCrypto(sequence: number[]): Pick<Crypto, 'getRandomValues'> {
  let index = 0
  return { getRandomValues: ((values: Uint32Array) => {
    values[0] = sequence[index++ % sequence.length]
    return values
  }) as Crypto['getRandomValues'] }
}

describe('secure tarot randomness', () => {
  it('uses rejection sampling instead of modulo-biased values', () => {
    const samples = [0xffffffff, 77]
    let calls = 0
    const getRandomValues = ((values: Uint32Array) => {
      values[0] = samples[calls]
      calls += 1
      return values
    }) as unknown as Crypto['getRandomValues']
    expect(secureRandomIndex(78, { getRandomValues })).toBe(77)
    expect(calls).toBe(2)
  })

  it('validates the requested range', () => {
    const source = sequenceCrypto([0])
    expect(() => secureRandomIndex(0, source)).toThrow(RangeError)
    expect(() => secureRandomIndex(0x100000001, source)).toThrow(RangeError)
  })
})
