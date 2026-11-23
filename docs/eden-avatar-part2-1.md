# Eden Avatar Part 2.1：About 中文与自然挥手

基线与回退参考：`1cac572d6cc1d7d31800f5d9c9b260cd118b1e82`，
staging Deploy `6afff954cf934dcb486a13ff`。开发、测试在独立工作树完成，
本轮仅更新 staging，不发布 Production，不开始 Part 3。

## About 中文化

文案仍集中在 `frontend/src/about/aboutContent.ts`。介绍、兴趣、按钮、状态、
占位和无障碍描述均使用简体华文。保留 About Eden、My Little Universe、EdenOS、
Interactive Eden；Hero 副标题为「My Little Universe · 我的小宇宙」。
个人介绍明确标为「待 Eden 补充」，没有添加职业、学历、雇主、年龄、地址、
社交账号或经历。兴趣仅使用已确认的六个类别。

`AboutPage` 的局部 `lang="zh-CN"` 帮助 VoiceOver 选择读音，英文品牌标题保留
`lang="en"`。其他页面和导航语言不变，无全站 i18n、语言切换或翻译 API。
五个区域、样式、布局和导航架构保持原样。

## Wave 专用素材及顺序

新增 `frontend/src/about/assets/eden-about-wave-v2.webp`：2048 × 1024，
4 列 × 2 行，299,684 bytes，透明 WebP。内置 ImageGen 以已验收 About 待机人物
作为参考制作；参考原图留在本地，未提交公开仓库。

| Cell（从 0 开始） | 用途 | 姿势 |
| --- | --- | --- |
| 0 | 版面基准 | 保留的已验收待机图；运行时待机继续使用旧图集的 cell 0 |
| 1 | Raise | 手从口袋旁自然离开，位于腰侧 |
| 2 | Raise | 手抬至胸前，上臂贴近身体 |
| 3 | Raise / Wave 静态 / Lower 起点 | 手掌在脸旁，手肘靠近肋部 |
| 4 | Wave 向内 | 手肘基本稳定，前臂和手腕轻轻向内 |
| 5 | Wave 向外 | 同一手肘位置，前臂和手腕轻轻向外 |
| 6 | Lower | 放松手指，手自然降至胸前 |
| 7 | Lower | 手放回腰侧，接回原待机站姿 |

有限序列为：旧 Idle 0 → 新 1 → 2 → 3 → `[4,5] × 3` → 3 → 6 → 7 → 旧 Idle 0。
播放约 1.88 秒，完成后停止。所有 Wave 姿势来自新插画，不使用旧帧旋转、拉伸或
平移来冒充手腕运动。运行时仅切换图集窗口，人物画布位置不动。

资源处理仅作统一尺寸、透明图集打包和固定版面校准：所有新插画共用同一
`(-9,+4)` 像素校准；未逐帧改变身体比例。图集 0 号格来自已有待机图。
自动检查每格透明边距，头发与鞋底锚点的漂移为少数像素，防止跳动或裁切。
主观动作自然度仍由 Eden 实机复测。

旧 `eden-about-gestures.webp`、Hero 和 Today 素材保持原文件不变；Smile 仍为
`1,4,1`（每帧 450ms），Think 仍为 `2,5,2`（每帧 650ms）。

## 状态与安全

`aboutAvatarMachine.ts` 保存 Raise/Wave/Lower 的帧和阶段；原 run token
继续拒绝过期帧/结束回调。快速点击会安全重启，弹窗、隐私锁、隐藏页面和离开页面
会中断。Reduced Motion 只显示新 cell 3 一秒，然后回到原待机，不连续播放抬手。

新 Wave 图预加载并等待就绪：冷加载时先保留原待机，资源完成后才开始完整序列，
不因加载延迟跳过抬手。加载失败有中文反馈，Smile/Think 仍可用。Wave 的加载状态
不会重新启动 Smile/Think 的计时器。

Today Avatar、Capture 的运行代码与安全机制未修改；没有改财务逻辑、Firebase、
Genesis Boot 或 Netlify 配置。现有 `eden-about-*.webp` 缓存规则已覆盖新图，不需改
PWA 激活或更新策略。Firebase parity 未实际验证，也没有修改环境值。

## 自动验证

```powershell
# frontend 目录
npm test
npx --no-install tsc -b
npm run lint
npm run build
npm run dev -- --host 127.0.0.1 --port 5181 --strictPort
# 构建结束后，在另一个终端依次运行：
node scripts/aboutBrowserValidation.mjs
node scripts/avatarBrowserValidation.mjs
node scripts/aboutPwaValidation.mjs
# staging Ready 后：
node scripts/aboutStagingValidation.mjs <完整 SHA>
```

