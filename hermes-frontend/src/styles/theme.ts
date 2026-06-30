import { HermesTheme } from '../types/theme';

const shared = {
  radii: { card: 8, tile: 8, control: 6 },
  fonts: {
    primary: "'Nunito', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  breakpoints: { mobile: 640, tablet: 1024, desktop: 1280 },
};

export const lightTheme: HermesTheme = {
  ...shared,
  colors: {
    canvas: '#f0f3f5',
    surface: '#ffffff',
    surfaceMuted: '#f8f9fa',
    border: '#e4e7ea',
    borderStrong: '#d5d8dc',
    textPrimary: '#293240',
    textSecondary: '#6c757d',
    textTertiary: '#969ba0',
    green: '#5699a3',
    amber: '#d4c8c0',
    red: '#d4bbb5',
    blue: '#7fb5ba',
  },
  status: {
    new: { bg: '#e3f5f6', fg: '#4a6fa5' },
    pending: { bg: '#f5f0eb', fg: '#d4c8c0' },
    contacted: { bg: '#ebf3f4', fg: '#5699a3' },
    rejected: { bg: '#f5efed', fg: '#d4bbb5' },
    qualified: { bg: '#eaeff5', fg: '#4a6fa5' },
  },
  shadows: { card: '0 0 10px rgba(0,0,0,0.05)' },
};

export const darkTheme: HermesTheme = {
  ...shared,
  colors: {
    canvas: '#1a1d21',
    surface: '#252830',
    surfaceMuted: '#2a2d35',
    border: '#363940',
    borderStrong: '#454850',
    textPrimary: '#e4e6eb',
    textSecondary: '#a8adb5',
    textTertiary: '#6c727a',
    green: '#5699a3',
    amber: '#d4c8c0',
    red: '#d4bbb5',
    blue: '#7fb5ba',
  },
  status: {
    new: { bg: '#1a2a35', fg: '#6aafc0' },
    pending: { bg: '#2e2924', fg: '#d4c3b4' },
    contacted: { bg: '#1a2e2f', fg: '#6db3bc' },
    rejected: { bg: '#2e2625', fg: '#d4bab3' },
    qualified: { bg: '#1e2430', fg: '#7a9fd4' },
  },
  shadows: { card: '0 0 10px rgba(0,0,0,0.25)' },
};

/** @deprecated Use lightTheme / darkTheme */
export const theme = lightTheme;
