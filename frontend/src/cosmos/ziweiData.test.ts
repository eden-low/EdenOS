import { describe, expect, it } from 'vitest'
import { BUREAU_GLOSSARY, MAJOR_STAR_GLOSSARY, PALACE_PRESENTATION, TRANSFORMATION_GLOSSARY, ZIWEI_MAJOR_STARS, ZIWEI_PALACE_NAMES } from './ziweiData'

describe('Zi Wei local reference data', () => {
  it('contains all twelve unique palaces and fourteen unique major stars', () => {
    expect(ZIWEI_PALACE_NAMES).toHaveLength(12)
    expect(new Set(ZIWEI_PALACE_NAMES).size).toBe(12)
    expect(ZIWEI_MAJOR_STARS).toHaveLength(14)
    expect(new Set(ZIWEI_MAJOR_STARS).size).toBe(14)
  })

  it('has a concise local explanation for every displayed term', () => {
    for (const palace of ZIWEI_PALACE_NAMES) expect(PALACE_PRESENTATION[palace].description.length).toBeGreaterThan(12)
    for (const star of ZIWEI_MAJOR_STARS) expect(MAJOR_STAR_GLOSSARY[star].length).toBeGreaterThan(10)
    expect(Object.keys(TRANSFORMATION_GLOSSARY).sort()).toEqual(['忌', '权', '科', '禄'].sort())
    expect(Object.keys(BUREAU_GLOSSARY).sort()).toEqual(['土五局', '木三局', '水二局', '火六局', '金四局'].sort())
  })
})
