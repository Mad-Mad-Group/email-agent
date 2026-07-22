import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import { media } from '../styles/media';
import { useSseListener } from '../hooks/useSseListener';

/* ── Shell (two-column: sidebar + main) ── */

const Shell = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
  height: 100vh;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
  background: ${({ theme }) => theme.colors.canvas};
  position: relative;

  ${media.tablet} {
    grid-template-columns: 64px 1fr;
  }

  ${media.mobile} {
    grid-template-columns: 1fr;
    padding: 0;
    gap: 0;
  }
`;

const Main = styled.main`
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  height: 100%;
  overflow-x: hidden;
  overflow-y: scroll;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  border: 1px solid ${({ theme }) => theme.colors.border};

  ${media.mobile} {
    border-radius: 0;
    border: none;
    height: 100vh;
  }
`;

const Content = styled.div`
  flex: 1;
  padding: 0 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  animation: pageFadeIn 0.35s ease-out both;

  @keyframes pageFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

const Overlay = styled.div<{ $show: boolean }>`
  display: ${({ $show }) => ($show ? 'block' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.35);
`;

const MobileHamburger = styled.button`
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 998;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  font-size: 18px;

  ${media.mobile} {
    display: flex;
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

const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const titleKey = ROUTE_TITLE_KEYS[location.pathname] ?? 'nav.dashboard';
  const [mobileOpen, setMobileOpen] = useState(false);

  /* SSE 即時事件監聽 */
  useSseListener();

  /* Close mobile drawer on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  /* Tablet: auto-collapse sidebar */
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;

  return (
    <Shell>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={isTablet}
      />
      <Overlay $show={mobileOpen} onClick={() => setMobileOpen(false)} />
      <MobileHamburger onClick={() => setMobileOpen(true)}>☰</MobileHamburger>
      <Main>
        <Topbar title={t(titleKey)} />
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
