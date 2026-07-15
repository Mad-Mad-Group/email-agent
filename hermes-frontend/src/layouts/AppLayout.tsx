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
  grid-template-columns: ${({ $collapsed }) => $collapsed ? '56px' : '180px'} minmax(0, 1fr);
  min-height: 100vh;
  height: 100vh;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
  background: ${({ theme }) => theme.colors.canvas};
  transition: grid-template-columns 0.3s ease;
  position: relative;

  ${media.tablet} {
    grid-template-columns: ${({ $collapsed }) => $collapsed ? '56px' : '180px'} minmax(0, 1fr);
  }

  ${media.mobile} {
    grid-template-columns: 1fr;
    padding: 0;
    gap: 0;
  }
`;

/* ── Circular hamburger at sidebar ↔ main junction ── */

const JunctionHamburger = styled.button<{ $collapsed?: boolean }>`
  position: absolute;
  z-index: 20;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: ${({ theme }) => theme.pastel.mauve};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Position: right edge of sidebar column + half the gap, vertically centred on topbar */
  top: 48px;                        /* 16px shell pad + 32px (half topbar 64px) */
  left: ${({ $collapsed }) => $collapsed
    ? 'calc(16px + 56px + 8px - 18px)'     /* collapsed sidebar */
    : 'calc(16px + 180px + 8px - 18px)'};  /* expanded sidebar */
  transform: translateY(-50%);
  transition: left 0.3s ease, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);

  &:hover {
    box-shadow: 0 4px 14px rgba(0,0,0,0.18);
  }

  ${media.mobile} { display: none; }
`;

const JunctionLines = styled.span<{ $collapsed?: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 18px;
  height: 14px;
  position: relative;

  .jline {
    display: block;
    width: 18px;
    height: 2px;
    background: ${({ theme }) => theme.colors.surfaceInverted};
    border-radius: 2px;
    transition: all 0.3s ease;
    position: absolute;
    left: 0;

    &:nth-child(1) { top: 0; }
    &:nth-child(2) { top: 6px; }
    &:nth-child(3) { top: 12px; }
  }

  ${JunctionHamburger}:hover & {
    .jline:nth-child(1) {
      width: 10px;
      transform: ${({ $collapsed }) => $collapsed
        ? 'translateX(8px) translateY(2px) rotate(45deg)'
        : 'translateX(0px) translateY(2px) rotate(-45deg)'};
    }
    .jline:nth-child(2) {
      width: 18px;
    }
    .jline:nth-child(3) {
      width: 10px;
      transform: ${({ $collapsed }) => $collapsed
        ? 'translateX(8px) translateY(-2px) rotate(-45deg)'
        : 'translateX(0px) translateY(-2px) rotate(45deg)'};
    }
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
  color: ${({ theme }) => theme.colors.accent};
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
      <JunctionHamburger $collapsed={sidebarCollapsed} onClick={toggleSidebar} aria-label="Toggle sidebar">
        <JunctionLines $collapsed={sidebarCollapsed}>
          <span className="jline" />
          <span className="jline" />
          <span className="jline" />
        </JunctionLines>
      </JunctionHamburger>
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
