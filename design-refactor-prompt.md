# 任务:Hermes CMS 前端视觉升级(Raycast 式克制高级感)

## 项目背景

这是一个获客 + 邮件外发/回复追踪的 CMS(React 19 + Vite + TypeScript + styled-components v6,无 Tailwind、无 UI 库、无图表库,图表全部是手写 SVG)。已有完整的 ThemeProvider token 体系和暗色模式。目标是向 Raycast 那种"中性底色 + 单一主题色 + 玻璃质感"的克制高级感靠拢,**但这是给人日常用的后台,可读性和效率优先,不做为了高级而高级的炫技**。

## 关键文件

- `src/styles/theme.ts` — lightTheme / darkTheme,唯一应有的颜色字典
- `src/styles/GlobalStyles.ts` — 全局样式 + `:root` CSS 变量(与 theme.ts 冲突,见问题 1)
- `src/types/theme.ts`、`src/styles/styled.d.ts` — theme 类型
- `src/pages/Dashboard/index.tsx`(957 行)— KPI 卡、手写 SVG 柱状图(~L184)、环状图(L280)、ActionCard 渐变卡片
- `src/components/StatusBadge/index.tsx` — 自带一套硬编码状态色 `statusFgMap`
- `src/components/KPICard/index.tsx`、`Sidebar/index.tsx`、`Topbar/index.tsx`
- `src/layouts/AppLayout.tsx` — 主区域有彩色对角渐变背景
- `index.html` — Google Fonts 加载(Bebas Neue、Noto Sans TC、Press Start 2P)
- `src/index.css`、`src/App.css` — Vite 模板残留(紫色 `--accent:#aa3bff`),与真实 UI 无关,可清理

## 当前问题(按优先级)

1. **两套冲突的颜色源**。`theme.ts` 的中性色是绿调的(canvas `#f4f7f4`、border `#d4e2d4`、textSecondary `#4a6b52`;暗色 canvas `#0a140d`、surface `#14261a` 全是绿),而 `GlobalStyles.ts` 定义 `--primary: #0ea5e9`(蓝)。绿调中性色 + 蓝主色导致画面发灰发脏。
2. **彩色滥用**。Dashboard ActionCard 用 `linear-gradient(135deg,...)` 配了 6+ 种糖果色(`#67e8f9`、`#4ade80`、`#fcd34d`、`#fda4af`、`#f59e0b`、`#22c55e`);环状图每个扇区一个渐变;AppLayout 主背景还有彩色对角渐变。信息层级被颜色淹没。
3. **状态色三处定义不一致**:`theme.ts` 的 `status` map、`StatusBadge` 的 `statusFgMap`、页面里散落的硬编码 hex。
4. **字体打架**:Noto Sans TC(正文)+ Bebas Neue(品牌标题)+ Press Start 2P(像素风,用于 AgentPanel 游戏化面板和 Dashboard 一处)。
5. **字号层级 ad-hoc**:各组件自定 rem,无统一 scale。

## 改造要求

### A. 统一色彩体系(核心)

1. 把 `theme.ts` 的中性色全部改为**去饱和的纯灰或极轻微蓝调灰**(参考 Raycast/Linear:light 侧 canvas ≈ `#fafafa`/`#f7f8f9`,surface `#ffffff`,border ≈ `#e4e4e7`;dark 侧 canvas ≈ `#0e0e11`~`#131316`,surface ≈ `#1a1a1f`,border ≈ `#26262b`)。文字色同样去绿:textPrimary 近黑灰,textSecondary/Tertiary 为灰阶。
2. **只保留一个主题色**:蓝(可沿用 `#0ea5e9` 或换成更沉稳的 `#2563eb`/`#3b82f6` 系,自行判断并说明理由)。主色只用在:主按钮、激活态导航、链接、焦点环、图表主系列。
3. **允许一条品牌渐变:蓝→紫→红**(例如 `#3b82f6 → #8b5cf6 → #ef4444` 方向 135deg,具体色值可调但必须定义为唯一的 `theme.gradients.brand` token)。使用范围严格受限:logo/品牌标题、主 CTA 按钮、一处 Dashboard 强调元素(如问候区或单个 hero 指标)、进度条/加载态。**不允许**用它铺卡片底、页面背景或图表填充;同屏最多出现一次大面积、外加按钮级小面积。其余渐变一律移除。
4. 语义色收敛为 4 个且只定义一次(success/warning/danger/info),写入 `theme.ts`,`GlobalStyles.ts` 的 CSS 变量从 theme 派生或删除,消灭双源。语义色**只用于状态徽章、trend 涨跌、toast、错误提示**,不做装饰。
5. 删除 `StatusBadge` 内部的 `statusFgMap` 硬编码,改为消费 theme token;全局 grep 硬编码 hex(重点 Dashboard、Sidebar、Topbar),逐一替换为 token。
6. 移除 AppLayout 的彩色渐变背景,改为纯 canvas 色;ActionCard 的多色糖果渐变卡改为:surface 底 + 1px border + 左上角小色点或图标 tint(`${color}15` 这种 8% 透明度 tint 的手法项目里已有,统一沿用),数字做主角。允许其中**一张**最重要的卡使用 `theme.gradients.brand` 作为强调(即 A.3 允许的那一处大面积)。

