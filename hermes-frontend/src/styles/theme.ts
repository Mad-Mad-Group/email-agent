import { HermesTheme } from '../types/theme';

const shared = {
  radii: { card: 10, tile: 10, control: 6 },
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
    canvas: '#f7f7f4',
    surface: '#ffffff',
    surfaceMuted: '#f0f0ec',
    border: '#e5e5e0',
    borderStrong: '#d4d4cf',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    green: '#16a34a',
    amber: '#d97706',
    red: '#dc2626',
    blue: '#2563eb',
    accent: '#2563eb',
  },
  status: {
    new: { bg: '#dbeafe', fg: '#1d4ed8' },
    pending: { bg: '#dbeafe', fg: '#1d4ed8' },
    contacted: { bg: '#dcfce7', fg: '#16a34a' },
    rejected: { bg: '#fee2e2', fg: '#dc2626' },
    qualified: { bg: '#dbeafe', fg: '#1d4ed8' },
  },
  shadows: { card: '0 0 10px rgba(0,0,0,0.04)' },
};

export const darkTheme: HermesTheme = {
  ...shared,
  mode: 'dark',
  colors: {
    canvas: '#0f172a',
    surface: '#1e293b',
    surfaceMuted: '#1a2332',
    border: '#334155',
    borderStrong: '#475569',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    green: '#22c55e',
    amber: '#f59e0b',
    red: '#ef4444',
    blue: '#3b82f6',
    accent: '#3b82f6',
  },
  status: {
    new: { bg: '#1e3a5f', fg: '#93c5fd' },
    pending: { bg: '#1e3a5f', fg: '#93c5fd' },
    contacted: { bg: '#14532d', fg: '#86efac' },
    rejected: { bg: '#450a0a', fg: '#fca5a5' },
    qualified: { bg: '#1e3a5f', fg: '#93c5fd' },
  },
  shadows: { card: '0 0 10px rgba(0,0,0,0.3)' },
};

/** @deprecated Use lightTheme / darkTheme */
export const theme = lightTheme;
