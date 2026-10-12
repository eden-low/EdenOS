import { getTrigram, type TrigramId, type YinYang } from './ichingTrigrams'

export type Hexagram = {
  number: number
  name: string
  fullName: string
  englishName: string
  symbol: string
  upper: TrigramId
  lower: TrigramId
  /** A short classical Image reference. See ICHING_DATA_SOURCES.md. */
  reference: string
}

export const hexagrams: readonly Hexagram[] = [
  { number: 1, name: '乾', fullName: '乾为天', englishName: 'The Creative', symbol: '䷀', upper: 'qian', lower: 'qian', reference: '天行健，君子以自强不息。' },
  { number: 2, name: '坤', fullName: '坤为地', englishName: 'The Receptive', symbol: '䷁', upper: 'kun', lower: 'kun', reference: '地势坤，君子以厚德载物。' },
  { number: 3, name: '屯', fullName: '水雷屯', englishName: 'Difficulty at the Beginning', symbol: '䷂', upper: 'kan', lower: 'zhen', reference: '云雷屯，君子以经纶。' },
  { number: 4, name: '蒙', fullName: '山水蒙', englishName: 'Youthful Folly', symbol: '䷃', upper: 'gen', lower: 'kan', reference: '山下出泉，蒙，君子以果行育德。' },
  { number: 5, name: '需', fullName: '水天需', englishName: 'Waiting', symbol: '䷄', upper: 'kan', lower: 'qian', reference: '云上于天，需，君子以饮食宴乐。' },
  { number: 6, name: '讼', fullName: '天水讼', englishName: 'Conflict', symbol: '䷅', upper: 'qian', lower: 'kan', reference: '天与水违行，讼，君子以作事谋始。' },
  { number: 7, name: '师', fullName: '地水师', englishName: 'The Army', symbol: '䷆', upper: 'kun', lower: 'kan', reference: '地中有水，师，君子以容民畜众。' },
  { number: 8, name: '比', fullName: '水地比', englishName: 'Holding Together', symbol: '䷇', upper: 'kan', lower: 'kun', reference: '地上有水，比，先王以建万国亲诸侯。' },
  { number: 9, name: '小畜', fullName: '风天小畜', englishName: 'The Taming Power of the Small', symbol: '䷈', upper: 'xun', lower: 'qian', reference: '风行天上，小畜，君子以懿文德。' },
  { number: 10, name: '履', fullName: '天泽履', englishName: 'Treading', symbol: '䷉', upper: 'qian', lower: 'dui', reference: '上天下泽，履，君子以辨上下定民志。' },
  { number: 11, name: '泰', fullName: '地天泰', englishName: 'Peace', symbol: '䷊', upper: 'kun', lower: 'qian', reference: '天地交，泰，后以财成天地之道，辅相天地之宜，以左右民。' },
  { number: 12, name: '否', fullName: '天地否', englishName: 'Standstill', symbol: '䷋', upper: 'qian', lower: 'kun', reference: '天地不交，否，君子以俭德辟难，不可荣以禄。' },
  { number: 13, name: '同人', fullName: '天火同人', englishName: 'Fellowship with People', symbol: '䷌', upper: 'qian', lower: 'li', reference: '天与火，同人，君子以类族辨物。' },
  { number: 14, name: '大有', fullName: '火天大有', englishName: 'Possession in Great Measure', symbol: '䷍', upper: 'li', lower: 'qian', reference: '火在天上，大有，君子以遏恶扬善，顺天休命。' },
  { number: 15, name: '谦', fullName: '地山谦', englishName: 'Modesty', symbol: '䷎', upper: 'kun', lower: 'gen', reference: '地中有山，谦，君子以裒多益寡，称物平施。' },
  { number: 16, name: '豫', fullName: '雷地豫', englishName: 'Enthusiasm', symbol: '䷏', upper: 'zhen', lower: 'kun', reference: '雷出地奋，豫，先王以作乐崇德，殷荐之上帝，以配祖考。' },
  { number: 17, name: '随', fullName: '泽雷随', englishName: 'Following', symbol: '䷐', upper: 'dui', lower: 'zhen', reference: '泽中有雷，随，君子以向晦入宴息。' },
  { number: 18, name: '蛊', fullName: '山风蛊', englishName: 'Work on What Has Been Spoiled', symbol: '䷑', upper: 'gen', lower: 'xun', reference: '山下有风，蛊，君子以振民育德。' },
  { number: 19, name: '临', fullName: '地泽临', englishName: 'Approach', symbol: '䷒', upper: 'kun', lower: 'dui', reference: '泽上有地，临，君子以教思无穷，容保民无疆。' },
  { number: 20, name: '观', fullName: '风地观', englishName: 'Contemplation', symbol: '䷓', upper: 'xun', lower: 'kun', reference: '风行地上，观，先王以省方观民设教。' },
  { number: 21, name: '噬嗑', fullName: '火雷噬嗑', englishName: 'Biting Through', symbol: '䷔', upper: 'li', lower: 'zhen', reference: '雷电噬嗑，先王以明罚敕法。' },
  { number: 22, name: '贲', fullName: '山火贲', englishName: 'Grace', symbol: '䷕', upper: 'gen', lower: 'li', reference: '山下有火，贲，君子以明庶政，无敢折狱。' },
  { number: 23, name: '剥', fullName: '山地剥', englishName: 'Splitting Apart', symbol: '䷖', upper: 'gen', lower: 'kun', reference: '山附于地，剥，上以厚下安宅。' },
  { number: 24, name: '复', fullName: '地雷复', englishName: 'Return', symbol: '䷗', upper: 'kun', lower: 'zhen', reference: '雷在地中，复，先王以至日闭关，商旅不行，后不省方。' },
  { number: 25, name: '无妄', fullName: '天雷无妄', englishName: 'Innocence', symbol: '䷘', upper: 'qian', lower: 'zhen', reference: '天下雷行，物与无妄，先王以茂对时育万物。' },
  { number: 26, name: '大畜', fullName: '山天大畜', englishName: 'The Taming Power of the Great', symbol: '䷙', upper: 'gen', lower: 'qian', reference: '天在山中，大畜，君子以多识前言往行，以畜其德。' },
  { number: 27, name: '颐', fullName: '山雷颐', englishName: 'Providing Nourishment', symbol: '䷚', upper: 'gen', lower: 'zhen', reference: '山下有雷，颐，君子以慎言语，节饮食。' },
  { number: 28, name: '大过', fullName: '泽风大过', englishName: 'Preponderance of the Great', symbol: '䷛', upper: 'dui', lower: 'xun', reference: '泽灭木，大过，君子以独立不惧，遁世无闷。' },
  { number: 29, name: '坎', fullName: '坎为水', englishName: 'The Abysmal', symbol: '䷜', upper: 'kan', lower: 'kan', reference: '水洊至，习坎，君子以常德行，习教事。' },
  { number: 30, name: '离', fullName: '离为火', englishName: 'The Clinging', symbol: '䷝', upper: 'li', lower: 'li', reference: '明两作，离，大人以继明照于四方。' },
  { number: 31, name: '咸', fullName: '泽山咸', englishName: 'Influence', symbol: '䷞', upper: 'dui', lower: 'gen', reference: '山上有泽，咸，君子以虚受人。' },
  { number: 32, name: '恒', fullName: '雷风恒', englishName: 'Duration', symbol: '䷟', upper: 'zhen', lower: 'xun', reference: '雷风恒，君子以立不易方。' },
  { number: 33, name: '遁', fullName: '天山遁', englishName: 'Retreat', symbol: '䷠', upper: 'qian', lower: 'gen', reference: '天下有山，遁，君子以远小人，不恶而严。' },
  { number: 34, name: '大壮', fullName: '雷天大壮', englishName: 'The Power of the Great', symbol: '䷡', upper: 'zhen', lower: 'qian', reference: '雷在天上，大壮，君子以非礼弗履。' },
  { number: 35, name: '晋', fullName: '火地晋', englishName: 'Progress', symbol: '䷢', upper: 'li', lower: 'kun', reference: '明出地上，晋，君子以自昭明德。' },
  { number: 36, name: '明夷', fullName: '地火明夷', englishName: 'Darkening of the Light', symbol: '䷣', upper: 'kun', lower: 'li', reference: '明入地中，明夷，君子以莅众，用晦而明。' },
  { number: 37, name: '家人', fullName: '风火家人', englishName: 'The Family', symbol: '䷤', upper: 'xun', lower: 'li', reference: '风自火出，家人，君子以言有物而行有恒。' },
  { number: 38, name: '睽', fullName: '火泽睽', englishName: 'Opposition', symbol: '䷥', upper: 'li', lower: 'dui', reference: '上火下泽，睽，君子以同而异。' },
  { number: 39, name: '蹇', fullName: '水山蹇', englishName: 'Obstruction', symbol: '䷦', upper: 'kan', lower: 'gen', reference: '山上有水，蹇，君子以反身修德。' },
  { number: 40, name: '解', fullName: '雷水解', englishName: 'Deliverance', symbol: '䷧', upper: 'zhen', lower: 'kan', reference: '雷雨作，解，君子以赦过宥罪。' },
  { number: 41, name: '损', fullName: '山泽损', englishName: 'Decrease', symbol: '䷨', upper: 'gen', lower: 'dui', reference: '山下有泽，损，君子以惩忿窒欲。' },
  { number: 42, name: '益', fullName: '风雷益', englishName: 'Increase', symbol: '䷩', upper: 'xun', lower: 'zhen', reference: '风雷益，君子以见善则迁，有过则改。' },
  { number: 43, name: '夬', fullName: '泽天夬', englishName: 'Break-through', symbol: '䷪', upper: 'dui', lower: 'qian', reference: '泽上于天，夬，君子以施禄及下，居德则忌。' },
  { number: 44, name: '姤', fullName: '天风姤', englishName: 'Coming to Meet', symbol: '䷫', upper: 'qian', lower: 'xun', reference: '天下有风，姤，后以施命诰四方。' },
  { number: 45, name: '萃', fullName: '泽地萃', englishName: 'Gathering Together', symbol: '䷬', upper: 'dui', lower: 'kun', reference: '泽上于地，萃，君子以除戎器，戒不虞。' },
  { number: 46, name: '升', fullName: '地风升', englishName: 'Pushing Upward', symbol: '䷭', upper: 'kun', lower: 'xun', reference: '地中生木，升，君子以顺德，积小以高大。' },
  { number: 47, name: '困', fullName: '泽水困', englishName: 'Oppression', symbol: '䷮', upper: 'dui', lower: 'kan', reference: '泽无水，困，君子以致命遂志。' },
  { number: 48, name: '井', fullName: '水风井', englishName: 'The Well', symbol: '䷯', upper: 'kan', lower: 'xun', reference: '木上有水，井，君子以劳民劝相。' },
  { number: 49, name: '革', fullName: '泽火革', englishName: 'Revolution', symbol: '䷰', upper: 'dui', lower: 'li', reference: '泽中有火，革，君子以治历明时。' },
  { number: 50, name: '鼎', fullName: '火风鼎', englishName: 'The Caldron', symbol: '䷱', upper: 'li', lower: 'xun', reference: '木上有火，鼎，君子以正位凝命。' },
  { number: 51, name: '震', fullName: '震为雷', englishName: 'The Arousing', symbol: '䷲', upper: 'zhen', lower: 'zhen', reference: '洊雷震，君子以恐惧修省。' },
  { number: 52, name: '艮', fullName: '艮为山', englishName: 'Keeping Still', symbol: '䷳', upper: 'gen', lower: 'gen', reference: '兼山艮，君子以思不出其位。' },
  { number: 53, name: '渐', fullName: '风山渐', englishName: 'Development', symbol: '䷴', upper: 'xun', lower: 'gen', reference: '山上有木，渐，君子以居贤德善俗。' },
  { number: 54, name: '归妹', fullName: '雷泽归妹', englishName: 'The Marrying Maiden', symbol: '䷵', upper: 'zhen', lower: 'dui', reference: '泽上有雷，归妹，君子以永终知敝。' },
  { number: 55, name: '丰', fullName: '雷火丰', englishName: 'Abundance', symbol: '䷶', upper: 'zhen', lower: 'li', reference: '雷电皆至，丰，君子以折狱致刑。' },
  { number: 56, name: '旅', fullName: '火山旅', englishName: 'The Wanderer', symbol: '䷷', upper: 'li', lower: 'gen', reference: '山上有火，旅，君子以明慎用刑而不留狱。' },
  { number: 57, name: '巽', fullName: '巽为风', englishName: 'The Gentle', symbol: '䷸', upper: 'xun', lower: 'xun', reference: '随风巽，君子以申命行事。' },
  { number: 58, name: '兑', fullName: '兑为泽', englishName: 'The Joyous', symbol: '䷹', upper: 'dui', lower: 'dui', reference: '丽泽兑，君子以朋友讲习。' },
  { number: 59, name: '涣', fullName: '风水涣', englishName: 'Dispersion', symbol: '䷺', upper: 'xun', lower: 'kan', reference: '风行水上，涣，先王以享于帝立庙。' },
  { number: 60, name: '节', fullName: '水泽节', englishName: 'Limitation', symbol: '䷻', upper: 'kan', lower: 'dui', reference: '泽上有水，节，君子以制数度，议德行。' },
  { number: 61, name: '中孚', fullName: '风泽中孚', englishName: 'Inner Truth', symbol: '䷼', upper: 'xun', lower: 'dui', reference: '泽上有风，中孚，君子以议狱缓死。' },
  { number: 62, name: '小过', fullName: '雷山小过', englishName: 'Preponderance of the Small', symbol: '䷽', upper: 'zhen', lower: 'gen', reference: '山上有雷，小过，君子以行过乎恭，丧过乎哀，用过乎俭。' },
  { number: 63, name: '既济', fullName: '水火既济', englishName: 'After Completion', symbol: '䷾', upper: 'kan', lower: 'li', reference: '水在火上，既济，君子以思患而豫防之。' },
  { number: 64, name: '未济', fullName: '火水未济', englishName: 'Before Completion', symbol: '䷿', upper: 'li', lower: 'kan', reference: '火在水上，未济，君子以慎辨物居方。' },
]

const hexagramsByPattern = new Map(hexagrams.map((hexagram) => {
  const pattern = [...getTrigram(hexagram.lower).lines, ...getTrigram(hexagram.upper).lines].join('')
  return [pattern, hexagram]
}))

export function getHexagramByLines(lines: readonly YinYang[]): Hexagram {
  if (lines.length !== 6) throw new RangeError('A hexagram requires six lines')
  const hexagram = hexagramsByPattern.get(lines.join(''))
  if (!hexagram) throw new RangeError('Invalid hexagram line pattern')
  return hexagram
}
