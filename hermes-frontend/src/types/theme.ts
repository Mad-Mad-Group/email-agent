export interface StatusColor {
  bg: string;
  fg: string;
}

export interface HermesTheme {
  mode: 'light' | 'dark';
  colors: {
    canvas: string;
    surface: string;
    surfaceMuted: string;
    surfaceInverted: string;
    border: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textInverted: string;
    accent: string;
  };
  pastel: {
    mauve: string;
    gold: string;
    blue: string;
    olive: string;
  };
  strong: {
    mauve: string;
    gold: string;
    blue: string;
    olive: string;
  };
  sidebar: {
    bg: string;
    text: string;
    textMuted: string;
    active: string;
    hoverBg: string;
    border: string;
  };
  status: {
    new: StatusColor;
    pending: StatusColor;
    contacted: StatusColor;
    rejected: StatusColor;
    qualified: StatusColor;
    draft: StatusColor;
    approved: StatusColor;
    sent: StatusColor;
    running: StatusColor;
    idle: StatusColor;
    active: StatusColor;
    [key: string]: StatusColor;
  };
  shadows: {
    card: string;
  };
  gradients: {
    brand: string;
  };
  motion: {
    fast: string;
    normal: string;
    slow: string;
  };
  radii: {
    card: number;
    tile: number;
    control: number;
  };
  fonts: {
    primary: string;
    display: string;
    mono: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}
