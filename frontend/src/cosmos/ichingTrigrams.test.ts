import { describe, expect, it } from 'vitest'
import { getTrigramByLines, trigrams } from './ichingTrigrams'

describe('I Ching trigrams', () => {
  it('contains all eight unique traditional bottom-to-top patterns', () => {
    const expected = {
      qian: '111', dui: '110', li: '101', zhen: '100',
      xun: '011', kan: '010', gen: '001', kun: '000',
    }
    expect(trigrams).toHaveLength(8)
    expect(new Set(trigrams.map((trigram) => trigram.id)).size).toBe(8)
    expect(new Set(trigrams.map((trigram) => trigram.lines.join(''))).size).toBe(8)
    expect(Object.fromEntries(trigrams.map((trigram) => [trigram.id, trigram.lines.join('')]))).toEqual(expected)
  })

  it('resolves a trigram from bottom-to-top lines', () => {
    expect(getTrigramByLines([1, 0, 0]).name).toBe('震')
    expect(getTrigramByLines([0, 0, 1]).name).toBe('艮')
  })
})
