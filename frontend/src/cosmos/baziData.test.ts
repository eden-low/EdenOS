import { describe, expect, it } from 'vitest'
import { EARTHLY_BRANCHES, HEAVENLY_STEMS, tenGodFor } from './baziData'

describe('BaZi stem, branch, and Ten Gods data', () => {
  it('enumerates all ten Heavenly Stems with correct yin/yang and element pairs', () => {
    expect(Object.keys(HEAVENLY_STEMS)).toEqual(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'])
    expect(Object.values(HEAVENLY_STEMS).map(({ yinYang, element }) => `${yinYang}:${element}`)).toEqual([
      'yang:wood', 'yin:wood', 'yang:fire', 'yin:fire', 'yang:earth',
      'yin:earth', 'yang:metal', 'yin:metal', 'yang:water', 'yin:water',
    ])
  })

  it('enumerates all twelve Earthly Branches with traditional polarity and visible element', () => {
    expect(Object.keys(EARTHLY_BRANCHES)).toEqual(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'])
    expect(Object.values(EARTHLY_BRANCHES).map(({ yinYang, element }) => `${yinYang}:${element}`)).toEqual([
      'yang:water', 'yin:earth', 'yang:wood', 'yin:wood', 'yang:earth', 'yin:fire',
      'yang:fire', 'yin:earth', 'yang:metal', 'yin:metal', 'yang:earth', 'yin:water',
    ])
  })

  it('derives every Ten God for a Yang Wood Day Master by element relationship and polarity', () => {
    expect(Object.keys(HEAVENLY_STEMS).map((stem) => tenGodFor('甲', stem as keyof typeof HEAVENLY_STEMS))).toEqual([
      '比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印',
    ])
  })

  it('reverses direct/indirect polarity correctly for a Yin Day Master', () => {
    expect(tenGodFor('乙', '乙')).toBe('比肩')
    expect(tenGodFor('乙', '甲')).toBe('劫财')
    expect(tenGodFor('乙', '丁')).toBe('食神')
    expect(tenGodFor('乙', '丙')).toBe('伤官')
    expect(tenGodFor('乙', '己')).toBe('偏财')
    expect(tenGodFor('乙', '戊')).toBe('正财')
    expect(tenGodFor('乙', '辛')).toBe('七杀')
    expect(tenGodFor('乙', '庚')).toBe('正官')
    expect(tenGodFor('乙', '癸')).toBe('偏印')
    expect(tenGodFor('乙', '壬')).toBe('正印')
  })
})