覆盖中文文案/ARIA、动作阶段及恢复、冷加载、过期计时器、Reduced Motion、弹窗、
隐私锁、Genesis、Guest/Auth 隔离、320/390/844/1440px、200% 文字、键盘和历史导航。
`aboutWaveAssets.test.ts` 检查图集尺寸、透明边距和稳定锚点。

浏览器与 PWA 检查使用新的隔离 Chrome profile。`aboutPwaValidation.mjs` 仅在
Git 忽略的 artifacts 目录构建一个生产模式 PWA，使用内存中的合成已登录上下文、
真实 App/PwaProvider 和真实 Service Worker，验证离线刷新、中文页面及完整挥手。
该 fixture 不会部署，不创建真实 Auth 用户，也不执行真实登录、登出或数据写入。
账号/财务写入方法会抛错，Firebase 和付费 Functions 流量被阻断。

正式 staging 检查保持真实登录保护：验证构建 SHA、八条路径、素材校验和、
Service Worker 与三份 About 图片缓存、离线深链接保护，以及五个 Functions 的
未登录拒绝。真实已登录 iPhone/PWA 的体验仍需人工确认。

本地结果：完整 Vitest **182 个文件 / 1,371 项通过**；TypeScript、Lint、正式构建
及五个 Functions 打包通过。保留原有大分块构建提示，无新增 lint 警告。
About 浏览器阶段追踪、中文/键盘/响应式、Today/Capture 回归，以及合成已登录
生产模式 PWA 离线刷新与完整 Wave 均通过。PWA 实际缓存 37 项，包含新 Wave 图。

## 人工复测

- iPhone Safari：首次进入即点击挥手、完整抬手/小幅轻挥/收手、连续点击；检查
  手指、上臂/手肘、身体、脸和鞋子是否稳定，头像是否裁切；再验证微笑、思考。
- Safari 文字与导航：320/390px、横屏、200% 文字、VoiceOver 中文按钮/状态，
  直接访问、前进/返回、弹窗和 Privacy Lock。
- 安装版 PWA：正常更新后冷启动，在安全的已有登录会话中验证 About 刷新、
  离线文字/新挥手素材与完整动作；不需要确认财务记录或执行 Guest 登出。
- 桌面：键盘 Tab/Enter/Space、焦点、Reduced Motion、主题与三个动作。
- Today/Capture：正常滚动只站立或隐藏；两个入口仍能趴边，关闭恢复站姿。

## ImageGen 提示词

Edit/generate a production Wave animation sprite atlas from the supplied APPROVED
idle character. This is frame-by-frame animation, not a collection of new poses.
Primary image is the exact accepted About Eden idle body and proportions.
Preserve its curly hair, face, glasses, small WHITE/BLUE EDENOS WING emblem, black
T-shirt, necklace, light cargo trousers, black shoes, backpack and cat charm.
Transparent background. ONE 4-column by 2-row atlas of EIGHT equal square cells,
ideally 2048x1024, each512x512. LOCK the full body, hair, facial features, torso,
bag, legs and both feet to the SAME PIXEL POSITION in ALL cells. Feet bottom at
local y500, hair top near y12, same reference full-body scale and centered body.
Keep facial expression the same calm small smile. Only the character's RIGHT arm
(viewer LEFT) moves, with anatomically natural fingers. Other hand stays in its
original pocket. No camera shifts, no head tilt, no body swaying, no clothing
morphing. Every cell has 24px+ transparent margin around the whole silhouette
including fingertips. TOP ROW: cell0 exact idle reference with arm resting near
pocket; cell1 EARLY RAISE hand just out of pocket, relaxed fingers at waist level
and upper arm close to torso; cell2 MID RAISE hand traveling naturally up in front
of chest, elbow stays near lower ribs and upper arm points mostly downward;
cell3 READY WAVE hand near lower cheek, palm toward viewer, elbow bent and
anchored near the ribs, compact friendly greeting. BOTTOM ROW: cell4 SMALL WAVE
IN, same elbow/upper-arm location as cell3, wrist/forearm turns inward only
slightly (about 7 degrees), fingertips stay near cheek; cell5 SMALL WAVE OUT,
same anchored elbow/upper arm, wrist/forearm turns outward only slightly
(about 7 degrees), fingertip/hand-center difference between cells4 and5 less
than 20 pixels, NEVER stretch arm sideways; cell6 MID LOWER hand calmly
descending in front of chest, naturally relaxed fingers; cell7 LATE LOWER hand
near original pocket/hip before settling to idle. The raise and lower are
clearly distinct transitional illustrations. Wave cells3/4/5 have nearly
IDENTICAL silhouette except subtle actual illustrated wrist/forearm movement,
never a whole arm sweep, and never an arm extended horizontally. Preserve clean
detailed anime/chibi shading and EXACT accepted proportions. No triangles,
no explorer clothing, no drawn panel or objects, no text, no labels, no grid
lines, no floor or background, no cropped fingers or feet. All frames must be
precisely registered so the character does not jump during animation.
