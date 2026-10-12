export type YinYang = 0 | 1

export type TrigramId = 'qian' | 'dui' | 'li' | 'zhen' | 'xun' | 'kan' | 'gen' | 'kun'

export type Trigram = {
  id: TrigramId
  name: string
  pinyin: string
  englishName: string
  nature: string
  attribute: string
  symbol: string
  /** Three lines in bottom-to-top order. 1 is yang; 0 is yin. */
  lines: readonly [YinYang, YinYang, YinYang]
}

export const trigrams: readonly Trigram[] = [
  { id: 'qian', name: '乾', pinyin: 'Qián', englishName: 'Heaven', nature: '天', attribute: '健 · Creative strength', symbol: '☰', lines: [1, 1, 1] },
  { id: 'dui', name: '兑', pinyin: 'Duì', englishName: 'Lake', nature: '泽', attribute: '悦 · Joyous openness', symbol: '☱', lines: [1, 1, 0] },
  { id: 'li', name: '离', pinyin: 'Lí', englishName: 'Fire', nature: '火', attribute: '丽 · Clarity', symbol: '☲', lines: [1, 0, 1] },
  { id: 'zhen', name: '震', pinyin: 'Zhèn', englishName: 'Thunder', nature: '雷', attribute: '动 · Arousing movement', symbol: '☳', lines: [1, 0, 0] },
  { id: 'xun', name: '巽', pinyin: 'Xùn', englishName: 'Wind', nature: '风', attribute: '入 · Gentle penetration', symbol: '☴', lines: [0, 1, 1] },
  { id: 'kan', name: '坎', pinyin: 'Kǎn', englishName: 'Water', nature: '水', attribute: '陷 · The Abysmal', symbol: '☵', lines: [0, 1, 0] },
  { id: 'gen', name: '艮', pinyin: 'Gèn', englishName: 'Mountain', nature: '山', attribute: '止 · Keeping still', symbol: '☶', lines: [0, 0, 1] },
  { id: 'kun', name: '坤', pinyin: 'Kūn', englishName: 'Earth', nature: '地', attribute: '顺 · Receptive devotion', symbol: '☷', lines: [0, 0, 0] },
]

const trigramsById = new Map(trigrams.map((trigram) => [trigram.id, trigram]))
const trigramsByPattern = new Map(trigrams.map((trigram) => [trigram.lines.join(''), trigram]))

export function getTrigram(id: TrigramId): Trigram {
  const trigram = trigramsById.get(id)
  if (!trigram) throw new RangeError(`Unknown trigram: ${id}`)
  return trigram
}

export function getTrigramByLines(lines: readonly YinYang[]): Trigram {
  if (lines.length !== 3) throw new RangeError('A trigram requires three lines')
  const trigram = trigramsByPattern.get(lines.join(''))
  if (!trigram) throw new RangeError('Invalid trigram line pattern')
  return trigram
}
