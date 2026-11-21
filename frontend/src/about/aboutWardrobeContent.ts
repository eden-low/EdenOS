import type { AvatarId } from '../components/avatar/avatarRegistry'

export interface WardrobeLook {
  id: AvatarId
  english: string
  name: string
  description: string
  // Presentation only. Watching's approved WebP has transparent padding above
  // its landscape pose; this window retains the complete padded illustration.
  window?: { x: number; y: number; width: number; height: number }
}

export const wardrobeLooks = [
  { id: 'eden-default', english: 'Original Eden', name: '日常版', description: '熟悉的黑色上衣、浅色工装裤，还有随身的小猫挂件。小宇宙从这里出发。' },
  { id: 'eden-treasurer', english: 'Treasurer Eden', name: '财务管理员', description: '抱着小算盘，把生活里的小小数字认真收好。' },
  { id: 'eden-archivist', english: 'Archivist Eden', name: '档案管理员', description: '夹板在手，把值得留下的日常一页页整理好。' },
  { id: 'eden-reflector', english: 'Reflector Eden', name: '周记员', description: '翻开手账，拿起笔，给一周留一点安静思考的空间。' },
  { id: 'eden-watching', english: 'Watching Eden', name: '追番版', description: '戴上耳机，趴在软软的靠垫上，和小猫一起走进屏幕里的世界。', window: { x: 0, y: 373, width: 352, height: 283 } },
  { id: 'eden-swim', english: 'Swim Eden', name: '游泳版', description: '泳镜、毛巾和运动装备准备好了，换一个轻盈的节奏。' },
  { id: 'eden-boxing', english: 'Boxing Eden', name: '拳击版', description: '戴好拳套和头带，带着一点认真，也带着一点活力。' },
  { id: 'eden-tarot', english: 'Tarot Eden', name: '星辰占卜师', description: '披上星空斗篷，手里的塔罗牌藏着一个小小的提问。' },
  { id: 'eden-iching', english: 'I Ching Eden', name: '易经卦师', description: '墨绿长袍、玉佩与三枚古钱，陪着好奇心慢慢推敲。' },
  { id: 'eden-bazi', english: 'BaZi Eden', name: '八字书生', description: '展开历法卷轴，在藏蓝与铜金之间，看看时间的纹理。' },
  { id: 'eden-astrology', english: 'Astrology Eden', name: '星空观测者', description: '带上星盘与观测装备，抬头寻找星轨留下的线索。' },
  { id: 'eden-ziwei', english: 'Zi Wei Eden', name: '紫微星官', description: '暗紫衣袍、金色星宿与飘带，收起一片华丽的小星空。' },
  { id: 'eden-ai-explorer', english: 'AI Explorer Eden', name: 'AI 探索者', description: '冰蓝色的全息界面亮起，继续探索技术与想象的边界。' },
] as const satisfies readonly WardrobeLook[]

export const wardrobeContent = {
  id: 'eden-wardrobe', navLabel: '小 Eden 的衣橱',
  eyebrow: "05 / Little Eden's Wardrobe · 小 Eden 的衣橱",
  title: '我的 13 种小宇宙',
  description: '同一个小 Eden，换上不同的服装，陪我探索生活中的不同世界。',
  hint: '轻点小 Eden，发现下一套。也可以直接挑选喜欢的造型。',
  previewNext: '查看下一套服装', previous: '上一套', next: '下一套',
  choices: '选择小 Eden 的服装', selected: '当前选择',
  loading: '正在准备这套服装，暂时展示日常版小 Eden。',
  failed: '这套服装暂时没加载好，先由日常版小 Eden 陪你。恢复网络后会重试，也可以继续选择。',
  originalFailed: '日常版图片暂时未能加载，恢复网络后会重试。你仍可以选择其他服装。',
} as const

export function wardrobeName(look: WardrobeLook) { return `${look.english} · ${look.name}` }
export function wardrobeNumber(index: number) { return `${String(index + 1).padStart(2, '0')} / ${wardrobeLooks.length}` }
