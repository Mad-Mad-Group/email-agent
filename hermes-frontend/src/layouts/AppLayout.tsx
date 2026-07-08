import React, { useState, useCallback, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { media } from '../styles/media';
import { useSseListener } from '../hooks/useSseListener';

/* ── Overlay backdrop for mobile drawer ── */

const Overlay = styled.div<{ $open: boolean }>`
  display: none;

  ${media.mobile} {
    display: ${({ $open }) => ($open ? 'block' : 'none')};
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.45);
  }
`;

/* ── Shell ── */

const Shell = styled.div<{ $collapsed?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $collapsed }) => $collapsed ? '61px' : '250px'} minmax(0, 1fr);
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.canvas};
  transition: grid-template-columns 0.3s ease;

  ${media.tablet} {
    grid-template-columns: ${({ $collapsed }) => $collapsed ? '61px' : '250px'} minmax(0, 1fr);
  }

  ${media.mobile} {
    grid-template-columns: 1fr;
  }
`;

const Main = styled.main`
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: scroll;
`;

const Content = styled.div`
  flex: 1;
  padding: 8px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 5px;
  min-width: 0;
  overflow: visible;

  ${media.mobile} {
    padding: 56px 10px 8px;
    gap: 8px;
  }
`;

const PageTransition = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  animation: pageFadeIn 0.5s ease-out both;

  @keyframes pageFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

const ROUTE_TITLE_KEYS: Record<string, string> = {
  '/dashboard': 'nav.dashboard',
  '/pipeline': 'nav.pipeline',
  '/search': 'nav.search',
  '/agent': 'nav.agent',
  '/email': 'nav.emailQueue',
  '/settings': 'nav.settings',
};

/* ── Mobile hamburger (only shows on small screens) ── */

const MobileHamburgerBtn = styled.button<{ $open?: boolean }>`
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: transparent;
  color: var(--primary, #567ebb);
  cursor: pointer;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 1100;
  transform: translateX(${({ $open }) => ($open ? '200px' : '0')});
  transition: transform 0.25s ease;

  ${media.mobile} {
    display: flex;
  }
`;

/* Pure-CSS animated hamburger ↔ X.  Three <span> lines that rotate in place. */
const HamburgerLine = styled.span<{ $open?: boolean }>`
  display: block;
  width: 20px;
  height: 2px;
  border-radius: 1px;
  background: currentColor;
  transition: transform 0.25s ease, opacity 0.25s ease;
`;

const MobileHamburgerLines = styled.div<{ $open?: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 20px;
  height: 20px;
  transform: ${({ $open }) => ($open ? 'rotate(360deg)' : 'none')};
  transition: transform 0.25s ease;

  ${HamburgerLine}:nth-child(1) {
    transform: ${({ $open }) => ($open ? 'translateY(7px) rotate(45deg)' : 'none')};
  }
  ${HamburgerLine}:nth-child(2) {
    opacity: ${({ $open }) => ($open ? 0 : 1)};
  }
  ${HamburgerLine}:nth-child(3) {
    transform: ${({ $open }) => ($open ? 'translateY(-7px) rotate(-45deg)' : 'none')};
  }
`;

const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const titleKey = ROUTE_TITLE_KEYS[location.pathname] ?? 'nav.dashboard';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 1024);

  /* SSE 即時事件監聽 */
  useSseListener();

  /* Auto-collapse on tablet when window resizes across the 1024px boundary */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setSidebarCollapsed(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen(prev => !prev), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), []);

  return (
    <Shell $collapsed={sidebarCollapsed}>
      <MobileHamburgerBtn $open={mobileOpen} onClick={toggleMobile} aria-label="Toggle menu">
        <MobileHamburgerLines $open={mobileOpen}>
          <HamburgerLine />
          <HamburgerLine />
          <HamburgerLine />
        </MobileHamburgerLines>
      </MobileHamburgerBtn>
      <Overlay $open={mobileOpen} onClick={closeMobile} />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={closeMobile} collapsed={sidebarCollapsed} />
      <Main>
        <Topbar title={t(titleKey)} onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        <Content>
          <PageTransition key={location.key}>
            <Outlet />
          </PageTransition>
        </Content>
      </Main>
    </Shell>
  );
};

export default AppLayout;
