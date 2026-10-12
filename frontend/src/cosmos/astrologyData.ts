export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water'
export type ZodiacModality = 'cardinal' | 'fixed' | 'mutable'
export type ZodiacSignId = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces'
export type PlanetId = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'

export interface ZodiacSign {
  id: ZodiacSignId
  glyph: string
  chinese: string
  english: string
  element: ZodiacElement
  modality: ZodiacModality
  symbolism: string
}

export interface PlanetMeta {
  id: PlanetId
  glyph: string
  chinese: string
  english: string
  symbolism: string
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { id: 'aries', glyph: '♈', chinese: '白羊座', english: 'Aries', element: 'fire', modality: 'cardinal', symbolism: '传统上象征开端、行动与直接表达。' },
  { id: 'taurus', glyph: '♉', chinese: '金牛座', english: 'Taurus', element: 'earth', modality: 'fixed', symbolism: '传统上象征稳定、感官经验与持续投入。' },
  { id: 'gemini', glyph: '♊', chinese: '双子座', english: 'Gemini', element: 'air', modality: 'mutable', symbolism: '传统上象征交流、好奇与观点流动。' },
  { id: 'cancer', glyph: '♋', chinese: '巨蟹座', english: 'Cancer', element: 'water', modality: 'cardinal', symbolism: '传统上象征照护、归属与情感记忆。' },
  { id: 'leo', glyph: '♌', chinese: '狮子座', english: 'Leo', element: 'fire', modality: 'fixed', symbolism: '传统上象征创造、自我表达与温暖。' },
  { id: 'virgo', glyph: '♍', chinese: '处女座', english: 'Virgo', element: 'earth', modality: 'mutable', symbolism: '传统上象征辨析、整理与实际改进。' },
  { id: 'libra', glyph: '♎', chinese: '天秤座', english: 'Libra', element: 'air', modality: 'cardinal', symbolism: '传统上象征关系、平衡与协商。' },
  { id: 'scorpio', glyph: '♏', chinese: '天蝎座', english: 'Scorpio', element: 'water', modality: 'fixed', symbolism: '传统上象征深度、专注与转化。' },
  { id: 'sagittarius', glyph: '♐', chinese: '射手座', english: 'Sagittarius', element: 'fire', modality: 'mutable', symbolism: '传统上象征探索、信念与拓展视野。' },
  { id: 'capricorn', glyph: '♑', chinese: '摩羯座', english: 'Capricorn', element: 'earth', modality: 'cardinal', symbolism: '传统上象征结构、责任与长期建设。' },
  { id: 'aquarius', glyph: '♒', chinese: '水瓶座', english: 'Aquarius', element: 'air', modality: 'fixed', symbolism: '传统上象征群体、独立思考与革新。' },
  { id: 'pisces', glyph: '♓', chinese: '双鱼座', english: 'Pisces', element: 'water', modality: 'mutable', symbolism: '传统上象征想象、共情与边界流动。' },
]

export const PLANETS: PlanetMeta[] = [
  { id: 'sun', glyph: '☉', chinese: '太阳', english: 'Sun', symbolism: '传统上象征核心表达、意志与生命方向。' },
  { id: 'moon', glyph: '☽', chinese: '月亮', english: 'Moon', symbolism: '传统上象征情绪、习惯与内在体验。' },
  { id: 'mercury', glyph: '☿', chinese: '水星', english: 'Mercury', symbolism: '传统上象征思考、语言与信息交换。' },
  { id: 'venus', glyph: '♀', chinese: '金星', english: 'Venus', symbolism: '传统上象征关系方式、审美与价值感。' },
  { id: 'mars', glyph: '♂', chinese: '火星', english: 'Mars', symbolism: '传统上象征行动、动力与界限。' },
  { id: 'jupiter', glyph: '♃', chinese: '木星', english: 'Jupiter', symbolism: '传统上象征扩展、信念与意义。' },
  { id: 'saturn', glyph: '♄', chinese: '土星', english: 'Saturn', symbolism: '传统上象征结构、限制与成熟。' },
  { id: 'uranus', glyph: '♅', chinese: '天王星', english: 'Uranus', symbolism: '现代占星传统中象征突破、独立与变化。' },
  { id: 'neptune', glyph: '♆', chinese: '海王星', english: 'Neptune', symbolism: '现代占星传统中象征想象、理想与模糊边界。' },
  { id: 'pluto', glyph: '♇', chinese: '冥王星', english: 'Pluto', symbolism: '现代占星传统中象征深层转化与集体周期。' },
]

export const HOUSE_MEANINGS = [
  '自我呈现与开始', '资源、价值与拥有', '学习、沟通与近邻', '家庭、根基与私领域',
  '创造、游戏与表达', '日常、技艺与照料', '伙伴关系与协商', '共享资源、亲密与转化',
  '远行、信念与高等学习', '公共角色、方向与责任', '社群、愿景与协作', '退隐、想象与内在整合',
] as const

export const ELEMENT_LABELS: Record<ZodiacElement, { chinese: string; english: string }> = {
  fire: { chinese: '火', english: 'Fire' },
  earth: { chinese: '土', english: 'Earth' },
  air: { chinese: '风', english: 'Air' },
  water: { chinese: '水', english: 'Water' },
}

export const MODALITY_LABELS: Record<ZodiacModality, { chinese: string; english: string }> = {
  cardinal: { chinese: '基本', english: 'Cardinal' },
  fixed: { chinese: '固定', english: 'Fixed' },
  mutable: { chinese: '变动', english: 'Mutable' },
}

export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360
}

export function zodiacForLongitude(longitude: number): { sign: ZodiacSign; degree: number } {
  const normalized = normalizeLongitude(longitude)
  const index = Math.floor(normalized / 30)
  return { sign: ZODIAC_SIGNS[index], degree: normalized - index * 30 }
}

export function planetMeta(id: PlanetId): PlanetMeta {
  const planet = PLANETS.find((item) => item.id === id)
  if (!planet) throw new Error(`Unknown planet: ${id}`)
  return planet
}
