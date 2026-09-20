import { describe, expect, it } from 'vitest'
import { contentHash, stableJson } from './stableJson'

describe('stable Anime content hashes', () => {
  it('hashes equivalent objects identically regardless of key order', () => {
    expect(stableJson({ b: 2, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":2}')
    expect(contentHash({ a: 1, b: 2 })).toBe(contentHash({ b: 2, a: 1 }))
  })

  it('changes detail hashes when normalized content changes', () => {
    expect(contentHash({ episodes: [1] })).not.toBe(contentHash({ episodes: [1, 2] }))
  })
})
