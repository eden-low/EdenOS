export const ZIWEI_PALACE_NAMES = [
  '命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母',
] as const

export const ZIWEI_MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军',
] as const

export type ZiWeiPalaceName = (typeof ZIWEI_PALACE_NAMES)[number]
export type ZiWeiMajorStarName = (typeof ZIWEI_MAJOR_STARS)[number]
export type ZiWeiTransformation = '禄' | '权' | '科' | '忌'

export const ZIWEI_SUPPORTING_STARS = new Set([
  '左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '天马',
  '擎羊', '陀罗', '火星', '铃星', '地空', '地劫',
])

export const PALACE_PRESENTATION: Record<ZiWeiPalaceName, { label: string; english: string; description: string }> = {
  命宫: { label: '命宫', english: 'Life', description: '传统上作为全盘的起点，象征个人如何展开自身经验。' },
  兄弟: { label: '兄弟宫', english: 'Siblings', description: '象征同辈、手足与合作关系的传统主题。' },
  夫妻: { label: '夫妻宫', english: 'Partnership', description: '象征亲密关系与长期伙伴互动的传统主题。' },
  子女: { label: '子女宫', english: 'Children', description: '象征后辈、照顾、创作与延续的传统主题。' },
  财帛: { label: '财帛宫', english: 'Resources', description: '象征资源取得、使用与价值判断的传统主题。' },
  疾厄: { label: '疾厄宫', english: 'Wellbeing', description: '象征身心照护与生活负荷的传统主题，不构成医疗判断。' },
  迁移: { label: '迁移宫', english: 'Movement', description: '象征外部环境、移动与面对陌生情境的传统主题。' },
  仆役: { label: '交友 / 仆役宫', english: 'Community', description: '象征朋友、同事、团队与社会协作的传统主题。' },
  官禄: { label: '官禄 / 事业宫', english: 'Vocation', description: '象征工作角色、责任与公共参与的传统主题。' },
  田宅: { label: '田宅宫', english: 'Home', description: '象征居所、家庭空间与稳定基础的传统主题。' },
  福德: { label: '福德宫', english: 'Inner life', description: '象征内在休息、精神兴趣与满足感的传统主题。' },
  父母: { label: '父母宫', english: 'Parents', description: '象征长辈、传承与制度支持的传统主题。' },
}

export const MAJOR_STAR_GLOSSARY: Record<ZiWeiMajorStarName, string> = {
  紫微: '象征统筹、秩序与承担核心责任。',
  天机: '象征思考、变化、规划与应变。',
  太阳: '象征照见、表达、参与与公开行动。',
  武曲: '象征执行、资源管理与务实决断。',
  天同: '象征和缓、共享、舒适与感受。',
  廉贞: '象征原则、边界、选择与复杂关系。',
  天府: '象征守成、储备、稳定与协调。',
  太阴: '象征内省、滋养、细致与积累。',
  贪狼: '象征探索、欲望、社交与多样经验。',
  巨门: '象征语言、辨析、质疑与沟通。',
  天相: '象征辅佐、平衡、制度与合作。',
  天梁: '象征照护、原则、经验与保护。',
  七杀: '象征突破、独立、压力下的决断。',
  破军: '象征重整、结束旧结构与开启变化。',
}

export const TRANSFORMATION_GLOSSARY: Record<ZiWeiTransformation, string> = {
  禄: '化禄象征资源流动、吸引与展开。',
  权: '化权象征推动、承担与主导。',
  科: '化科象征整理、表达与被看见。',
  忌: '化忌象征牵挂、阻力与需要持续调整之处。',
}

export const BUREAU_GLOSSARY: Record<string, string> = {
  水二局: '水二局是传统起局分类之一，数字用于排盘步骤与起运序列。',
  木三局: '木三局是传统起局分类之一，数字用于排盘步骤与起运序列。',
  金四局: '金四局是传统起局分类之一，数字用于排盘步骤与起运序列。',
  土五局: '土五局是传统起局分类之一，数字用于排盘步骤与起运序列。',
  火六局: '火六局是传统起局分类之一，数字用于排盘步骤与起运序列。',
}

export const EARTHLY_BRANCH_GRID: Record<string, string> = {
  巳: 'ziwei-si', 午: 'ziwei-wu', 未: 'ziwei-wei', 申: 'ziwei-shen',
  辰: 'ziwei-chen', 酉: 'ziwei-you', 卯: 'ziwei-mao', 戌: 'ziwei-xu',
  寅: 'ziwei-yin', 丑: 'ziwei-chou', 子: 'ziwei-zi', 亥: 'ziwei-hai',
}

export function isZiWeiPalaceName(value: string): value is ZiWeiPalaceName {
  return (ZIWEI_PALACE_NAMES as readonly string[]).includes(value)
}

export function isZiWeiMajorStar(value: string): value is ZiWeiMajorStarName {
  return (ZIWEI_MAJOR_STARS as readonly string[]).includes(value)
}
