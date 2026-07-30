import { HermesTheme } from '../types/theme';

const shared = {
  radii: { card: 16, tile: 16, control: 8, badge: 999 },
  fonts: {
    primary: "'Source Serif 4', 'Noto Serif TC', 'PingFang TC', 'PingFang SC', Georgia, 'Microsoft JhengHei', serif",
    display: "'Righteous', 'Plus Jakarta Sans', 'Noto Serif TC', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  breakpoints: { mobile: 640, tablet: 1024, desktop: 1280 },
  motion: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
  /** Strong custom easing curves (Emil Kowalski design-eng philosophy) */
  easing: {
    /** Entering/exiting UI — starts fast, feels responsive */
    out: 'cubic-bezier(0.23, 1, 0.32, 1)',
    /** On-screen movement — natural accel/decel */
    inOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
    /** Drawer/sheet feel */
    drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
  },
};

/* ═══════════════════════════════════════════
   Light — 11-colour palette
   Pastel fills · Strong accents · #0B080B ink
   ═══════════════════════════════════════════ */
export const lightTheme: HermesTheme = {
  ...shared,
  mode: 'light',
  gradients: {
    brand: 'linear-gradient(135deg, #0B080B, #2A78D6)',
  },
  colors: {
    canvas: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceMuted: '#DEDAD9',
    surfaceInverted: '#0B080B',
    border: '#DBD6D5',
    borderStrong: '#0B080B',
    textPrimary: '#0B080B',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textInverted: '#FFFFFF',
    accent: '#2A78D6',
    // 語意色
    danger: '#DC2626',
    blue: '#2A78D6',
    green: '#16A34A',
  },
  pastel: {
    mauve: '#E8A0CC',
    gold: '#F5C518',
    blue: '#86B6EF',
    olive: '#8CB030',
  },
  strong: {
    mauve: '#D689BF',
    gold: '#E5B920',
    blue: '#2A78D6',
    olive: '#6C7A24',
  },
  sidebar: {
    bg: '#FAF8F5',
    text: '#0B080B',
    textMuted: 'rgba(11,8,11,0.45)',
    active: 'linear-gradient(135deg, #184F95, #2A78D6)',
    hoverBg: 'rgba(11,8,11,0.05)',
    border: 'rgba(11,8,11,0.08)',
  },
  status: {
    new: { bg: '#9EC5F4', fg: '#0B080B' },
    pending: { bg: '#E5B920', fg: '#FFFFFF' },
    contacted: { bg: '#E0ACD2', fg: '#0B080B' },
    rejected: { bg: '#DBD6D5', fg: '#0B080B' },
    qualified: { bg: '#2A78D6', fg: '#FFFFFF' },
    draft: { bg: '#DEDAD9', fg: '#6B7280' },
    approved: { bg: '#97A33B', fg: '#FFFFFF' },
    sent: { bg: '#97A33B', fg: '#FFFFFF' },
    running: { bg: '#2A78D6', fg: '#FFFFFF' },
    idle: { bg: '#DEDAD9', fg: '#9CA3AF' },
    active: { bg: '#97A33B', fg: '#FFFFFF' },
  },
  shadows: { card: '0 2px 12px rgba(0,0,0,0.04)' },
};

/* ═══════════════════════════════════════════
   Dark — same palette, inverted neutrals
   ═══════════════════════════════════════════ */
export const darkTheme: HermesTheme = {
  ...shared,
  mode: 'dark',
  gradients: {
    brand: 'linear-gradient(135deg, #FAF8F5, #3987E5)',
  },
  colors: {
    canvas: '#0B080B',
    surface: '#161316',
    surfaceMuted: '#1E1B1E',
    surfaceInverted: '#FAF8F5',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.16)',
    textPrimary: '#FAF8F5',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    textInverted: '#0B080B',
    accent: '#3987E5',
    // 語意色（深色模式提高亮度確保對比度）
    danger: '#EF4444',
    blue: '#3987E5',
    green: '#22C55E',
  },
  pastel: {
    mauve: '#3D2636',
    gold: '#3A3018',
    blue: '#1E2A38',
    olive: '#252A12',
  },
  strong: {
    mauve: '#D689BF',
    gold: '#E5B920',
    blue: '#3987E5',
    olive: '#97A33B',
  },
  sidebar: {
    bg: '#0B080B',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.45)',
    active: 'linear-gradient(135deg, #184F95, #3987E5)',
    hoverBg: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.06)',
  },
  status: {
    new: { bg: '#1E2A38', fg: '#86B6EF' },
    pending: { bg: '#3A3018', fg: '#E9C551' },
    contacted: { bg: '#3D2636', fg: '#E0ACD2' },
    rejected: { bg: '#1E1B1E', fg: '#9CA3AF' },
    qualified: { bg: '#1E2A38', fg: '#3987E5' },
    draft: { bg: '#1E1B1E', fg: '#6B7280' },
    approved: { bg: '#252A12', fg: '#97A33B' },
    sent: { bg: '#252A12', fg: '#97A33B' },
    running: { bg: '#1E2A38', fg: '#3987E5' },
    idle: { bg: '#1E1B1E', fg: '#6B7280' },
    active: { bg: '#252A12', fg: '#97A33B' },
  },
  shadows: { card: '0 2px 12px rgba(0,0,0,0.3)' },
};

/** @deprecated Use lightTheme / darkTheme */
export const theme = lightTheme;
