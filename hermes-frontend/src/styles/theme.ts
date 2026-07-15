import { HermesTheme } from '../types/theme';

const shared = {
  radii: { card: 16, tile: 16, control: 8 },
  fonts: {
    primary: "'Plus Jakarta Sans', 'Noto Sans TC', 'PingFang TC', 'PingFang SC', -apple-system, system-ui, 'Microsoft JhengHei', sans-serif",
    display: "'Plus Jakarta Sans', 'Bebas Neue', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  breakpoints: { mobile: 640, tablet: 1024, desktop: 1280 },
  gradients: {
    brand: 'linear-gradient(135deg, #0B080B, #6C97D1)',
  },
  motion: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
  },
};

/* ═══════════════════════════════════════════
   Light — 11-colour palette
   Pastel fills · Strong accents · #0B080B ink
   ═══════════════════════════════════════════ */
export const lightTheme: HermesTheme = {
  ...shared,
  mode: 'light',
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
    accent: '#6C97D1',
  },
  pastel: {
    mauve: '#E0ACD2',
    gold: '#E9C551',
    blue: '#ACC0DE',
    olive: '#97A33B',
  },
  strong: {
    mauve: '#D689BF',
    gold: '#E5B920',
    blue: '#6C97D1',
    olive: '#6C7A24',
  },
  sidebar: {
    bg: '#0B080B',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.45)',
    active: 'linear-gradient(135deg, #D689BF, #6C97D1)',
    hoverBg: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.06)',
  },
  status: {
    new: { bg: '#ACC0DE', fg: '#0B080B' },
    pending: { bg: '#E9C551', fg: '#0B080B' },
    contacted: { bg: '#E0ACD2', fg: '#0B080B' },
    rejected: { bg: '#DBD6D5', fg: '#0B080B' },
    qualified: { bg: '#6C97D1', fg: '#FFFFFF' },
    draft: { bg: '#DEDAD9', fg: '#6B7280' },
    approved: { bg: '#97A33B', fg: '#FFFFFF' },
    sent: { bg: '#97A33B', fg: '#FFFFFF' },
    running: { bg: '#6C97D1', fg: '#FFFFFF' },
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
    accent: '#6C97D1',
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
    blue: '#6C97D1',
    olive: '#97A33B',
  },
  sidebar: {
    bg: '#0B080B',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.45)',
    active: 'linear-gradient(135deg, #D689BF, #6C97D1)',
    hoverBg: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.06)',
  },
  status: {
    new: { bg: '#1E2A38', fg: '#ACC0DE' },
    pending: { bg: '#3A3018', fg: '#E9C551' },
    contacted: { bg: '#3D2636', fg: '#E0ACD2' },
    rejected: { bg: '#1E1B1E', fg: '#9CA3AF' },
    qualified: { bg: '#1E2A38', fg: '#6C97D1' },
    draft: { bg: '#1E1B1E', fg: '#6B7280' },
    approved: { bg: '#252A12', fg: '#97A33B' },
    sent: { bg: '#252A12', fg: '#97A33B' },
    running: { bg: '#1E2A38', fg: '#6C97D1' },
    idle: { bg: '#1E1B1E', fg: '#6B7280' },
    active: { bg: '#252A12', fg: '#97A33B' },
  },
  shadows: { card: '0 2px 12px rgba(0,0,0,0.3)' },
};

/** @deprecated Use lightTheme / darkTheme */
export const theme = lightTheme;
