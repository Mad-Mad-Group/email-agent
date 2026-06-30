import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type Mode = 'light' | 'dark';

interface ThemeModeCtx {
  mode: Mode;
  toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeCtx>({ mode: 'light', toggle: () => {} });

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const saved = localStorage.getItem('theme-mode');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* SSR / private browsing */ }
    return 'light';
  });

  useEffect(() => {
    try { localStorage.setItem('theme-mode', mode); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const toggle = useCallback(() => setMode(prev => (prev === 'light' ? 'dark' : 'light')), []);

  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeModeContext);