### B. 字体与排版(不动颜色也能提质感的部分)

1. 字体收敛:正文保持 Noto Sans TC 栈;**Bebas Neue 移除或仅保留 logo 一处**;Press Start 2P 只允许留在 AgentPanel 游戏化页面内(那是刻意的彩蛋 motif,别扩散到 Dashboard)。真正加载 JetBrains Mono(现在 theme.fonts.mono 声明了但没加载),所有数字/KPI/表格数值列使用 `font-family: mono` 或至少 `font-variant-numeric: tabular-nums`。
2. 建立统一 type scale 写进 theme(建议:12/13/14/16/20/28px 对应 caption/body-sm/body/title/page-title/kpi),weight 只用 400/500/600/700 四档,替换各页面的 ad-hoc 字号。
3. 大写小标签(如 KPI label)统一 `font-size 11~12px / weight 600 / letter-spacing 0.05em / textTertiary 色`——这是最廉价的高级感来源之一。
4. 正文 `line-height 1.5` 保持;标题 1.2~1.3。

### C. 层级用边框和光,不用重阴影

1. 卡片层级:`surface 底 + 1px solid border + 现有 shadows.card(0 0 10px rgba(0,0,0,0.04))`,不加更重的阴影。暗色模式下卡片顶部可加一条 `1px inset rgba(255,255,255,0.04~0.06)` 高光,模拟玻璃边缘(Raycast 手法)。
2. 玻璃拟态**只保留在 Sidebar / Topbar / 浮层(dropdown、dialog、tooltip)**,内容区卡片一律实底 surface——大面积 blur 既伤性能又降低可读性。现有 `theme.glass` token 保留即可。
3. 圆角维持现有 `radii = { card:14, tile:14, control:8 }`,把页面里散落的 20px/999px pill 之外的随意圆角收敛到这三档。

### D. 图表(手写 SVG,保持无依赖)

1. 图表配色规则:**主系列 = 主题色,次系列 = 灰阶(border/textTertiary 色阶),语义系列(如"已回复/被拒")才允许 success/danger**。单图最多 2 个色相。环状图删掉每扇区 linearGradient,用实色 + 扇区间 2~3px 间隙(stroke-linecap round 或留 gap),中心放总数(mono 字体)。
2. 柱状图:圆角柱(已有 rx)、gridline 用 border 色 `strokeDasharray 3,3`(已有)、hover 柱高亮 + tooltip(已有 dark bubble,把 bubble 底色改为 theme surface-inverted token 而非硬编码 `#14261a`)。
3. 空状态:灰阶插画/占位 + 一句引导文案,不用彩色。
4. 只有五六个指标,不要为了填版面加图表;KPI 行(4 个 KPICard)+ 一个柱状图 + 一个环状图 + 一个最近活动列表,是合理的 Dashboard 密度上限。

### E. 微交互

1. 全局统一 transition:`150ms ease` 用于 hover/active,`200~250ms` 用于展开/浮层。写一个 theme.motion token,替换散落的 transition 值。
2. hover 反馈优先用 `background: surfaceMuted` 或 border 变深,不用放大/位移;按钮 active 可 `transform: translateY(0.5px)` 级别的极轻反馈。
3. 保留现有 PageTransition 淡入,时长 ≤200ms。
4. 焦点可见性:所有可交互元素 `:focus-visible` 用主色 2px ring(无障碍 + 质感兼得)。

## 约束

- **不新增任何依赖**(不装 UI 库、图表库、Tailwind);图标继续手写 SVG,统一 strokeWidth 为 1.8。
- **不破坏暗色模式**:每个改动同时更新 lightTheme 和 darkTheme,并检查各组件里 `theme.mode === 'dark'` 的分支。
- **不改业务逻辑、路由、i18n**;不动 `pages/AgentPanel` 的像素风世界(刻意保留的彩蛋)。
- Storybook stories(Button/FilterBar/FormField/PageHeader/Pagination/StatusBadge/Table)需与新样式保持一致。
- 语义色的可访问性:文字与背景对比度 ≥ 4.5:1(小字)/ 3:1(大字与图形)。
- 分步提交:先 theme.ts + GlobalStyles.ts token 层,再组件层,最后 Dashboard;每步列出改动文件清单,**改动前先给出计划征得同意**。

## 验收标准

1. 全局 grep 不再有游离于 theme 之外的颜色 hex(SVG 图标 currentColor 除外;AgentPanel 豁免)。
2. 任意页面同屏出现的"彩色"(非灰阶)不超过:主题色 + 品牌渐变(蓝紫红,至多一处大面积 + 按钮级小面积)+ 至多 2 个语义色。
3. 全局只存在一个渐变定义 `theme.gradients.brand`,页面中无其他 `linear-gradient` 彩色用法(灰阶/透明度渐变除外)。
4. 亮/暗两个模式下截图对比,中性色无绿偏色。
5. 字体只剩 Noto Sans TC 栈 + JetBrains Mono(+ AgentPanel 内的 Press Start 2P)。
6. Dashboard 在 1280px 和 640px 宽度下布局不破。
