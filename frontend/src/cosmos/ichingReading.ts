import { getHexagramByLines, type Hexagram } from './ichingHexagrams'
import { getTrigramByLines, type Trigram, type YinYang } from './ichingTrigrams'
import { isMovingLine, isRelatingYangLine, isYangLine, type IChingLineValue } from './ichingCoins'

export type IChingReading = {
  /** Six line values in bottom-to-top order. */
  lines: readonly IChingLineValue[]
  primaryLines: readonly YinYang[]
  relatingLines: readonly YinYang[]
  primary: Hexagram
  relating: Hexagram
  upperTrigram: Trigram
  lowerTrigram: Trigram
  relatingUpperTrigram: Trigram
  relatingLowerTrigram: Trigram
  movingLines: readonly number[]
}

function toYinYang(value: boolean): YinYang {
  return value ? 1 : 0
}

export function createIChingReading(lines: readonly IChingLineValue[]): IChingReading {
  if (lines.length !== 6) throw new RangeError('An I Ching reading requires exactly six lines')
  if (lines.some((line) => ![6, 7, 8, 9].includes(line))) throw new RangeError('Invalid I Ching line value')

  const primaryLines = lines.map((line) => toYinYang(isYangLine(line)))
  const relatingLines = lines.map((line) => toYinYang(isRelatingYangLine(line)))
  const movingLines = lines.flatMap((line, index) => isMovingLine(line) ? [index + 1] : [])

  return {
    lines: [...lines],
    primaryLines,
    relatingLines,
    primary: getHexagramByLines(primaryLines),
    relating: getHexagramByLines(relatingLines),
    lowerTrigram: getTrigramByLines(primaryLines.slice(0, 3)),
    upperTrigram: getTrigramByLines(primaryLines.slice(3, 6)),
    relatingLowerTrigram: getTrigramByLines(relatingLines.slice(0, 3)),
    relatingUpperTrigram: getTrigramByLines(relatingLines.slice(3, 6)),
    movingLines,
  }
}

export function movingLineLabel(position: number): string {
  if (!Number.isInteger(position) || position < 1 || position > 6) throw new RangeError('Invalid line position')
  return ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][position - 1]
}

export function createIChingReflection(reading: IChingReading): string {
  const primary = `第 ${reading.primary.number} 卦「${reading.primary.fullName}」`
  if (reading.movingLines.length === 0) {
    return `${primary}没有动爻，变卦与本卦相同。可以把《象》的意象作为此刻的反思线索，观察哪些部分值得继续保持与理解。`
  }
  const moving = reading.movingLines.map(movingLineLabel).join('、')
  return `${primary}经${moving}变化为第 ${reading.relating.number} 卦「${reading.relating.fullName}」。可以并置两卦的《象》，思考当前结构与可能变化之间的关系；这是本地生成的反思提示，不保证未来结果。`
}
