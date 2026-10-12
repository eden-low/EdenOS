import type { TarotSelection } from './tarotSelection'

function selectionName(selection: TarotSelection): string {
  return `「${selection.card.name} · ${selection.orientation === 'upright' ? '正位' : '逆位'}」`
}

export function combinedTarotReflection(selections: readonly TarotSelection[]): string {
  if (selections.length !== 3) throw new RangeError('A three-card reflection requires three selections')
  const [past, present, future] = selections.map(selectionName)
  return `从过去的${past}，来到现在的${present}，再望向发展方向的${future}：可以把这组三张牌看作一条反思线索，回看已形成的经验，辨认此刻需要回应的主题，并思考下一步愿意如何行动。它呈现象征关系，不保证未来结果。`
}
