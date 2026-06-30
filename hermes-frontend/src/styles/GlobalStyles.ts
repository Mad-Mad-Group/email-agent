import { createGlobalStyle } from 'styled-components';

// CSS 变量（让组件用 var() 也能拿到主品牌色）
export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    /* 主品牌色 — Linear / Vercel 蓝（低饱和版） */
    --primary: #567ebb;
    --primary-hover: #4367a3;
    --primary-light: #d8e1ee;

    /* 渐变用新调色板相邻两档，保留原本的 135deg */
    --gradient-primary: linear-gradient(135deg, #6890c2 0%, #4367a3 100%);
    --gradient-green:   linear-gradient(135deg, #5fa088 0%, #46816a 100%);
    --gradient-gold:    linear-gradient(135deg, #c19862 0%, #a87b40 100%);
    --gradient-danger:  linear-gradient(135deg, #c47474 0%, #a85a5a 100%);

    /* 状态色（低饱和） */
    --success: #5fa088;
    --warning: #c19862;
    --danger:  #c47474;
    --info:    #6890c2;
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
