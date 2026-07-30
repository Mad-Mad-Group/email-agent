import { useEffect, useState } from 'react';

/* Keep in sync with `media.mobile` in styles/media.ts */
const MOBILE_QUERY = '(max-width: 639px)';

/**
 * Tracks the mobile breakpoint. For layout, prefer a `${media.mobile}` block in
 * styled-components — this is for cases where the markup itself has to differ
 * (e.g. an SVG that needs a different viewBox and fewer data points).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
