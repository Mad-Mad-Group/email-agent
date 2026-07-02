export interface StatusColor {
  bg: string;
  fg: string;
}

export interface HermesTheme {
  colors: {
    canvas: string;
    surface: string;
    surfaceMuted: string;
    border: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    green: string;
    amber: string;
    red: string;
    blue: string;
    accent: string;
  };
  status: {
    new: StatusColor;
    pending: StatusColor;
    contacted: StatusColor;
    rejected: StatusColor;
    qualified: StatusColor;
  };
  shadows: {
    card: string;
  };
  radii: {
    card: number;
    tile: number;
    control: number;
  };
  fonts: {
    primary: string;
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
