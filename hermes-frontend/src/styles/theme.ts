import { HermesTheme } from '../types/theme';

const shared = {
  radii: { card: 14, tile: 14, control: 8 },
  fonts: {
    primary: "'Noto Sans TC', 'PingFang TC', 'PingFang SC', -apple-system, system-ui, 'Microsoft JhengHei', sans-serif",
    display: "'Bebas Neue', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  breakpoints: { mobile: 640, tablet: 1024, desktop: 1280 },
};

export const lightTheme: HermesTheme = {
  ...shared,
  mode: 'light',
  colors: {
    canvas: '#f4f7f4',
    surface: '#ffffff',
    surfaceMuted: '#ecf2ec',
    border: '#d4e2d4',
    borderStrong: '#b8cfb8',
    textPrimary: '#14281a',
    textSecondary: '#4a6b52',
    textTertiary: '#88a890',
    green: '#16a34a',
    amber: '#ca8a04',
    red: '#dc2626',
    blue: '#3d7ab8',
    accent: '#0ea5e9',
  },
  status: {
    new: { bg: '#cffafe', fg: '#0ea5e9' },
    pending: { bg: '#fef3c7', fg: '#ca8a04' },
    contacted: { bg: '#d1fae5', fg: '#059669' },
    rejected: { bg: '#fee2e2', fg: '#dc2626' },
    qualified: { bg: '#cffafe', fg: '#0ea5e9' },
  },
  shadows: { card: '0 0 10px rgba(0,0,0,0.04)' },
};

export const darkTheme: HermesTheme = {
  ...shared,
  mode: 'dark',
  colors: {
    canvas: '#0a140d',
    surface: '#14261a',
    surfaceMuted: '#0f1e14',
    border: '#1e3a25',
    borderStrong: '#2d5a38',
    textPrimary: '#e8f5ec',
    textSecondary: '#86c496',
    textTertiary: '#4a8a5c',
    green: '#22c55e',
    amber: '#fbbf24',
    red: '#f87171',
    blue: '#6da5cc',
    accent: '#22d3ee',
  },
  status: {
    new: { bg: '#083344', fg: '#67e8f9' },
    pending: { bg: '#422006', fg: '#fcd34d' },
    contacted: { bg: '#052e16', fg: '#34d399' },
    rejected: { bg: '#450a0a', fg: '#fca5a5' },
    qualified: { bg: '#172554', fg: '#93c5fd' },
  },
  shadows: { card: '0 0 10px rgba(0,0,0,0.3)' },
};

/** @deprecated Use lightTheme / darkTheme */
export const theme = lightTheme;
