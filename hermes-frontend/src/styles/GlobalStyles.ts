import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    /* Derived from theme — single source of truth */
    --primary: ${({ theme }) => theme.colors.accent};
    --primary-hover: ${({ theme }) => theme.colors.accent};
    --success: ${({ theme }) => theme.strong.olive};
    --warning: ${({ theme }) => theme.strong.gold};
    --danger: ${({ theme }) => theme.strong.mauve};
    --info: ${({ theme }) => theme.colors.accent};

    /* Strong custom easing curves (Emil Kowalski) */
    --ease-out: ${({ theme }) => theme.easing.out};
    --ease-in-out: ${({ theme }) => theme.easing.inOut};
    --ease-drawer: ${({ theme }) => theme.easing.drawer};
  }

  html {
    font-size: 15px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: ${({ theme }) => theme.fonts.primary};
    color: ${({ theme }) => theme.colors.textPrimary};
    background-color: ${({ theme }) => theme.colors.canvas};
    line-height: 1.5;
    transition: background-color ${({ theme }) => theme.motion.slow}, color ${({ theme }) => theme.motion.slow};
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    background: none;
  }

  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
    border: none;
    outline: none;
  }

  ul, ol {
    list-style: none;
  }

  img {
    display: block;
    max-width: 100%;
  }

  table {
    border-collapse: collapse;
    border-spacing: 0;
  }

  /* Global button press feedback */
  button, [role="button"] {
    transition: transform 160ms var(--ease-out, cubic-bezier(0.23,1,0.32,1));
    &:active:not(:disabled) {
      transform: scale(0.97);
    }
  }

  /* Focus visible — accessible focus ring using accent color */
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }

  /* Reduced motion — gentler animations for accessibility */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.15s !important;
    }
  }

  /* ── Scrollbar — dark mode aware ── */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.mode === 'dark' ? '#3f3f46 #141418' : 'rgba(0,0,0,0.15) transparent'};
  }
  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.mode === 'dark' ? '#141418' : 'transparent'};
  }
  *::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.mode === 'dark' ? '#3f3f46' : 'rgba(0,0,0,0.15)'};
    border-radius: 3px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? '#52525b' : 'rgba(0,0,0,0.25)'};
  }
`;
