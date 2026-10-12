export type YinYang = 'yang' | 'yin'
export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export interface StemInfo {
  character: HeavenlyStem
  pinyin: string
  yinYang: YinYang
  element: FiveElement
}

export interface BranchInfo {
  character: EarthlyBranch
  pinyin: string
  yinYang: YinYang
  element: FiveElement
}

export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸'
export type EarthlyBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥'
export type TenGod = '比肩' | '劫财' | '食神' | '伤官' | '偏财' | '正财' | '七杀' | '正官' | '偏印' | '正印'

export const ELEMENT_LABELS: Record<FiveElement, { chinese: string; english: string }> = {
  wood: { chinese: '木', english: 'Wood' },
  fire: { chinese: '火', english: 'Fire' },
  earth: { chinese: '土', english: 'Earth' },
  metal: { chinese: '金', english: 'Metal' },
  water: { chinese: '水', english: 'Water' },
}

export const YIN_YANG_LABELS: Record<YinYang, { chinese: string; english: string }> = {
  yang: { chinese: '阳', english: 'Yang' },
  yin: { chinese: '阴', english: 'Yin' },
}

export const HEAVENLY_STEMS: Record<HeavenlyStem, StemInfo> = {
  甲: { character: '甲', pinyin: 'Jiǎ', yinYang: 'yang', element: 'wood' },
  乙: { character: '乙', pinyin: 'Yǐ', yinYang: 'yin', element: 'wood' },
  丙: { character: '丙', pinyin: 'Bǐng', yinYang: 'yang', element: 'fire' },
  丁: { character: '丁', pinyin: 'Dīng', yinYang: 'yin', element: 'fire' },
  戊: { character: '戊', pinyin: 'Wù', yinYang: 'yang', element: 'earth' },
  己: { character: '己', pinyin: 'Jǐ', yinYang: 'yin', element: 'earth' },
  庚: { character: '庚', pinyin: 'Gēng', yinYang: 'yang', element: 'metal' },
  辛: { character: '辛', pinyin: 'Xīn', yinYang: 'yin', element: 'metal' },
  壬: { character: '壬', pinyin: 'Rén', yinYang: 'yang', element: 'water' },
  癸: { character: '癸', pinyin: 'Guǐ', yinYang: 'yin', element: 'water' },
}

export const EARTHLY_BRANCHES: Record<EarthlyBranch, BranchInfo> = {
  子: { character: '子', pinyin: 'Zǐ', yinYang: 'yang', element: 'water' },
  丑: { character: '丑', pinyin: 'Chǒu', yinYang: 'yin', element: 'earth' },
  寅: { character: '寅', pinyin: 'Yín', yinYang: 'yang', element: 'wood' },
  卯: { character: '卯', pinyin: 'Mǎo', yinYang: 'yin', element: 'wood' },
  辰: { character: '辰', pinyin: 'Chén', yinYang: 'yang', element: 'earth' },
  巳: { character: '巳', pinyin: 'Sì', yinYang: 'yin', element: 'fire' },
  午: { character: '午', pinyin: 'Wǔ', yinYang: 'yang', element: 'fire' },
  未: { character: '未', pinyin: 'Wèi', yinYang: 'yin', element: 'earth' },
  申: { character: '申', pinyin: 'Shēn', yinYang: 'yang', element: 'metal' },
  酉: { character: '酉', pinyin: 'Yǒu', yinYang: 'yin', element: 'metal' },
  戌: { character: '戌', pinyin: 'Xū', yinYang: 'yang', element: 'earth' },
  亥: { character: '亥', pinyin: 'Hài', yinYang: 'yin', element: 'water' },
}

export const TEN_GOD_GLOSSARY: Record<TenGod, string> = {
  比肩: '与日主同元素、同阴阳。传统关系分类中的同类。',
  劫财: '与日主同元素、异阴阳。传统关系分类中的同类。',
  食神: '日主所生、同阴阳。传统关系分类中的输出。',
  伤官: '日主所生、异阴阳。传统关系分类中的输出。',
  偏财: '日主所克、同阴阳。传统关系分类中的财星。',
  正财: '日主所克、异阴阳。传统关系分类中的财星。',
  七杀: '克制日主、同阴阳。传统关系分类中的官杀。',
  正官: '克制日主、异阴阳。传统关系分类中的官杀。',
  偏印: '生助日主、同阴阳。传统关系分类中的印星。',
  正印: '生助日主、异阴阳。传统关系分类中的印星。',
}

const ELEMENT_CYCLE: FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water']

export function tenGodFor(dayMaster: HeavenlyStem, target: HeavenlyStem): TenGod {
  const day = HEAVENLY_STEMS[dayMaster]
  const other = HEAVENLY_STEMS[target]
  const dayIndex = ELEMENT_CYCLE.indexOf(day.element)
  const targetIndex = ELEMENT_CYCLE.indexOf(other.element)
  const samePolarity = day.yinYang === other.yinYang

  if (dayIndex === targetIndex) return samePolarity ? '比肩' : '劫财'
  if ((dayIndex + 1) % 5 === targetIndex) return samePolarity ? '食神' : '伤官'
  if ((dayIndex + 2) % 5 === targetIndex) return samePolarity ? '偏财' : '正财'
  if ((targetIndex + 1) % 5 === dayIndex) return samePolarity ? '偏印' : '正印'
  return samePolarity ? '七杀' : '正官'
}

export function isHeavenlyStem(value: string): value is HeavenlyStem {
  return value in HEAVENLY_STEMS
}

export function isEarthlyBranch(value: string): value is EarthlyBranch {
  return value in EARTHLY_BRANCHES
}
