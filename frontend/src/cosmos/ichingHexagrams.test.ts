import { describe, expect, it } from 'vitest'
import { getHexagramByLines, hexagrams } from './ichingHexagrams'
import { getTrigram } from './ichingTrigrams'

describe('King Wen hexagram data', () => {
  it('contains 64 unique numbers and every upper/lower trigram combination', () => {
    expect(hexagrams).toHaveLength(64)
    expect(new Set(hexagrams.map((hexagram) => hexagram.number)).size).toBe(64)
    expect(new Set(hexagrams.map((hexagram) => `${hexagram.upper}/${hexagram.lower}`)).size).toBe(64)
    expect(hexagrams.map((hexagram) => hexagram.number)).toEqual(Array.from({ length: 64 }, (_, index) => index + 1))
    for (const hexagram of hexagrams) {
      expect(hexagram.name.length).toBeGreaterThan(0)
      expect(hexagram.reference.length).toBeGreaterThan(5)
      const lines = [...getTrigram(hexagram.lower).lines, ...getTrigram(hexagram.upper).lines]
      expect(getHexagramByLines(lines)).toBe(hexagram)
    }
  })

  it.each([
    [[1, 1, 1, 1, 1, 1], 1, '乾'],
    [[0, 0, 0, 0, 0, 0], 2, '坤'],
    [[1, 1, 1, 0, 0, 0], 11, '泰'],
    [[0, 0, 0, 1, 1, 1], 12, '否'],
    [[1, 0, 1, 0, 1, 0], 63, '既济'],
    [[0, 1, 0, 1, 0, 1], 64, '未济'],
  ] as const)('maps independent reference pattern %j to King Wen #%i %s', (lines, number, name) => {
    expect(getHexagramByLines(lines)).toMatchObject({ number, name })
  })
})
