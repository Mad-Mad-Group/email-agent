import { createGlobalStyle } from 'styled-components';

// CSS 变量（让组件用 var() 也能拿到主品牌色）
export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    /* 主品牌色 — Logo 蓝 */
    --primary: #2563eb;
    --primary-hover: #1d4ed8;
    --primary-light: #dbeafe;

    /* 渐变 */
    --gradient-primary: #2563eb;
    --gradient-green: #16a34a;
    --gradient-gold: #d97706;
    --gradient-danger: #dc2626;

    /* 状态色 */
    --success: #16a34a;
    --warning: #d97706;
    --danger:  #dc2626;
    --info:    #2563eb;
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
    transition: background-color 0.3s ease, color 0.3s ease;
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

  /* ── Scrollbar — dark mode aware ── */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.mode === 'dark' ? '#475569 #1e293b' : 'rgba(0,0,0,0.2) transparent'};
  }
  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.mode === 'dark' ? '#1e293b' : 'transparent'};
  }
  *::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.mode === 'dark' ? '#475569' : 'rgba(0,0,0,0.2)'};
    border-radius: 3px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? '#64748b' : 'rgba(0,0,0,0.35)'};
  }
`;
