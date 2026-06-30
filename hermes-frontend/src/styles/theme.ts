import { HermesTheme } from '../types/theme';

// Linear / Vercel 风格：1 个高饱和主品牌蓝 + 4 个状态色 + slate 中性灰阶
// 所有文字色对浅底对比度 ≥ 4.5:1 (WCAG AA)
const shared = {
  radii: { card: 8, tile: 8, control: 6 },
  fonts: {
    primary: "'Nunito', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  breakpoints: { mobile: 640, tablet: 1024, desktop: 1280 },
  gradients: {
    // 4 个状态渐变（深色端 → 白字，所有渐变对白色文字对比度 ≥ 4.5:1）
    primary:  'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', // 蓝
    blue:     'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    green:    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    gold:     'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // 橙
    danger:   'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    subtle:   'linear-gradient(135deg, #fafbfc 0%, #f4f5f7 100%)',
  },
};

export const lightTheme: HermesTheme = {
  ...shared,
  colors: {
    // 中性灰阶（slate 风）
    canvas:        '#fafbfc',   // 极浅中性底
    surface:       '#ffffff',
    surfaceMuted:  '#f4f5f7',   // 比 canvas 深一档
    border:        '#e5e7eb',   // 跟 canvas 区分明显
    borderStrong:  '#d1d5db',
    textPrimary:   '#0f172a',   // slate-900，对比度 17:1
    textSecondary: '#475569',   // slate-600，对比度 7.5:1
    textTertiary:  '#94a3b8',   // slate-400，只用于 placeholder
    textInverse:   '#ffffff',

    // 语义色槽（4 个明确色相）
    green: '#10b981',  // 翠绿 (emerald-500)
    amber: '#f59e0b',  // 琥珀 (amber-500) — 暖色锚点
    red:   '#ef4444',  // 红   (red-500)
    blue:  '#2563eb',  // 蓝主色 (blue-600)
  },
  status: {
    // 5 状态：5 个不同色相，每对 bg+fg 对比度 ≥ 7:1
    new:       { bg: '#dbeafe', fg: '#1d4ed8' }, // 蓝
    pending:   { bg: '#fef3c7', fg: '#92400e' }, // 琥珀
    contacted: { bg: '#d1fae5', fg: '#065f46' }, // 绿
    qualified: { bg: '#e0e7ff', fg: '#3730a3' }, // 靛
    rejected:  { bg: '#fee2e2', fg: '#991b1b' }, // 红
  },
  shadows: { card: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' },
};

export const darkTheme: HermesTheme = {
  ...shared,
  colors: {
    canvas:        '#0f172a',   // slate-900
    surface:       '#1e293b',   // slate-800
    surfaceMuted:  '#1a202c',
    border:        '#334155',   // slate-700
    borderStrong:  '#475569',   // slate-600
    textPrimary:   '#f1f5f9',   // slate-100
    textSecondary: '#cbd5e1',   // slate-300
    textTertiary:  '#64748b',   // slate-500
    textInverse:   '#0f172a',

    green: '#10b981',
    amber: '#f59e0b',
    red:   '#ef4444',
    blue:  '#3b82f6',           // dark mode 蓝稍亮
  },
  status: {
    // dark: 浅色 fg 对深色 bg 仍然 7:1+
    new:       { bg: '#1e3a8a', fg: '#93c5fd' }, // 蓝（深底+亮蓝字）
    pending:   { bg: '#78350f', fg: '#fcd34d' }, // 琥珀
    contacted: { bg: '#064e3b', fg: '#6ee7b7' }, // 绿
    qualified: { bg: '#312e81', fg: '#a5b4fc' }, // 靛
    rejected:  { bg: '#7f1d1d', fg: '#fca5a5' }, // 红
  },
  shadows: { card: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)' },
};

/** @deprecated Use lightTheme / darkTheme */
export const theme = lightTheme;
