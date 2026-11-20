// Editorial content only. Replace the clearly marked biography when Eden supplies it.
export const aboutContent = {
  eyebrow: 'EdenOS 里的一个小角落',
  title: 'About Eden',
  subtitle: 'My Little Universe · 我的小宇宙',
  introduction: '把好奇心、小点子，还有值得留住的日常，慢慢放进这个小宇宙。',
  heroAlt: 'Q 版 Eden：卷发、黑框眼镜，身穿 EdenOS 翼徽黑色上衣与浅色工装裤，背着带小猫挂件的背包。',
  heroCaption: '熟悉的小身影，陪着这个小宇宙慢慢长大。',
  jumpLabel: '和小 Eden 打个招呼',
  sectionNavLabel: '浏览关于 Eden 的内容',
  who: {
    id: 'who-am-i', title: '关于我', eyebrow: '01 / 认识一下',
    greeting: '嗨，我是 Eden。',
    text: '这里放着我关心的事，也留一点空间，慢慢认识 EdenOS 背后的我。',
    placeholderLabel: '个人介绍 · 待 Eden 补充',
    placeholder: '这段介绍先留白，等 Eden 亲自写下自己的故事。',
  },
  story: {
    id: 'edenos-story', title: 'EdenOS 的故事', eyebrow: '02 / 一个小想法',
    paragraphs: [
      'EdenOS 是一个个人操作系统，把收支、运动、影音和日常思考，收进同一个空间。',
      '希望每次打开时，都能轻松找到想看的内容，也遇见一点属于自己的小趣味。',
    ],
    closing: '一个小宇宙，一点一点认真搭起来。',
  },
  interests: {
    id: 'my-interests', title: '我的兴趣', eyebrow: '03 / 小宇宙里的星星',
    description: '这些兴趣，让这个小宇宙多了一点颜色。',
    items: [
      { id: 'development', title: '开发', text: '把小点子变成用得上的小工具。' },
      { id: 'ai', title: 'AI', text: '带着问题，看看技术还能带来什么可能。' },
      { id: 'design', title: '产品设计', text: '让日常操作更顺手，也更舒服一点。' },
      { id: 'swimming', title: '游泳', text: '换个节奏，给身体和心情一点空间。' },
      { id: 'games', title: '游戏', text: '走进不同的世界，也给日常一点玩心。' },
      { id: 'life', title: '生活', text: '那些普通却值得记住的小片刻。' },
    ],
  },
  interactive: {
    id: 'interactive-eden', title: 'Interactive Eden · 互动小 Eden', eyebrow: '04 / 轻轻打个招呼',
    description: '点一下，看看小 Eden 的回应。动作结束后，小 Eden 会自然站好。',
    imageAlt: '可互动的 Q 版 Eden 人物',
    controlsLabel: '小 Eden 的互动动作',
    idle: '小 Eden 安静地站着。可以选择微笑、思考或挥手。',
    paused: '隐私锁或弹窗开启时，人物互动会暂时休息。',
    preparingWave: '小 Eden 正在准备挥手，稍等一下。',
    waveUnavailable: '挥手素材暂时没有加载好，请刷新后再试。微笑和思考仍然可以使用。',
    actions: {
      smile: { label: '微笑', announcement: '小 Eden 微笑着看向你。' },
      think: { label: '思考', announcement: '小 Eden 正托着下巴思考。' },
      wave: { label: '挥手', announcement: '小 Eden 轻轻挥手，跟你打招呼。' },
    },
  },
  footer: '小点子、小日常，再加一点点星光。',
} as const
