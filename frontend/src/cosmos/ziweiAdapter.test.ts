import { describe, expect, it } from 'vitest'
import { calculateZiWei, ZIWEI_CONVENTIONS, ZIWEI_ENGINE_VERSION, ZIWEI_FIX_LEAP, type ZiWeiTraditionalGender } from './ziweiAdapter'
import { ZIWEI_MAJOR_STARS, ZIWEI_PALACE_NAMES } from './ziweiData'

const latestDate = '2026-10-13'

function chart(date = '1990-06-15', time = '09:30', gender: ZiWeiTraditionalGender = '男') {
  return calculateZiWei({ date, time, gender }, latestDate)
}

describe('iztro Zi Wei adapter', () => {
  it('pins the documented default-school calculation conventions', () => {
    expect(ZIWEI_ENGINE_VERSION).toBe('2.6.2')
    expect(ZIWEI_FIX_LEAP).toBe(true)
    expect(ZIWEI_CONVENTIONS).toEqual({ yearDivide: 'normal', dayDivide: 'forward', algorithm: 'default' })
  })

  it('normalizes exactly twelve palaces and all fourteen major stars once', () => {
    const result = chart()
    expect(result.palaces).toHaveLength(12)
    expect(new Set(result.palaces.map(({ name }) => name))).toEqual(new Set(ZIWEI_PALACE_NAMES))
    expect(new Set(result.palaces.map(({ earthlyBranch }) => earthlyBranch)).size).toBe(12)
    const stars = result.palaces.flatMap(({ majorStars }) => majorStars.map(({ name }) => name))
    expect(stars).toHaveLength(14)
    expect(new Set(stars)).toEqual(new Set(ZIWEI_MAJOR_STARS))
  })

  it('matches the independently recounted 1990-06-15 Si-hour reference chart', () => {
    const result = chart()
    expect(result.lunarDate).toBe('一九九〇年五月廿三')
    expect(result.chineseDate).toBe('庚午 壬午 辛亥 癸巳')
    expect(result.lifePalaceBranch).toBe('丑')
    expect(result.bodyPalaceBranch).toBe('亥')
    expect(result.fiveElementsBureau).toBe('火六局')
    expect(result.palaces.map(({ heavenlyStem, earthlyBranch, name, majorStars, isBodyPalace }) => ({
      stemBranch: `${heavenlyStem}${earthlyBranch}`,
      name,
      stars: majorStars.map(({ name: star }) => star),
      body: isBodyPalace,
    }))).toEqual([
      { stemBranch: '戊寅', name: '父母', stars: ['贪狼'], body: false },
      { stemBranch: '己卯', name: '福德', stars: ['天机', '巨门'], body: false },
      { stemBranch: '庚辰', name: '田宅', stars: ['紫微', '天相'], body: false },
      { stemBranch: '辛巳', name: '官禄', stars: ['天梁'], body: false },
      { stemBranch: '壬午', name: '仆役', stars: ['七杀'], body: false },
      { stemBranch: '癸未', name: '迁移', stars: [], body: false },
      { stemBranch: '甲申', name: '疾厄', stars: ['廉贞'], body: false },
      { stemBranch: '乙酉', name: '财帛', stars: [], body: false },
      { stemBranch: '丙戌', name: '子女', stars: ['破军'], body: false },
      { stemBranch: '丁亥', name: '夫妻', stars: ['天同'], body: true },
      { stemBranch: '戊子', name: '兄弟', stars: ['武曲', '天府'], body: false },
      { stemBranch: '己丑', name: '命宫', stars: ['太阳', '太阴'], body: false },
    ])
    expect(result.transformations.map(({ star, transformation, palace }) => `${star}化${transformation}@${palace}`).sort()).toEqual([
      '太阳化禄@命宫', '武曲化权@兄弟', '太阴化科@命宫', '天同化忌@夫妻',
    ].sort())
  })

  it('matches the published 2000-08-16 female Yin-hour example', () => {
    const result = chart('2000-08-16', '03:30', '女')
    expect(result.lunarDate).toBe('二〇〇〇年七月十七')
    expect(result.lifePalaceBranch).toBe('午')
    expect(result.bodyPalaceBranch).toBe('戌')
    expect(result.soulMaster).toBe('破军')
    expect(result.bodyMaster).toBe('文昌')
    expect(result.fiveElementsBureau).toBe('木三局')
    expect(result.palaces.find(({ name }) => name === '命宫')?.majorStars.map(({ name }) => name)).toEqual(['紫微'])
  })

  it('uses the traditional birth-year Four Transformations table for all ten stems', () => {
    const expectations: [string, string[]][] = [
      ['1984-02-10', ['廉贞禄', '破军权', '武曲科', '太阳忌']],
      ['1985-02-20', ['天机禄', '天梁权', '紫微科', '太阴忌']],
      ['1986-02-20', ['天同禄', '天机权', '文昌科', '廉贞忌']],
      ['1987-02-20', ['太阴禄', '天同权', '天机科', '巨门忌']],
      ['1988-02-20', ['贪狼禄', '太阴权', '右弼科', '天机忌']],
      ['1989-02-20', ['武曲禄', '贪狼权', '天梁科', '文曲忌']],
      ['1990-02-20', ['太阳禄', '武曲权', '太阴科', '天同忌']],
      ['1991-02-20', ['巨门禄', '太阳权', '文曲科', '文昌忌']],
      ['1992-02-20', ['天梁禄', '紫微权', '左辅科', '武曲忌']],
      ['1993-02-20', ['破军禄', '巨门权', '太阴科', '贪狼忌']],
    ]
    for (const [date, expected] of expectations) {
      const actual = chart(date, '12:00').transformations.map(({ star, transformation }) => `${star}${transformation}`)
      expect(actual.sort(), date).toEqual(expected.sort())
    }
  })

  it('keeps early and late Zi hour distinct and applies the forward late-Zi day rule', () => {
    const early = chart('1984-02-02', '00:30')
    const late = chart('1984-02-02', '23:30')
    expect(early.timeIndex).toBe(0)
    expect(late.timeIndex).toBe(12)
    expect(early.timeLabel).toContain('早子时')
    expect(late.timeLabel).toContain('晚子时')
    expect(early.chineseDate).not.toBe(late.chineseDate)
  })

  it('converts solar dates across the verified 2020 leap-fourth-month boundary', () => {
    const firstHalf = chart('2020-05-23', '00:30', '女')
    const secondHalf = chart('2020-06-10', '21:30', '男')
    expect(firstHalf.lunarDate).toContain('闰四月初一')
    expect(secondHalf.lunarDate).toContain('闰四月十九')
    expect(firstHalf.lifePalaceBranch).toBe('巳')
    expect(secondHalf.lifePalaceBranch).toBe('未')
  })

  it('rejects unsupported dates, impossible dates, invalid times, and a missing traditional option', () => {
    expect(() => chart('1969-12-31')).toThrow('1970-01-01')
    expect(() => chart('2023-02-29')).toThrow('有效')
    expect(() => chart('2027-01-01')).toThrow('不能晚于今天')
    expect(() => chart('2000-01-01', '24:00')).toThrow('有效')
    expect(() => calculateZiWei({ date: '2000-01-01', time: '12:00', gender: '' as ZiWeiTraditionalGender }, latestDate)).toThrow('男盘或女盘')
  })
})
