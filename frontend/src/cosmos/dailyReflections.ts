export type CosmosDailyReflection = {
  id: string
  text: string
}

export const cosmosDailyReflections: readonly CosmosDailyReflection[] = [
  { id: 'attention', text: '今天，什么最值得你完整地关注一次？' },
  { id: 'enough', text: '如果“足够”已经存在，它会是什么样子？' },
  { id: 'release', text: '有什么可以暂时放下，让今天轻一点？' },
  { id: 'honesty', text: '此刻，你最需要对自己诚实的是什么？' },
  { id: 'choice', text: '今天哪一个小选择最贴近你的价值？' },
  { id: 'pace', text: '怎样的节奏能让你走得稳，也走得远？' },
  { id: 'gratitude', text: '今天有什么平常的小事值得认真感谢？' },
  { id: 'boundary', text: '哪一道温和的界限能保护你的精力？' },
  { id: 'curiosity', text: '如果先不急着判断，你会注意到什么？' },
  { id: 'courage', text: '今天可以用哪一个小行动练习勇气？' },
  { id: 'connection', text: '你想怎样让一段重要的连接更真实？' },
  { id: 'rest', text: '身体正在用什么方式提醒你休息？' },
  { id: 'perspective', text: '换一个角度看，眼前的事还可能意味着什么？' },
  { id: 'kindness', text: '今天，你可以怎样对自己更友善一点？' },
  { id: 'progress', text: '哪一份微小的进展值得被你看见？' },
  { id: 'intention', text: '今天结束时，你希望记得自己怎样度过它？' },
  { id: 'space', text: '哪里需要留一点空白，让答案自然出现？' },
  { id: 'support', text: '有什么支持已经在身边，只等你接受？' },
  { id: 'beginning', text: '如果只迈出第一步，它可以有多简单？' },
  { id: 'alignment', text: '你的时间正在流向真正重要的事吗？' },
  { id: 'listen', text: '安静一分钟后，你最先听见什么需要？' },
  { id: 'change', text: '什么正在改变，而你可以选择与它合作？' },
  { id: 'care', text: '今天哪件事值得你多放一点耐心？' },
  { id: 'clarity', text: '把复杂暂时拿走后，最清楚的事实是什么？' },
]

export function cosmosReflectionForLocalDate(
  date: Date,
  reflections: readonly CosmosDailyReflection[] = cosmosDailyReflections,
): CosmosDailyReflection {
  if (Number.isNaN(date.getTime()) || reflections.length === 0) throw new RangeError('A valid date and reflection set are required')
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  return reflections[((day % reflections.length) + reflections.length) % reflections.length]
}
