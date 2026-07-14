import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface BadgeState {
  counts: Record<string, number>;
  setBadge: (route: string, count: number) => void;
  addBadge: (route: string, delta: number) => void;
  clearBadge: (route: string) => void;
}

const BadgeContext = createContext<BadgeState>({
  counts: {},
  setBadge: () => {},
  addBadge: () => {},
  clearBadge: () => {},
});

export const useBadge = () => useContext(BadgeContext);

export const BadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const setBadge = useCallback((route: string, count: number) => {
    setCounts(prev => ({ ...prev, [route]: count }));
  }, []);

  const addBadge = useCallback((route: string, delta: number) => {
    setCounts(prev => ({ ...prev, [route]: (prev[route] || 0) + delta }));
  }, []);

  const clearBadge = useCallback((route: string) => {
    setCounts(prev => {
      const next = { ...prev };
      delete next[route];
      return next;
    });
  }, []);

  /* Expose for dev testing: window.__setBadge('/cms-leads', 5) */
  useEffect(() => {
    (window as any).__setBadge = setBadge;
    (window as any).__clearBadge = clearBadge;
    return () => { delete (window as any).__setBadge; delete (window as any).__clearBadge; };
  }, [setBadge, clearBadge]);

  return (
    <BadgeContext.Provider value={{ counts, setBadge, addBadge, clearBadge }}>
      {children}
    </BadgeContext.Provider>
  );
};
