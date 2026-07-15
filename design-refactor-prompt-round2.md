# 第二轮任务:完成配色重构的"消费层"替换(上一轮只改了 token 层)

## 现状诊断(先读懂再动手)

上一轮你已正确完成 `src/styles/theme.ts`:中性灰 light/dark палette、`gradients.brand`(蓝紫红)、`motion` token。**但页面和组件里的硬编码 hex 一个都没换**,所以界面仍是糖果色,并且旧绿调 hex 和新灰底混搭后观感更差。本轮任务 = 把所有消费层的硬编码颜色替换为 theme token。**不要再动 theme.ts 的结构**(如需补 token 可以新增,不要重命名已有字段)。

## 配色铁律(每处替换都对照检查)

1. 允许的"彩色"只有三类:主题色 `theme.colors.blue`、品牌渐变 `theme.gradients.brand`(蓝紫红,同屏至多一处大面积 + 按钮级小面积)、语义色 `green/amber/red`(只用于状态/涨跌/警示,不做装饰)。
2. 其余一律灰阶:`canvas/surface/surfaceMuted/border/borderStrong/textPrimary/textSecondary/textTertiary`。
3. 图表单图最多 2 个色相:主系列 = blue,次系列 = 灰阶,语义系列才用 green/red。
4. 禁止出现的糖果色(全局 grep 清零,AgentPanel 目录豁免):`#67e8f9 #4ade80 #fcd34d #fda4af #93c5fd #f59e0b #fca5a5 #fbbf24`(fbbf24 在 theme.ts 内作为 dark amber 保留,页面里不许直接写)。
5. 禁止出现的旧绿调残留(全局 grep 清零):`#d4e2d4 #ecf2ec #1e3a25 #14261a #0a140d #4a6b52 #88a890 #2d5a38 #b8cfb8 #86c496 #4a8a5c #f4f7f4 #14281a`。

## 第一步:`src/pages/Dashboard/index.tsx`(约 57 处硬编码,最重)

逐处替换,styled-components 内用 `${({ theme }) => theme.colors.xxx}`,SVG/JSX 内通过 `useTheme()` 取值:

- **骨架/空状态 SVG**(L177-182、L407-408 等):`#d4e2d4 #e2e8f0 #cbd5e1` → `theme.colors.border`,透明度保留。
- **柱状图**(BarChart ~L184):gridline/tick `dark ? '#1e3a25' : '#d4e2d4'` → `theme.colors.border`;轴文字 `#4a6b52/#88a890` → `theme.colors.textTertiary`;柱底轨 `#1e3a25/#ecf2ec` → `theme.colors.surfaceMuted`;数据柱填充 → `theme.colors.blue`。删除所有 `dark ? A : B` 手工分支,theme 本身已分模式。
- **Tooltip**(L280、L283 的 `#14261a`):新增 token `theme.colors.surfaceInverted`(light: `#18181b`,dark: `#fafafa`)+ `textInverted`,tooltip 底/caret/文字改用它。
- **环状图**(DonutChart L280 起):删除每扇区 linearGradient;扇区实色按顺序取 `[blue, green, amber, red, textTertiary]`,超出部分用灰阶;底环 `#d4e2d4` → `theme.colors.surfaceMuted`;中心总数用 `theme.fonts.mono`。
- **漏斗图**(L826-834):五段 `#67e8f9 #fcd34d #4ade80 #93c5fd #fda4af` → 改为**单色相蓝的透明度阶梯**:`blue` 100% / 80% / 60% / 40% / 25%(用 color-mix 或 rgba),"已回复"一段可用 `green` 标注语义。
- **ActionCard**(L769-808):删除 `$bg1/$bg2` 双色渐变 props;改为 `surface` 底 + `1px solid border` + 图标 tint(`${color}15` 手法,color 取 blue/green/amber/red 对应各卡语义);`$accent/$fg` 全部改 token。**仅第一张(最重要指标)可以用 `theme.gradients.brand` 做底**,该卡文字用白色。
- **Card 的 `$topAccent`**(L819、L840 等):`#0ea5e9 #22c55e` → `theme.colors.blue`,或干脆删掉顶部彩条统一无彩。
- 其余散落 hex(L375-380 的 `#0a140d/#ecf2ec`、L420 边框等)按铁律映射到最近的灰阶 token。

## 第二步:`src/components/StatusBadge/index.tsx`

删除内部 `statusFgMap`,改为消费 `theme.status`(theme.ts 已定义 new/pending/contacted/rejected/qualified 的 bg/fg)。badge 里未覆盖的状态(draft/running/sent/active/approved/idle 等)在 `theme.status` 中补齐定义(用 blue/green/amber/red/textTertiary 派生),不许在组件里写 hex。

## 第三步:其余文件 grep 清扫

以下文件仍含糖果色/旧绿调 hex,逐一替换为 token(方法同第一步):
`components/Sidebar/index.tsx`、`pages/Leads/index.tsx`、`pages/Search/index.tsx`、`pages/EmailQueue/index.tsx`、`pages/EmailQueue/EmailTemplateEditor.tsx`、`pages/VerifiedEmails/index.tsx`、`pages/Users/index.tsx`、`pages/Settings/index.tsx`、`pages/Pipeline/index.tsx`、`pages/Calendar/index.tsx`、`config/agents.ts`、`styles/theme.ts` 之外若 `GlobalStyles.ts` 仍有独立 `--primary` 等 CSS 变量,改为从 theme 注入或删除。
豁免:`pages/AgentPanel/**`(像素风彩蛋,整目录不动)。

## 验收(必须逐条执行并贴出结果)

1. `grep -rnE "#(67e8f9|4ade80|fcd34d|fda4af|93c5fd|f59e0b|fca5a5|d4e2d4|ecf2ec|1e3a25|14261a|0a140d|4a6b52|88a890)" src --include="*.tsx" --include="*.ts" | grep -v AgentPanel` 输出为空。
2. `grep -rn "linear-gradient" src --include="*.tsx" | grep -v AgentPanel | grep -v theme.ts` 中不出现彩色渐变(灰阶/透明度渐变除外)。
3. 亮/暗两模式各截图 Dashboard,确认:无绿调、无糖果色、同屏彩色仅 蓝 + 一处品牌渐变 + 语义色。
4. `npm run build` 通过,TypeScript 无错误(新增 surfaceInverted 等 token 需同步 `types/theme.ts` 和 `styled.d.ts`)。

## 流程要求

分三步各自提交,每步开始前列出将改动的文件清单征得同意;禁止只改 theme.ts 就宣布完成——**本轮的定义就是消费层替换**。
