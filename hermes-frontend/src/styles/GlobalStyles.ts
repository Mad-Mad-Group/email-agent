import { createGlobalStyle } from 'styled-components';

// CSS 变量（让组件用 var() 也能拿到主品牌色）
export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    /* 主品牌色 — Linear / Vercel 蓝 */
    --primary: #2563eb;
    --primary-hover: #1d4ed8;
    --primary-light: #dbeafe;

    /* 渐变（保持 135deg） */
    --gradient-primary: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    --gradient-green:   linear-gradient(135deg, #10b981 0%, #059669 100%);
    --gradient-gold:    linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    --gradient-danger:  linear-gradient(135deg, #ef4444 0%, #dc2626 100%);

    /* 状态色 */
    --success: #10b981;
    --warning: #f59e0b;
    --danger:  #ef4444;
    --info:    #06b6d4;
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
`;
