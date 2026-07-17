import React, { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useLeads, useDeleteLead, useChangeLeadStatus, useCreateLead, useEmailQueue, useApproveEmail, useRejectEmail, useSendEmail, useClearAllLeads, useReprocessLead, useMe } from '../../api/hooks';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/services';
import { Lead } from '../../api/leads';
import { EmailItem } from '../../api/emailQueue';
import client from '../../api/client';
import { media } from '../../styles/media';
import { glassSurface } from '../../styles/glassSurface';
import { useDialog } from '../../components';
import SpriteAvatar from '../../components/SpriteAvatar';
import { AGENTS, FARMER, SOURCE_AGENT } from '../../config/agents';
import { getQuarterTag, matchesQuarterFilter, dateToYQ, buildQuarterOptions, type QuarterFilterValue } from '../../utils/quarter';

/* ══════════════════════════════════════
   CMS Leads — Luno Contacts-style UI
   ══════════════════════════════════════ */

/* ── Inline SVG icons (16x16 viewBox) ── */

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.5 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1 13.5c0-2.21 2.015-4 4.5-4s4.5 1.79 4.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 7.5a2 2 0 1 0 0-4M12.5 13.5c0-1.58-.95-2.96-2.38-3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSparkle = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1v2.5M8 12.5V15M15 8h-2.5M3.5 8H1M12.95 3.05l-1.77 1.77M4.82 11.18l-1.77 1.77M3.05 3.05l1.77 1.77M11.18 11.18l1.77 1.77" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5.5 8l1.75 1.75L10.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M12 4.5l-.5 8.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1L4 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconOldWebsite = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M2 6h12M5 3v3M11 3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconSortArrow = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: 4, opacity: 0.4 }}>
    <path d="M5 1v8M2 6l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Column header type icons (Orbital-style) ── */
const ThIcon = styled.span`
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  opacity: 0.45;
  vertical-align: middle;
  svg { width: 12px; height: 12px; }
`;
const IconFieldText = () => (
  <ThIcon><svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="1" y="10" fontSize="10" fontWeight="700" fill="currentColor">A</text></svg></ThIcon>
);
const IconFieldTag = () => (
  <ThIcon><svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 3h10M1 6h7M1 9h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg></ThIcon>
);
const IconFieldDate = () => (
  <ThIcon><svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1"/>
    <path d="M1 5h10M4 1v2M8 1v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg></ThIcon>
);
const IconFieldLink = () => (
  <ThIcon><svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 7l2-2M4.5 8.5a2 2 0 0 1 0-2.83l.7-.7M7.5 3.5a2 2 0 0 1 0 2.83l-.7.7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg></ThIcon>
);
const IconFieldNum = () => (
  <ThIcon><svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><text x="0" y="10" fontSize="9" fontWeight="700" fill="currentColor">#</text></svg></ThIcon>
);

const IconLeadScraper = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="currentColor"/>
    <path d="M13 17a7 7 0 0 1 14 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="20" cy="15" r="3.5" stroke="white" strokeWidth="1.8"/>
    <path d="M11 28c0-3.87 4.03-7 9-7s9 3.13 9 7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

/* ── Avatar color from name hash ── */

const AVATAR_COLOR_KEYS = ['blue', 'accent', 'blue', 'green', 'red', 'amber', 'accent', 'blue'] as const;
const hashColorIndex = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLOR_KEYS.length;
};

/* 20 distinct SVG paths (16×16 viewBox) for company avatars */
const AVATAR_ICONS: string[] = [
  /* building */    'M3 2h10v12H3V2zm2 2h2v2H5zm4 0h2v2H9zM5 8h2v2H5zm4 0h2v2H9zM6 12h4v2H6z',
  /* briefcase */   'M4 5h8a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM6 5V3.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V5M3 8h10',
  /* globe */       'M8 1a7 7 0 100 14A7 7 0 008 1zM1 8h14M8 1c2 2 3 4 3 7s-1 5-3 7c-2-2-3-4-3-7s1-5 3-7z',
  /* rocket */      'M8 14s-4-2-4-7c0-3 2-5 4-6 2 1 4 3 4 6 0 5-4 7-4 7zM6 9.5a2 2 0 104 0 2 2 0 00-4 0M5 12l-2 2M11 12l2 2',
  /* chart */       'M2 14V8l3-2v8zm4 0V5l3-1v10zm4 0V3l3-1v12z',
  /* lightbulb */   'M8 1a4.5 4.5 0 00-1.5 8.75V12h3V9.75A4.5 4.5 0 008 1zM6.5 13h3M6.5 14h3',
  /* gear */        'M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13',
  /* target */      'M8 1a7 7 0 100 14A7 7 0 008 1zM8 4a4 4 0 100 8 4 4 0 000-8zM8 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  /* store */       'M2 6l1-4h10l1 4M2 6v8h12V6M2 6h12M6 10h4v4H6z',
  /* lab */         'M6 1v5L2 13a1 1 0 001 1h10a1 1 0 001-1L10 6V1M5 1h6M4.5 10h7',
  /* truck */       'M1 3h9v7H1V3zm9 2h3l2 3v4h-5V5zM4 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM12 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  /* signal */      'M2 14V10M5 14V7M8 14V4M11 14V2M14 14V5',
  /* shield */      'M8 1L2 4v4c0 4 3 6 6 7 3-1 6-3 6-7V4L8 1zM6 8l2 2 3-4',
  /* diamond */     'M3 6l5-5 5 5-5 9-5-9zM1 6h14',
  /* leaf */        'M3 14c0-6 4-10 10-11-1 6-5 10-10 10V14zM3 14c2-2 4-3 6-3',
  /* bolt */        'M9 1L4 8h4l-1 7 5-7H8l1-7z',
  /* cube */        'M2 5l6-3 6 3v6l-6 3-6-3V5zM2 5l6 3M8 8v6M14 5l-6 3',
  /* users */       'M6 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5M11 4.5a2.5 2.5 0 110 5M12 9.5c2 .5 3 2 3 4.5',
  /* pin */         'M8 1a5 5 0 00-5 5c0 4 5 9 5 9s5-5 5-9a5 5 0 00-5-5zm0 3a2 2 0 110 4 2 2 0 010-4z',
  /* wrench */      'M4 12l6-6M14 4l-3 3-2.5-2.5L11.5 1.5a4 4 0 00-5 1L4 5l7 7 2.5-2.5a4 4 0 001-5z',
];
const hashIcon = (name: string): number => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % AVATAR_ICONS.length;
};
const AvatarIcon: React.FC<{ name: string }> = ({ name }) => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <path d={AVATAR_ICONS[hashIcon(name)]} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Layout ── */

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const PageCard = styled.div`
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: ${({ theme }) => theme.radii.card}px;
  padding: 24px;
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.md}px;
`;

const Breadcrumb = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before {
    content: '/';
    margin-right: ${({ theme }) => theme.spacing.sm}px;
  }
  a {
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
`;

const TitleRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PageTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PageSub = styled.p`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 2px 0 0;
`;

/* ── Quarter filter + tag ── */

const QuarterTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 99px;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #2d8a4e;
  background: #e6f4ea;
  border: 1px solid #b7dfbf;
  margin-left: 4px;
  flex-shrink: 0;
  line-height: 1.4;
`;

/* ── Header Card (title + buttons + stats in one box) ── */

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const HeaderBtns = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  ${media.tabletDown} {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
    gap: 8px;
  }
`;

const FloatingToast = styled.div<{ $error?: boolean }>`
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ $error, theme }) => $error ? theme.strong.mauve : theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  border: 1px solid ${({ $error, theme }) => $error ? `${theme.strong.mauve}40` : theme.colors.border};
  animation: toastSlide 3.5s ease-out forwards;
  pointer-events: none;
  @keyframes toastSlide {
    0% { opacity: 0; transform: translateX(-50%) translateY(-12px); }
    8% { opacity: 1; transform: translateX(-50%) translateY(0); }
    75% { opacity: 1; }
    100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
  }
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md}px;
  flex-wrap: wrap;
  ${media.tabletDown} {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
`;

const ProfileIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textInverted};
  flex-shrink: 0;
  svg { width: 28px; height: 28px; }
  ${media.tabletDown} { width: 44px; height: 44px; svg { width: 22px; height: 22px; } }
`;

const ProfileInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ProfileTitle = styled.h2`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};

  .count-number {
    font-size: 1.5rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.accent};
  }
`;

const HeaderDivider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: 0;
`;

const StatCardsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  ${media.tablet} { flex-wrap: wrap; }
  ${media.mobile} { flex-wrap: wrap; }
`;

const StatCard = styled.div<{ $accent: string }>`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px 24px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-right: none; }
  ${media.tablet} { padding: 10px 16px; gap: 6px; }
  ${media.mobile} { border-right: none; padding: 8px 16px; }
`;

const StatCardWatermark = styled.span<{ $color: string }>`
  display: none;
`;

/* Watermark SVG icons for stat cards */
const WmUsers = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const WmEdit = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const WmClock = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const WmCheck = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const StatCardLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const StatCardValue = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`;

const StatCardNumber = styled.span<{ $color: string }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ $color, theme }) => (theme.colors as any)[$color] || theme.colors.accent};
  line-height: 1;
`;

const StatCardUnit = styled.span`
  display: none;
`;

/* ── Circular Action Buttons with Tooltip ── */

const circleSpinGlow = keyframes`
  0% { transform: rotate(0deg); box-shadow: 0 0 0 0 rgba(108,122,36,0.5); }
  50% { box-shadow: 0 0 12px 4px rgba(108,122,36,0.35); }
  100% { transform: rotate(360deg); box-shadow: 0 0 0 0 rgba(108,122,36,0); }
`;

const CircleActionBtn = styled.button<{ $color?: string; $spinning?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &::after {
    content: attr(title);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%) scale(0.95);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.6875rem;
    font-weight: 500;
    white-space: nowrap;
    background: ${({ theme }) => theme.colors.textPrimary};
    color: ${({ theme }) => theme.colors.surface};
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s, transform 0.15s;
  }
  &:hover::after {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.accent};
    background: ${({ theme }) => `${theme.colors.accent}14`};
    transform: scale(1.1);
    box-shadow: 0 2px 8px ${({ theme }) => `${theme.colors.accent}25`};
  }
  &:active { transform: scale(0.95); }
  &:disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
  svg { width: 14px; height: 14px; }

  ${({ $spinning }) => $spinning && css`
    animation: ${circleSpinGlow} 0.8s ease-in-out;
    border-color: #6C7A24;
    color: #6C7A24;
    svg { animation: none; }
  `}
`;

const AutoCheckBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid ${({ $active, theme }) => $active ? theme.strong.olive : theme.colors.border};
  background: ${({ $active, theme }) => $active ? `${theme.strong.olive}14` : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.strong.olive : theme.colors.textSecondary};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  svg { width: 14px; height: 14px; }
  &:hover {
    border-color: ${({ theme }) => theme.strong.olive};
    color: ${({ theme }) => theme.strong.olive};
    background: ${({ theme }) => `${theme.strong.olive}14`};
  }
`;

/* ── Refresh icon ── */

const spinFloat = keyframes`
  0%   { transform: translateY(0) rotate(0deg); }
  50%  { transform: translateY(-3px) rotate(180deg); }
  100% { transform: translateY(0) rotate(360deg); }
`;

const RefreshIconWrap = styled.span<{ $spinning?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  ${({ $spinning }) => $spinning && css`animation: ${spinFloat} 0.8s ease-in-out infinite;`}
`;

const IconRefresh = ({ spinning }: { spinning?: boolean }) => (
  <RefreshIconWrap $spinning={spinning}>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 8a5.5 5.5 0 0 1-9.72 3.5M2.5 8a5.5 5.5 0 0 1 9.72-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.5 3v3.5H10M2.5 13v-3.5H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </RefreshIconWrap>
);

const StatsStrip = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  ${media.mobile} { flex-wrap: wrap; gap: 8px; }
`;

const StatItem = styled.div<{ $color: string }>`
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 20px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  &:first-child { padding-left: 0; }
  &:last-child { border-right: none; }
  ${media.mobile} { border-right: none; padding: 0 12px; }
`;

const StatNumber = styled.span<{ $color: string }>`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ $color, theme }) => (theme.colors as any)[$color] || $color};
`;

const StatLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textTertiary};
  white-space: nowrap;
`;

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
  &:active { opacity: 0.75; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${media.tabletDown} {
    width: 100%;
    justify-content: center;
    padding: 8px 12px;
    font-size: 0.75rem;
  }
`;

const AddBtnGreen = styled(AddBtn)`
  background: ${({ theme }) => theme.strong.olive};
`;

// ponytail: red danger button for "一鍵清空" — visually distinct from the
// green AddBtn so the user can't misclick.
const ClearBtn = styled(AddBtn)`
  background: linear-gradient(135deg, ${({ theme }) => theme.strong.mauve}, ${({ theme }) => theme.strong.mauve}cc);
  box-shadow: 0 1px 3px ${({ theme }) => theme.strong.mauve}33;
  &:hover:not(:disabled) {
    box-shadow: 0 3px 10px ${({ theme }) => theme.strong.mauve}40;
  }
`;

/* ── Tabs Row ── */

const TabsRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 999px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { display: none; }
  width: fit-content;
  ${media.mobile} {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    padding: 2px;
    gap: 1px;
  }
`;

const TabItem = styled.button<{ $active?: boolean; $color?: string }>`
  position: relative;
  z-index: 1;
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 20px;
  background: transparent;
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textSecondary};
  border: none;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  transition: color 0.2s;
  svg { flex-shrink: 0; color: ${({ theme }) => theme.strong.mauve}; }
  &:hover {
    background: ${({ $active }) => $active ? 'transparent' : 'rgba(0,0,0,0.04)'};
  }
  ${media.tabletDown} { padding: 8px 16px; }
  ${media.mobile} {
    flex: 1;
    padding: 5px 4px;
    font-size: 0.68rem;
    gap: 3px;
    justify-content: center;
    min-width: 0;
  }
`;

const TabSlider = styled.div<{ $left: number; $width: number }>`
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: ${({ $left }) => $left}px;
  width: ${({ $width }) => $width}px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 999px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  transition: left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1);
  z-index: 0;
`;

const TabNumber = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const StepBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 16px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 0.5625rem;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  flex-shrink: 0;
`;

const SubStepBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-size: 0.5rem;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  flex-shrink: 0;
`;

const TabLabel = styled.span<{ $active?: boolean }>`
  font-size: 0.875rem;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textTertiary};
`;

const ToolbarSep = styled.div`
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
`;

const SubPillRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  position: relative;
  ${media.tabletDown} { padding: 2px 12px; gap: 6px; flex-wrap: wrap; row-gap: 16px; }
`;

const SubPillTrack = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 999px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { display: none; }
  width: fit-content;
  flex-shrink: 0;
`;

const RowCheckbox = styled.input.attrs({ type: 'checkbox' })`
  width: 15px;
  height: 15px;
  accent-color: ${({ theme }) => theme.colors.textPrimary};
  cursor: pointer;
  margin: 0;
`;

const SUB_COLOR_KEYS: Record<string, string> = {
  '': 'textPrimary',
  to_enrich: 'textSecondary',
  to_analyze: 'textSecondary',
  draft_ready: 'textSecondary',
  email_draft: 'textSecondary',
  wa_draft: 'textSecondary',
  awaiting_reply: 'textSecondary',
  followed_up: 'textSecondary',
  no_reply: 'textSecondary',
};

const SubPill = styled.button<{ $active?: boolean; $color?: string }>`
  position: relative;
  z-index: 1;
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  font-size: 0.8rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  background: transparent;
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textSecondary};
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s;
  svg { flex-shrink: 0; width: 13px; height: 13px; color: ${({ theme }) => theme.strong.mauve}; }
  &:hover { background: ${({ $active }) => $active ? 'transparent' : 'rgba(0,0,0,0.04)'}; }
`;

const SubSlider = styled.div<{ $left: number; $width: number }>`
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: ${({ $left }) => $left}px;
  width: ${({ $width }) => $width}px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  transition: left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1);
  z-index: 0;
`;

/* ── Search Bar (inline in SubPillRow) ── */

const SearchWrap = styled.div`
  position: relative;
  width: 240px;
  margin-left: auto;
  ${media.tablet} { width: 180px; }
  ${media.mobile} { width: 100%; margin-left: 0; }
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.textTertiary};
  pointer-events: none;
  display: flex;
  align-items: center;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 16px 8px 36px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  font-size: 0.8125rem;
  outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  transition: border-color 0.15s, box-shadow 0.15s;
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
  &:focus {
    background: ${({ theme }) => theme.colors.surface};
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.accent}14;
  }
  &:hover:not(:focus) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

/* ── Custom Quarter Dropdown ── */

const QDropWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const QDropTrigger = styled.button<{ $open?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1.5px solid ${({ $open, theme }) => $open ? theme.strong.mauve : theme.colors.border};
  background: #fff;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.strong.mauve};
  }
  svg { flex-shrink: 0; transition: transform 0.2s; }
  ${({ $open }) => $open && `svg { transform: rotate(180deg); }`}
`;

const QDropMenu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 100%;
  background: #fff;
  border: 1.5px solid ${({ theme }) => theme.strong.mauve};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.10);
  padding: 4px;
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #D689BF66; border-radius: 99px; }
`;

const QDropItem = styled.button<{ $active?: boolean }>`
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: ${({ $active, theme }) => $active ? `${theme.strong.mauve}18` : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.strong.mauve : theme.colors.textPrimary};
  font-size: 0.8125rem;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s;
  &:hover {
    background: ${({ $active, theme }) => $active ? `${theme.strong.mauve}22` : 'rgba(0,0,0,0.04)'};
  }
`;

/* ── Table ── */

const Card = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  overflow: hidden;
`;

const TableWrap = styled.div`
  overflow-x: auto;
  padding: 0;
  ${media.tablet} {
    -webkit-overflow-scrolling: touch;
    &::-webkit-scrollbar { height: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: #D689BF66; border-radius: 3px; }
    &::-webkit-scrollbar-thumb:hover { background: #D689BF99; }
  }
`;

const Table = styled.table`
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.8rem;
  min-width: 960px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
  th:nth-child(1) { width: 4%; }    /* # / checkbox */
  th:nth-child(2) { width: 34%; }   /* name */
  th:nth-child(3) { width: 16%; }   /* reply */
  th:nth-child(4) { width: 14%; }   /* source user / tech */
  th:nth-child(5) { width: 14%; }   /* imported */
  th:nth-child(6) { width: 9%; }    /* action */
  th, td {
    padding: 7px 12px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  th {
    font-weight: 600;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    background: ${({ theme }) => theme.colors.canvas};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    user-select: none;
    cursor: default;
  }
  td {
    background: ${({ theme }) => theme.colors.surface};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    font-size: 0.78rem;
    line-height: 1.3;
  }
  ${media.tablet} {
    min-width: 860px;
    font-size: 0.75rem;
    th, td { padding: 6px 10px; }
    th { font-size: 0.6875rem; }
  }
  ${media.mobile} {
    min-width: 640px;
    font-size: 0.75rem;
    th, td { padding: 5px 8px; }
    th { font-size: 0.625rem; }
  }
`;

const TRow = styled.tr<{ $even?: boolean; $collapsed?: boolean }>`
  transition: background 0.15s;
  cursor: pointer;
  &:hover td {
    background: ${({ theme, $collapsed }) => $collapsed ? 'transparent' : theme.colors.canvas};
  }
  td {
    overflow: hidden;
    transition: padding 0.3s ease, max-height 0.3s ease, opacity 0.3s ease, border-color 0.3s ease;
  }
  &:last-child td { border-bottom: none; }
  ${({ $collapsed }) => $collapsed && `
    pointer-events: none;
    td {
      padding-top: 0;
      padding-bottom: 0;
      max-height: 0;
      opacity: 0;
      border-color: transparent;
      line-height: 0;
    }
  `}
`;

const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.div<{ $colorIndex: number }>`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: ${({ $colorIndex, theme }) => {
    const key = AVATAR_COLOR_KEYS[$colorIndex] || 'blue';
    return `${(theme.colors as any)[key]}22`;
  }};
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: none;
  line-height: 1;
  ${media.tablet} { width: 28px; height: 28px; font-size: 0.85rem; svg { width: 14px; height: 14px; } }
`;

const NameText = styled.div`
  display: flex;
  flex-direction: column;
  strong {
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.8125rem;
  }
  small {
    color: ${({ theme }) => theme.colors.textTertiary};
    font-size: 0.6875rem;
    margin-top: 1px;
  }
`;

/* Status badge — uses only the 4 theme pastel colours + black text */
const STATUS_THEME_MAP: Record<string, 'blue' | 'gold' | 'mauve' | 'olive'> = {
  new:            'blue',
  pending:        'gold',
  contacted:      'mauve',
  confirmed:      'olive',
  qualified:      'blue',
  rejected:       'mauve',
  draft:          'gold',
  interested:     'olive',
  meeting:        'olive',
  not_interested: 'mauve',
};

const STATUS_I18N_KEY: Record<string, string> = {
  new: 'leads.statusNew',
  pending: 'leads.statusPending',
  contacted: 'leads.statusContacted',
  confirmed: 'leads.statusConfirmed',
  qualified: 'leads.statusQualified',
  rejected: 'leads.statusRejected',
  draft: 'leads.statusDraft',
  interested: 'leads.statusInterested',
  meeting: 'leads.statusMeeting',
  not_interested: 'leads.statusNotInterested',
};

const StatusBadge = styled.span<{ $status?: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  ${({ $status, theme }) => {
    const key = STATUS_THEME_MAP[$status ?? 'new'] ?? 'blue';
    const fg = (theme.strong as any)[key];
    return `color: ${fg}; background: ${fg}1a; border: 1px solid ${fg}40;`;
  }}
`;

/* Status dot — small colored circle next to name */
const STATUS_ICON_META: Record<string, { colorKey: 'blue' | 'gold' | 'mauve' | 'olive'; path: string; hasNew?: boolean }> = {
  new:       { colorKey: 'olive', path: 'M10 3L7 9h3l-2 5', hasNew: true },                                        // lightning bolt
  pending:   { colorKey: 'gold',  path: 'M10 5v3.5l2 1.5M10 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z' },           // clock
  contacted: { colorKey: 'mauve', path: '__handshake__' }, // handshake (special render)
  confirmed: { colorKey: 'olive', path: 'M5 10l3 3 5-6' },
  qualified: { colorKey: 'olive', path: 'M10 3L7 9h3l-2 5', hasNew: true },
  rejected:  { colorKey: 'mauve', path: 'M6 6l8 8M14 6l-8 8' },
  draft:     { colorKey: 'gold',  path: 'M10 5v3.5l2 1.5M10 2.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z' },
  interested:{ colorKey: 'olive', path: 'M5 10l3 3 5-6' },
  meeting:   { colorKey: 'olive', path: 'M5 10l3 3 5-6' },
  not_interested: { colorKey: 'mauve', path: 'M6 6l8 8M14 6l-8 8' },
};

const HANDSHAKE_FA_PATH = 'M323.4 85.2l-96.8 78.4c-16.1 13-19.2 36.4-7 53.1c12.9 17.8 38 21.3 55.3 7.8l99.3-77.2c7-5.4 17-4.2 22.5 2.8s4.2 17-2.8 22.5l-20.9 16.2L550.2 352H592c26.5 0 48-21.5 48-48V176c0-26.5-21.5-48-48-48H516h-4-.7l-3.9-2.5L434.8 79c-15.3-9.8-33.2-15-51.4-15c-21.8 0-43 7.5-60 21.2zm22.8 124.4l-51.7 40.2C263 274.4 217.3 268 193.7 235.6c-22.2-30.5-16.6-73.1 12.7-96.8l83.2-67.3c-11.6-4.9-24.1-7.4-36.8-7.4C234 64 215.7 69.6 200 80l-72 48H48c-26.5 0-48 21.5-48 48V304c0 26.5 21.5 48 48 48H156.2l91.4 83.4c19.6 17.9 49.9 16.5 67.8-3.1c5.5-6.1 9.2-13.2 11.1-20.6l17 15.6c19.5 17.9 49.9 16.6 67.8-2.9c4.5-4.9 7.8-10.6 9.9-16.5c19.4 13 45.8 10.3 62.1-7.5c17.9-19.5 16.6-49.9-2.9-67.8l-134.2-123z';

const StatusIcon = ({ $status, title }: { $status?: string; title?: string }) => {
  const theme = useTheme() as any;
  const { t } = useTranslation();
  const meta = STATUS_ICON_META[$status ?? 'new'] ?? STATUS_ICON_META.new;
  const color = (theme.strong as any)[meta.colorKey];
  const size = 20;
  const isHandshake = meta.path === '__handshake__';
  return (
    <svg width={meta.hasNew ? 36 : size} height={size} viewBox={meta.hasNew ? '0 0 36 20' : '0 0 20 20'} style={{ flexShrink: 0, overflow: 'visible' }} aria-label={title}>
      <circle cx="10" cy="10" r="9.5" fill={`${color}22`} stroke={color} strokeWidth="1" />
      {isHandshake ? (
        <g transform="translate(3.2, 4) scale(0.0215)">
          <path d={HANDSHAKE_FA_PATH} fill={color} />
        </g>
      ) : (
        <path d={meta.path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {meta.hasNew && (
        <g>
          <rect x="18" y="0" width="18" height="9" rx="3" fill={color} />
          <text x="27" y="7" textAnchor="middle" fill="#fff" fontSize="6.5" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">{t('common.new')}</text>
        </g>
      )}
    </svg>
  );
};

const TagList = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.6875rem;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ActionBtn = styled.button<{ $color: string }>`
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: ${({ $color }) => $color}22;
  color: ${({ $color }) => $color};
  cursor: pointer;
  margin-right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s, color 0.15s;
  box-shadow: none;
  &:hover {
    transform: translateY(-1px);
    background: ${({ $color }) => $color};
    color: ${({ theme }) => theme.colors.textInverted};
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
`;

const DeleteIconBtn = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textTertiary};
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: color 0.15s, transform 0.15s;
  &:hover {
    color: ${({ theme }) => theme.strong.mauve};
    transform: translateY(-1px);
  }
`;

const EmptyCell = styled.td`
  text-align: center;
  padding: 48px ${({ theme }) => theme.spacing.md}px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: 0.875rem;
  & > div { display: flex; flex-direction: column; align-items: center; gap: 12px; }
`;

const EmptyIllustrationWrap = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.border};
  .fill-muted { fill: ${({ theme }) => theme.colors.surfaceMuted}; }
  .stroke-border { stroke: ${({ theme }) => theme.colors.border}; }
`;
const EmptyLeadsIllustration = () => (
  <EmptyIllustrationWrap>
    <svg width="110" height="85" viewBox="0 0 110 85" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="12" width="80" height="56" rx="8" className="fill-muted stroke-border" strokeWidth="1.5"/>
      <circle cx="40" cy="34" r="8" className="fill-muted stroke-border" strokeWidth="1"/>
      <rect x="54" y="30" width="30" height="3" rx="1.5" fill="currentColor" opacity="0.5"/>
      <rect x="54" y="37" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.3"/>
      <line x1="20" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
      <circle cx="40" cy="58" r="5" className="fill-muted" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5"/>
      <rect x="54" y="55" width="25" height="3" rx="1.5" fill="currentColor" opacity="0.3"/>
      <rect x="54" y="61" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
    </svg>
  </EmptyIllustrationWrap>
);

/* ── Date Group Header ── */

const GroupBar = styled.tr<{ $group: string }>`
  td {
    padding: 6px 0;
    border-bottom: none;
  }
`;

const GroupBarInner = styled.div<{ $group: string; $collapsed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  background: ${({ $group, theme }) => {
    if ($group === 'today') return theme.status.contacted.bg;
    if ($group === 'yesterday') return theme.status.pending.bg;
    return theme.colors.surfaceMuted;
  }};
  color: ${({ $group, theme }) => {
    if ($group === 'today') return theme.colors.accent;
    if ($group === 'yesterday') return theme.strong.gold;
    return theme.colors.textSecondary;
  }};
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;

  &:hover { opacity: 0.85; }

  &::after {
    content: '';
    margin-left: auto;
    width: 0; height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: ${({ $collapsed }) => $collapsed ? 'none' : '5px solid currentColor'};
    border-bottom: ${({ $collapsed }) => $collapsed ? '5px solid currentColor' : 'none'};
    opacity: 0.5;
  }
`;

const getDateGroup = (dateStr?: string): string => {
  if (!dateStr) return 'earlier';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 864e5);
  const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (itemDate.getTime() >= today.getTime()) return 'today';
  if (itemDate.getTime() >= yesterday.getTime()) return 'yesterday';
  return 'earlier';
};

/* ── Pagination ── */

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  ${media.mobile} { flex-direction: column; gap: 8px; }
`;

const PageBtns = styled.div`
  display: flex;
  gap: 4px;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
  padding: 5px 12px;
  border: 1px solid ${({ $active, theme }) => $active ? 'transparent' : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ $active, theme }) => $active
    ? theme.colors.accent
    : theme.colors.surface};
  color: ${({ $active, theme }) => $active ? theme.colors.textInverted : theme.colors.textSecondary};
  font-size: 0.75rem;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  cursor: pointer;
  box-shadow: ${({ $active }) => $active
    ? '0 1px 2px rgba(15,23,42,0.08)'
    : '0 1px 2px rgba(15,23,42,0.04)'};
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    ${({ $active, theme }) => $active ? '' : `background: ${theme.colors.surfaceMuted}; border-color: ${theme.colors.borderStrong};`}
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

/* ── Modal ── */

const modalFadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
const modalFadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;
const modalSlideIn = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;
const modalSlideOut = keyframes`
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(8px) scale(0.97); }
`;

const Overlay = styled.div<{ $closing?: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${({ $closing }) => $closing ? modalFadeOut : modalFadeIn} 0.2s ease-out forwards;
`;

const Modal = styled.div<{ $closing?: boolean }>`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  width: 520px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  animation: ${({ $closing }) => $closing ? modalSlideOut : modalSlideIn} 0.2s ease-out forwards;
  ${media.mobile} { width: 95%; }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const CloseBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.accent};
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => `${theme.colors.accent}1a`};
  }
`;

const ModalBody = styled.div`
  padding: ${({ theme }) => theme.spacing.lg}px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  padding: 9px ${({ theme }) => theme.spacing.sm}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem;
  outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  box-sizing: border-box;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: border-color 0.15s, box-shadow 0.15s;
  &:hover:not(:focus) { border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.accent}1f, 0 1px 2px rgba(15,23,42,0.04);
  }
`;

const Textarea = styled.textarea`
  padding: 9px ${({ theme }) => theme.spacing.sm}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem;
  outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  box-sizing: border-box;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: border-color 0.15s, box-shadow 0.15s;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  &:hover:not(:focus) { border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.accent}1f, 0 1px 2px rgba(15,23,42,0.04);
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceMuted};
`;

const PrimaryBtn = styled.button`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: ${({ theme }) => theme.shadows.card};
  transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    opacity: 0.9;
    box-shadow: 0 2px 8px rgba(15,23,42,0.1);
  }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryBtn = styled.button`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};

  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.8125rem;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    transform: translateY(-1px);
  }
`;

/* ── Footer ── */

const Footer = styled.footer`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  a {
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    margin-left: ${({ theme }) => theme.spacing.md}px;
  }
  a:hover { text-decoration: underline; }
`;

/* ── Detail Panel ── */

const dpFadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const dpSlideUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const dpFadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;

const dpSlideDown = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(16px); }
`;

const glowPulseGreen = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(76,175,80,0.3); }
  50% { box-shadow: 0 0 16px rgba(76,175,80,0.5), 0 0 32px rgba(76,175,80,0.2); }
`;
const glowPulseGold = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(255,193,7,0.35); }
  50% { box-shadow: 0 0 16px rgba(255,193,7,0.55), 0 0 32px rgba(255,193,7,0.2); }
`;

const DpOverlay = styled.div<{ $closing?: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0,0,0,0.45);
  animation: ${({ $closing }) => $closing ? dpFadeOut : dpFadeIn} 0.2s ease-out forwards;
`;

const DpPanel = styled.div<{ $closing?: boolean }>`
  position: absolute;
  display: flex;
  flex-direction: column;
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card + 2}px;
  overflow: hidden;
  animation: ${({ $closing }) => $closing ? dpSlideDown : dpSlideUp} 0.25s ease-out forwards;
  &::after {
    content: '';
    position: absolute;
    left: 300px;
    top: 0;
    bottom: 0;
    width: 0.5px;
    background: ${({ theme }) => theme.colors.border};
    z-index: 3;
    pointer-events: none;
    display: none;
  }
  @media (min-width: 1100px) {
    &::after { display: block; }
  }
  @media (max-width: 1099px) {
    inset: 6px !important;
    width: calc(100vw - 12px) !important;
    height: calc(100vh - 12px) !important;
    border-radius: 14px;
  }
`;

const DpHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: transparent;
  cursor: grab;
  min-height: 24px;
  &:active { cursor: grabbing; }
  ${media.tablet} { padding: 14px 28px; }
`;

const DpHeaderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DpCompanyName = styled.h2`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DpHeaderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  google_maps: 'Google Maps',
  google_search: 'Google Search',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  manual: '手動輸入',
  import: '批量匯入',
  referral: '推薦',
  website: '官網',
  cold_outreach: '主動開發',
};
const getSourceDisplay = (source: string): string => SOURCE_DISPLAY_NAMES[source] || source;

const STATUS_PILL_COLORS: Record<string, { bg: string; fg: string }> = {
  new:       { bg: '#e8f5e9', fg: '#2e7d32' },
  pending:   { bg: '#fff3e0', fg: '#e65100' },
  contacted: { bg: '#e3f2fd', fg: '#1565c0' },
  approved:  { bg: '#e8f5e9', fg: '#2e7d32' },
  rejected:  { bg: '#fce4ec', fg: '#c62828' },
};
const DpStatusPill = styled.span<{ $status?: string }>`
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 99px;
  text-transform: lowercase;
  background: ${({ $status }) => STATUS_PILL_COLORS[$status || '']?.bg || '#f0f0f0'};
  color: ${({ $status }) => STATUS_PILL_COLORS[$status || '']?.fg || '#888'};
`;

const DpCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.colors.textTertiary};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  font-size: 18px;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const DpBody = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 0;
  overflow-y: auto;

  /* Tablet: info left + journey right on top, emails full-width bottom */
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "info journey"
    "emails emails";

  ${media.mobile} {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
    grid-template-areas:
      "info"
      "journey"
      "emails";
  }

  /* Desktop: left sidebar (info+journey stacked) + right emails */
  @media (min-width: 1100px) {
    grid-template-columns: 300px 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas:
      "info emails"
      "journey emails";
    overflow: hidden;
  }
`;

const DpColLeft = styled.div`
  grid-area: info;
  padding: 10px 16px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: transparent;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #D689BF99; border-radius: 99px; }
  &::-webkit-scrollbar-thumb:hover { background: #D689BFCC; }
  ${media.tablet} { padding: 14px 28px; }
  @media (min-width: 1100px) {
    padding: 4px 20px 10px 28px;
  }
`;

const DpColJourney = styled.div`
  grid-area: journey;
  padding: 10px 16px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: transparent;
  border-left: none;
  ${media.tablet} { padding: 14px 28px; }
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #D689BF99; border-radius: 99px; }
  &::-webkit-scrollbar-thumb:hover { background: #D689BFCC; }
  ${media.mobile} {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
  @media (min-width: 1100px) {
    padding: 4px 20px 10px 28px;
  }
`;

const DpTabSection = styled.div`
  position: relative;
  margin-top: 14px;
  &:first-of-type { margin-top: 0; }
`;

const DpTabLabel = styled.span`
  display: block;
  padding: 0 0 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textTertiary};
  user-select: none;
`;

const DpTabCard = styled.div`
  position: relative;
  padding: 4px 0;
`;

const DpCollapsibleHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 2px 0;
  @media (min-width: 1100px) { display: none; }
`;
const DpCollapsibleBody = styled.div<{ $open?: boolean }>`
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  @media (min-width: 1100px) { display: flex; margin-top: 0; }
`;

const DpColCenter = styled.div`
  grid-area: emails;
  padding: 12px 16px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #D689BF99; border-radius: 99px; }
  &::-webkit-scrollbar-thumb:hover { background: #D689BFCC; }
  ${media.tablet} { padding: 14px 28px; }
  @media (min-width: 1100px) {
    padding: 4px 20px 10px;
    border-top: none;
  }
`;

const DpGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const DpField = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 3px 0;
`;

const DpFieldLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textTertiary};
  min-width: 52px;
  flex-shrink: 0;
  padding-top: 1px;
`;

const DpFieldValue = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  word-break: break-word;
  flex: 1;
  min-width: 0;
  line-height: 1.4;
  a { color: ${({ theme }) => theme.colors.accent}; text-decoration: none; &:hover { text-decoration: underline; } }
`;

const DpFieldIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  color: ${({ theme }) => theme.colors.textTertiary};
  flex-shrink: 0;
  svg { width: 12px; height: 12px; }
`;

const DpDivider = styled.div`
  height: 0;
  margin: 6px 0;
`;

const DpSectionTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #D689BF;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const DpSectionContent = styled.div`
  padding-left: 12px;
`;

const DpTagList = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const DpTag = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const DpTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const DpTimelineItem = styled.div<{ $active?: boolean; $last?: boolean }>`
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 0;
`;

const DpTimelineDotWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 14px;
  flex-shrink: 0;
  padding-top: 4px;
`;

const DpTimelineDot = styled.span<{ $active?: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.border};
`;

const DpTimelineLine = styled.span`
  width: 1px;
  flex: 1;
  background: ${({ theme }) => theme.colors.border};
  margin-top: 4px;
  min-height: 10px;
`;

const DpTimelineContent = styled.div`
  flex: 1;
  padding: 1px 0 8px 8px;
`;

const DpTimelineText = styled.span<{ $active?: boolean }>`
  font-size: 0.75rem;
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textTertiary};
  font-weight: ${({ $active }) => $active ? 500 : 400};
  line-height: 1.3;
`;

const DpTimelineTime = styled.div`
  font-size: 0.625rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-top: 1px;
`;

const DpFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 20px;
`;

const DpActionBtn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  border: 0.5px solid ${({ $variant }) =>
    $variant === 'primary' ? '#D689BF' :
    $variant === 'danger' ? '#e57373' :
    '#999'};
  background: transparent;
  color: ${({ $variant, theme }) =>
    $variant === 'primary' ? '#D689BF' :
    $variant === 'danger' ? '#e57373' :
    theme.colors.textPrimary};
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
`;

/* ── Helpers ── */

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const NEXT_STATUS: Record<string, string> = {
  new: 'pending',
  '': 'pending',
  pending: 'contacted',
};

const REPLY_ICONS: Record<string, string> = {
  interested:         'M8 2l1.5 3.5L13 6l-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5z',   // star
  interested_pending: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v4l2.5 1.5',                        // clock
  not_interested:     'M8 1a7 7 0 100 14A7 7 0 008 1zM5.5 5.5l5 5M10.5 5.5l-5 5',            // X
  meeting:            'M2 3h12v10H2V3zm0 3h12M5 1v3M11 1v3',                                  // calendar
  auto_reply:         'M1 3h14v10H1V3zm0 0l7 5 7-5',                                          // mail
  question:           'M8 1a7 7 0 100 14A7 7 0 008 1zM6.5 5.5a1.5 1.5 0 013 0c0 1-1.5 1.25-1.5 2.5M8 11h.01', // ?
  unprocessed:        'M8 1a7 7 0 100 14A7 7 0 008 1zM8 5v3M8 10h.01',                        // info
  draft_pending:      'M12.146 1.146a.5.5 0 01.708 0l2 2a.5.5 0 010 .708l-9.5 9.5a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168l9.5-9.5z', // pen
  awaiting:           'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v4l2.5 1.5',                        // clock
};

const getReplyCategoryLabel = (t: (k: string, opts?: any) => string, theme: any) => ({
  interested:         { text: t('leads.replyInterested'),        bg: theme.pastel.olive,  fg: theme.colors.textPrimary, icon: 'interested' },
  interested_pending: { text: t('leads.replyInterestedPending'), bg: theme.pastel.gold,   fg: theme.colors.textPrimary, icon: 'interested_pending' },
  not_interested:     { text: t('leads.replyNotInterested'),     bg: theme.pastel.mauve,  fg: theme.colors.textPrimary, icon: 'not_interested' },
  meeting:            { text: t('leads.replyMeeting'),           bg: theme.pastel.blue,   fg: theme.colors.textPrimary, icon: 'meeting' },
  auto_reply:         { text: t('leads.replyAutoReply'),         bg: theme.pastel.gold,   fg: theme.colors.textPrimary, icon: 'auto_reply' },
  question:           { text: t('leads.replyProcessing'),        bg: theme.pastel.blue,   fg: theme.colors.textPrimary, icon: 'question' },
} as Record<string, { text: string; bg: string; fg: string; icon: string }>);

/* ── DEV MOCK DATA ── */
const MOCK_LEADS: Lead[] = [
  {
    _id: 'mock-1', company_name: 'Acme Corp', email: 'hello@acme.com', phone: '+852 9123 4567',
    website: 'https://acme.com', address: '123 Queen\'s Road, Central, HK',
    source: 'Google Maps', status: 'new', rating: '4.5', industry_tags: ['SaaS', 'B2B'],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    _imported_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    _id: 'mock-2', company_name: 'ByteDance HK', email: 'contact@bytedance.hk', phone: '+852 6789 0123',
    website: 'https://bytedance.hk', address: '100 Gloucester Road, Wan Chai',
    source: 'LinkedIn', status: 'pending', rating: '3.8', industry_tags: ['AI', 'Social Media', 'Tech'],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    _has_email_draft: true,
  },
  {
    _id: 'mock-3', company_name: 'StarTech Solutions', email: 'info@startech.io',
    source: 'Referral', status: 'contacted', rating: '4.2', industry_tags: ['FinTech'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    _replied: false, _has_email_draft: false,
  },
  {
    _id: 'mock-4', company_name: 'Dragon Logistics', email: 'ops@dragonlog.com', phone: '+86 138 0000 1234',
    website: 'https://dragonlogistics.cn', address: 'Tech Park, Nanshan, Shenzhen',
    source: 'Cold Email', status: 'contacted', rating: '4.0', industry_tags: ['Logistics', 'Supply Chain'],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    _replied: true, _reply_category: 'interested', _reply_summary: 'Interested in partnership, wants a demo next week.',
    _reply_sentiment: 'positive', _reply_next_step: 'Schedule demo call', _reply_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: 'mock-5', company_name: 'Neon Digital', email: 'team@neondigital.co',
    source: 'Website', status: 'contacted', industry_tags: ['Marketing', 'Digital'],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    _replied: true, _reply_category: 'not_interested', _reply_summary: 'Not looking for new vendors at this time.',
    _reply_sentiment: 'negative', _reply_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    _id: 'mock-6', company_name: 'Zenith Labs', email: 'hello@zenithlabs.ai', phone: '+852 5555 6666',
    website: 'https://zenithlabs.ai',
    source: 'Google Maps', status: 'contacted', rating: '4.8', industry_tags: ['AI', 'Healthcare'],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    _replied: true, _reply_category: 'meeting', _reply_summary: 'Wants to schedule a meeting to discuss integration.',
    _reply_sentiment: 'positive', _reply_next_step: 'Confirm meeting time', _pending_meeting: true,
    _reply_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    _id: 'mock-7', company_name: 'AutoReply Inc', email: 'support@autoreply.biz',
    source: 'Cold Email', status: 'contacted',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    _replied: true, _reply_category: 'auto_reply', _reply_summary: 'Out of office auto-reply received.',
    _reply_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    _id: 'mock-8', company_name: 'Quantum Finance', email: 'cfo@quantumfin.hk', phone: '+852 2888 9999',
    website: 'https://quantumfinance.hk', address: 'IFC Tower, 38/F, Central, HK',
    source: 'Referral', status: 'contacted', rating: '5.0', industry_tags: ['FinTech', 'Banking'],
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    _replied: true, _reply_category: 'question', _reply_summary: 'Asked about pricing and compliance requirements.',
    _reply_sentiment: 'neutral', _reply_next_step: 'Send pricing sheet',
    _reply_at: new Date(Date.now() - 86400000 * 1).toISOString(), _followup_count: 2,
  },
  {
    _id: 'mock-9', company_name: 'FreshBrew Coffee', email: 'owner@freshbrew.hk',
    source: 'Google Maps', status: null, rating: '4.3', industry_tags: ['F&B', 'Retail'],
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'mock-10', company_name: 'Peak Ventures', email: 'invest@peakvc.com', phone: '+852 3000 1111',
    website: 'https://peakventures.com',
    source: 'LinkedIn', status: 'contacted', rating: '4.7', industry_tags: ['VC', 'Investment'],
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    _replied: true, _reply_category: 'interested', _pending_meeting: true,
    _reply_summary: 'Very interested, wants to meet founders.', _reply_sentiment: 'positive',
    _reply_at: new Date(Date.now() - 86400000 * 0.5).toISOString(),
  },
];

const MOCK_EMAILS: EmailItem[] = [
  // Dragon Logistics — sent
  { _id: 'em-1', lead_id: 'mock-4', company_name: 'Dragon Logistics', to_email: 'ops@dragonlog.com',
    subject: 'Partnership Opportunity — MADMAD x Dragon Logistics',
    body: '<p>Hi there,</p><p>We\'d love to explore a potential partnership. Our AI-driven email automation could significantly reduce your outreach costs.</p><p>Would you be available for a 15-min call next week?</p><p>Best,<br/>MADMAD Team</p>',
    status: 'sent', _type: undefined, created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    sent_at: new Date(Date.now() - 86400000 * 8).toISOString() } as any,
  // Dragon Logistics — followup, pending
  { _id: 'em-2', lead_id: 'mock-4', company_name: 'Dragon Logistics', to_email: 'ops@dragonlog.com',
    subject: 'Re: Partnership Opportunity — Follow-up',
    body: '<p>Hi again,</p><p>Just following up on our previous email. We have a few time slots available for a demo this week. Let me know what works!</p>',
    status: 'pending', _type: 'followup', created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    _summary: 'Follow-up on demo scheduling. Two time slots proposed for this week.' } as any,
  // ByteDance HK — draft pending review
  { _id: 'em-3', lead_id: 'mock-2', company_name: 'ByteDance HK', to_email: 'contact@bytedance.hk',
    subject: 'AI Email Automation for ByteDance HK',
    body: '<p>Dear ByteDance team,</p><p>We noticed your impressive growth in the HK market. Our platform could help streamline your B2B outreach with AI-powered email drafting and scheduling.</p><p>Would love to chat!</p>',
    status: 'pending', _type: undefined, created_at: new Date(Date.now() - 86400000).toISOString(),
    _reply_category: undefined },
  // Neon Digital — rejected
  { _id: 'em-4', lead_id: 'mock-5', company_name: 'Neon Digital', to_email: 'team@neondigital.co',
    subject: 'Digital Marketing Collaboration',
    body: '<p>Hi Neon Digital,</p><p>Love your portfolio! We think there\'s a great synergy between our platforms.</p>',
    status: 'rejected', _type: undefined, created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
    error: { rejected_reason: 'Lead expressed no interest' } },
  // Zenith Labs — approved, ready to send
  { _id: 'em-5', lead_id: 'mock-6', company_name: 'Zenith Labs', to_email: 'hello@zenithlabs.ai',
    subject: 'Meeting Confirmation — AI Healthcare Integration',
    body: '<p>Hi Zenith Labs,</p><p>Thanks for your interest! I\'ve attached our product brief. Let\'s confirm a time for the call — how about Thursday 3pm HKT?</p>',
    status: 'approved', _type: 'reply', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  // Quantum Finance — reply, pending
  { _id: 'em-6', lead_id: 'mock-8', company_name: 'Quantum Finance', to_email: 'cfo@quantumfin.hk',
    subject: 'Re: Pricing & Compliance — MADMAD Platform',
    body: '<p>Hi,</p><p>Thanks for your questions. Here\'s our pricing breakdown:</p><ul><li>Starter: $299/mo</li><li>Pro: $799/mo</li><li>Enterprise: Custom</li></ul><p>All plans include SOC2 compliance. Happy to discuss further.</p>',
    status: 'pending', _type: 'reply', created_at: new Date(Date.now() - 7200000).toISOString(),
    _summary: 'Detailed pricing info sent. Covers Starter/Pro/Enterprise tiers + SOC2 compliance.' } as any,
  // Acme Corp — sent first outreach
  { _id: 'em-7', lead_id: 'mock-1', company_name: 'Acme Corp', to_email: 'hello@acme.com',
    subject: 'Intro — MADMAD AI Email Agent',
    body: '<p>Hello Acme Corp,</p><p>We\'re reaching out because we believe our AI email agent could help your sales team. Would you be open to a quick intro call?</p>',
    status: 'sent', created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    sent_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  // Peak Ventures — reoutreach, pending
  { _id: 'em-8', lead_id: 'mock-10', company_name: 'Peak Ventures', to_email: 'invest@peakvc.com',
    subject: 'Re-introduction — MADMAD Series A Update',
    body: '<p>Hi Peak Ventures,</p><p>Since we last connected, we\'ve hit some exciting milestones. Would love to share our latest traction numbers.</p>',
    status: 'pending', _type: 'reoutreach', created_at: new Date(Date.now() - 3600000).toISOString() },
];

/** 根據 lead 狀態決定顯示邊個 reply badge */
const getReplyBadge = (lead: Lead, t: (k: string, opts?: any) => string, theme: any) => {
  const labels = getReplyCategoryLabel(t, theme);
  if (lead._replied) {
    if (lead._reply_category === 'interested' && lead._pending_meeting) {
      return labels.interested_pending;
    }
    return labels[lead._reply_category || ''] || { text: t('leads.replyProcessing'), bg: theme.pastel.blue, fg: theme.colors.textPrimary, icon: 'question' };
  }
  if (lead.status === 'contacted') {
    return lead._has_email_draft
      ? { text: t('leads.draftPending'), bg: theme.pastel.gold, fg: theme.colors.textPrimary, icon: 'draft_pending' }
      : { text: t('leads.awaitingReply'), bg: theme.pastel.mauve, fg: theme.colors.textPrimary, icon: 'awaiting' };
  }
  if (lead.status === 'pending') {
    return { text: t('leads.draftPending'), bg: theme.pastel.gold, fg: theme.colors.textPrimary, icon: 'draft_pending' };
  }
  if (lead._has_email_draft) {
    return { text: t('leads.draftPending'), bg: theme.pastel.gold, fg: theme.colors.textPrimary, icon: 'draft_pending' };
  }
  return { text: t('leads.unprocessed'), bg: theme.pastel.blue, fg: theme.colors.textPrimary, icon: 'unprocessed' };
};

const ReplyBadge = styled.span<{ $bg: string; $fg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  white-space: nowrap;
  svg { width: 12px; height: 12px; flex-shrink: 0; }
`;

const EmailTypeBadge = styled.span<{ $bg: string; $fg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
  &:hover { filter: brightness(0.95); transform: scale(1.03); }
`;
const ReplyPopup = styled.div<{ $open: boolean }>`
  max-height: ${({ $open }) => $open ? '300px' : '0'};
  opacity: ${({ $open }) => $open ? 1 : 0};
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.2s ease, margin 0.2s ease, padding 0.2s ease;
  background: #fafafa;
  border-radius: 8px;
  margin-top: ${({ $open }) => $open ? '8px' : '0'};
  padding: ${({ $open }) => $open ? '10px 14px' : '0 14px'};
  border: ${({ $open }) => $open ? '0.5px solid #e0e0e0' : 'none'};
  font-size: 0.8125rem;
  line-height: 1.6;
  color: #555;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Times New Roman', 'Noto Serif TC', 'Noto Serif SC', serif;
`;

const NoReplyText = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Email Timeline wrapper ── */
const EmailTimeline = styled.div`
  position: relative;
  padding-left: 20px;
  &::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #e0e0e0;
  }
`;
const EmailTimelineNode = styled.div`
  position: relative;
  margin-bottom: 18px;
`;
const EmailTimelineDot = styled.div<{ $color?: string }>`
  position: absolute;
  left: -20px;
  top: 8px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color || '#bdbdbd'};
  border: 2px solid #fff;
  z-index: 1;
`;
const EmailTimelineTime = styled.div`
  font-size: 0.75rem;
  color: #999;
  margin-bottom: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;
const EmailStatusPill = styled.span<{ $bg: string; $fg: string }>`
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

/* ── Lead Emails section（撳開 lead 就睇到所有相關 email） ── */

const getEmailTypeLabel = (t: (k: string) => string, theme: any) => ({
  reply:      { text: t('leads.emailTypeReply'),      bg: theme.pastel.olive, fg: theme.colors.textPrimary },
  followup:   { text: t('leads.emailTypeFollowup'),   bg: theme.pastel.gold,  fg: theme.colors.textPrimary },
  reoutreach: { text: t('leads.emailTypeReoutreach'), bg: theme.pastel.mauve, fg: theme.colors.textPrimary },
} as Record<string, { text: string; bg: string; fg: string }>);

const getEmailStatusColor = (_theme: any): Record<string, { bg: string; fg: string }> => ({
  pending:  { bg: '#fff3e0', fg: '#e65100' },
  approved: { bg: '#e8f5e9', fg: '#2e7d32' },
  sent:     { bg: '#e3f2fd', fg: '#1565c0' },
  rejected: { bg: '#fce4ec', fg: '#c62828' },
  failed:   { bg: '#fff3e0', fg: '#e65100' },
});

const EmailCard = styled.div<{ $expanded?: boolean; $status?: string }>`
  border-radius: 10px;
  max-width: 100%;
  padding: 14px 18px;
  position: relative;
  overflow: hidden;
  transition: background 0.2s;
  /* pending — 金黃色發光脈衝 */
  ${({ $status }) => $status === 'pending' && css`
    background: #fffef5;
    border: 1.5px solid #ffe082;
    box-shadow: 0 0 6px rgba(255,193,7,0.2);
    animation: ${glowPulseGold} 2s ease-in-out infinite;
  `}
  /* approved — 綠色發光脈衝 */
  ${({ $status }) => $status === 'approved' && css`
    background: #f8fcf8;
    border: 1.5px solid #a5d6a7;
    box-shadow: 0 0 6px rgba(76,175,80,0.2);
    animation: ${glowPulseGreen} 2s ease-in-out infinite;
  `}
  /* sent — 淡綠底 + ✓ 浮水印 */
  ${({ $status }) => $status === 'sent' && css`
    background: #f9fcf9;
    border: 1px solid #e0efe0;
    &::after {
      content: '✓';
      position: absolute;
      bottom: 4px;
      left: 10px;
      font-size: 5.5rem;
      font-weight: 900;
      color: rgba(76, 175, 80, 0.12);
      pointer-events: none;
      line-height: 1;
      transform: rotate(-15deg);
    }
  `}
  /* rejected — 淡紅底 + ✗ 浮水印 */
  ${({ $status }) => $status === 'rejected' && css`
    background: #fff5f5;
    border: 1px solid #f5c6c6;
    &::after {
      content: '✗';
      position: absolute;
      bottom: 4px;
      left: 10px;
      font-size: 5.5rem;
      font-weight: 900;
      color: rgba(211, 47, 47, 0.13);
      pointer-events: none;
      line-height: 1;
      transform: rotate(-15deg);
    }
  `}
  /* failed — 淡紅底 */
  ${({ $status }) => $status === 'failed' && css`
    background: #fffafa;
    border: 1px solid #f5d5d5;
  `}
  /* fallback */
  ${({ $status }) => !$status && css`
    background: #fafafa;
    border: 1px solid #eee;
  `}
`;
const EmailCardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;
const EmailCardSubject = styled.span`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const EmailCardDate = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  white-space: nowrap;
`;
const EmailCardBody = styled.div`
  padding: 4px 8px;
  font-family: 'Times New Roman', 'Noto Serif TC', 'Noto Serif SC', serif;
`;
const EmailBodyContent = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  font-size: 1rem;
  line-height: 1.7;
  color: #555;
  max-width: 100%;
  overflow-x: hidden;
`;
const EmailCardMeta = styled.div`
  margin-top: 10px;
  padding-top: 8px;
  border-top: 0.5px solid #e2e2e2;
  font-size: 0.8125rem;
  color: #888;
`;
const EmailRecipient = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;
const AgentAvatar = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #d4a6c8;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;
const EmailWatermark = styled.div`
  position: absolute;
  bottom: 12px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
`;
const EmailWatermarkBadge = styled.span<{ $bg: string; $fg: string }>`
  font-size: 0.8125rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 99px;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  opacity: 0.85;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;
const EmailWatermarkTime = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: #555;
`;
const EmailGreeting = styled.div`
  font-size: 1rem;
  color: #333;
  margin-bottom: 12px;
`;
const EmailHighlight = styled.div`
  font-size: 1rem;
  color: #1a1a1a;
  background: linear-gradient(90deg, #e8f5e920, #e8f5e960, #e8f5e920);
  padding: 6px 10px;
  border-left: 3px solid #4caf50;
  border-radius: 0 6px 6px 0;
  margin: 8px 0;
  font-weight: 500;
`;
const EmailCta = styled.div`
  font-size: 1rem;
  color: #1565c0;
  font-weight: 500;
  margin: 8px 0;
`;
const EmailSignature = styled.div`
  font-size: 0.875rem;
  color: #888;
  margin-top: 12px;
  white-space: pre-wrap;
`;
const EmailBodyLine = styled.div`
  font-size: 1rem;
  line-height: 1.7;
  color: #555;
  margin: 4px 0;
`;
const EmailListItem = styled.div`
  font-size: 1rem;
  line-height: 1.6;
  color: #444;
  padding: 3px 0 3px 16px;
  position: relative;
  &::before {
    content: '•';
    position: absolute;
    left: 0;
    color: #4caf50;
    font-weight: 700;
  }
`;
const EmailPS = styled.div`
  font-size: 0.9375rem;
  color: #1a1a1a;
  font-style: italic;
  margin-top: 12px;
  padding: 6px 10px;
  background: #fff8e1;
  border-left: 3px solid #ffc107;
  border-radius: 0 6px 6px 0;
`;
const EmailSummary = styled.div`
  margin: 0;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border: 0.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: flex-start;
  gap: 6px;
`;
const EmailSummaryLabel = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap;
  flex-shrink: 0;
`;
const EmailCardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
`;
const EmailActionBtn = styled.button<{ $bg: string; $fg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 0.5px solid #e5737388;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #c62828;
  background: #fce4ec;
  cursor: pointer;
  transition: all 0.15s;
  &:hover:not(:disabled) { background: #f8bbd0; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const LeadSendBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 18px;
  border: none;
  border-radius: 99px;
  background: #43a047;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  &:hover:not(:disabled) { background: #388e3c; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const renderEmailBody = (text: string) => {
  // 先把長句按句號分段，再按換行分段 — 這樣即使是一大段也能逐句識別
  const rawLines = text.split('\n');
  const lines: string[] = [];
  for (const raw of rawLines) {
    // 按句號/句點拆分長段落（保留句號），但不拆簽名區
    if (raw.length > 60 && /[.。!！]/.test(raw)) {
      const sentences = raw.match(/[^.。!！]+[.。!！]?\s*/g) || [raw];
      lines.push(...sentences);
    } else {
      lines.push(raw);
    }
  }

  type SegType = 'greeting' | 'body' | 'highlight' | 'cta' | 'signature' | 'list' | 'ps';
  const segments: { type: SegType; text: string }[] = [];
  let i = 0;

  // ── 問候語（中英文）──
  const greetingRe = /^(Hi|Hello|Dear|Hey|Good\s*(morning|afternoon|evening)|Greetings|您好|嗨|親愛的|尊敬的|亲爱的|尊敬的)\b/i;
  while (i < lines.length && (greetingRe.test(lines[i].trim()) || lines[i].trim() === '')) {
    if (lines[i].trim()) segments.push({ type: 'greeting', text: lines[i].trim() });
    i++;
  }

  // ── 簽名偵測（中英文）──
  const signatureRe = /^(Thanks|Thank\s*you|Best|Regards|Cheers|Sincerely|Best\s*regards|Kind\s*regards|Warm\s*regards|All\s*the\s*best|Yours|謝謝|此致|順祝|敬上|祝好),?\s*$/i;

  // ── 重點高亮：數據/金額/量化/成果/關鍵詞 ──
  const highlightRe = new RegExp([
    '\\d+%',                              // 百分比
    '\\d+x\\b',                           // 倍數
    '[$¥€£]\\s*[\\d,.]+',                 // 金額
    '[\\d,.]+\\s*[万億萬亿]',               // 中文金額
    '\\d+\\s*(months?|weeks?|days?|years?|個月|周|天|年|小時|hours?)', // 時間量化
    '\\d+\\s*(leads?|clients?|users?|customers?|companies|位|家|個|人|筆)', // 數量
    '\\d{3,}',                             // 3位數以上的數字
    '(increase|boost|grow|reduce|save|improve|achieve|generate|deliver|result)',
    '(提升|增長|增长|降低|提高|節省|节省|帶來|带来|達到|达到|實現|实现|產生|产生)',
    '(ROI|KPI|conversion|revenue|profit|cost|efficiency)',
    '(case\\s*study|成功案例|客戶案例|客户案例)',
    '(compared\\s*to|vs\\.?|versus|相比|對比|对比|優於|优于)',
  ].join('|'), 'i');

  // ── CTA：行動呼籲（中英文）──
  const ctaRe = new RegExp([
    '\\b(free|demo|call|meet|schedule|book|sign\\s*up|get\\s*started|reach\\s*out)',
    '\\b(let\\s*me\\s*know|interested|learn\\s*more|try|contact|discuss|chat|talk)',
    '\\b(available|open\\s*to|would\\s*love|happy\\s*to|look\\s*forward)',
    '\\b(click|visit|check\\s*out|explore|discover|see\\s*how|find\\s*out)',
    '(歡迎|欢迎|免費|免费|預約|预约|了解更多|聯繫|联系|立即|馬上|马上)',
    '(期待|希望|方便|有空|抽空|商討|商讨|安排|洽談|洽谈|體驗|体验)',
  ].join('|'), 'i');

  // ── 列表項 ──
  const listRe = /^[-•·★✓✔→▸]\s+|^\d+[.)]\s+|^[a-zA-Z][.)]\s+/;

  // ── P.S. ──
  const psRe = /^(P\.?S\.?|附[：:]|备注[：:]|備註[：:]|Note[：:]|注[：:])/i;

  for (; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // P.S. — 特殊強調
    if (psRe.test(trimmed)) {
      segments.push({ type: 'ps', text: trimmed });
      continue;
    }

    // 簽名 — 收集剩餘行
    if (signatureRe.test(trimmed)) {
      segments.push({ type: 'signature', text: lines.slice(i).filter(l => l.trim()).join('\n') });
      break;
    }

    // 列表項
    if (listRe.test(trimmed)) {
      segments.push({ type: 'list', text: trimmed.replace(/^[-•·★✓✔→▸]\s+|^\d+[.)]\s+|^[a-zA-Z][.)]\s+/, '') });
      continue;
    }

    // 重點高亮
    if (highlightRe.test(trimmed)) {
      segments.push({ type: 'highlight', text: trimmed });
      continue;
    }

    // CTA：問號結尾 或 含行動呼籲詞
    if (trimmed.endsWith('?') || trimmed.endsWith('？') || ctaRe.test(trimmed)) {
      segments.push({ type: 'cta', text: trimmed });
      continue;
    }

    segments.push({ type: 'body', text: trimmed });
  }

  return segments;
};

const LeadEmails: React.FC<{ companyName: string; leadId?: string }> = ({ companyName, leadId }) => {
  const { t } = useTranslation();
  const { showPrompt } = useDialog();
  const leTheme = useTheme() as any;
  const { data } = useEmailQueue({ search: companyName });
  const approve = useApproveEmail();
  const reject = useRejectEmail();
  const send = useSendEmail();

  const apiEmails = (data?.data as EmailItem[]) || [];
  const pool = [...MOCK_EMAILS, ...apiEmails];
  const emails = pool
    .filter((e) => (e.lead_id === leadId) || (e.company_name || '') === companyName)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);

  if (!emails.length) return null;

  const busy = approve.isPending || reject.isPending || send.isPending;

  const handleApproveAndSend = (d: EmailItem) => {
    if (d.status === 'approved') {
      send.mutate(d._id, {
        onSuccess: () => console.info('郵件已發送'),
        onError: () => console.error('發送失敗'),
      });
    } else {
      approve.mutate(d._id, {
        onSuccess: () => {
          console.info('已批准，正在發送…');
          send.mutate(d._id, {
            onSuccess: () => console.info('郵件已發送'),
            onError: () => console.error('發送失敗'),
          });
        },
        onError: () => console.error('批准失敗'),
      });
    }
  };

  const handleReject = async (id: string) => {
    const reason = (await showPrompt(t('leads.rejectReason'))) || undefined;
    reject.mutate({ id, reason }, {
      onSuccess: () => console.info('已拒絕'),
      onError: () => console.error('拒絕失敗'),
    });
  };

  const dotColorMap: Record<string, string> = {
    pending: '#ffc107', approved: '#66bb6a', sent: '#4caf50', rejected: '#bdbdbd', failed: '#ef5350',
  };

  return (
    <>
      <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 3.5h14v9H1v-9zm0 0l7 4.5 7-4.5" stroke="#D689BF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('leads.emailRecords')} ({emails.length})</DpSectionTitle>
      <EmailTimeline>
        {emails.map((d) => {
          const typeTag = d._type ? getEmailTypeLabel(t, leTheme)[d._type] : null;
          const emailStatusColors = getEmailStatusColor(leTheme);
          const statusColor = emailStatusColors[d.status || 'pending'] || emailStatusColors.pending;

          return (
            <EmailTimelineNode key={d._id}>
              <EmailTimelineDot $color={dotColorMap[d.status || 'pending']} />
              <EmailTimelineTime>
                {d.created_at ? new Date(d.created_at).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
              </EmailTimelineTime>
              <EmailCard $status={d.status}>
                {/* Top row: recipient left, actions right */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <EmailRecipient style={{ marginBottom: 0 }}>
                    <AgentAvatar>{(d.to_email || '?').charAt(0).toUpperCase()}</AgentAvatar>
                    To: {d.to_email || '—'}
                  </EmailRecipient>
                  {typeTag && (
                    <EmailTypeBadge
                      $bg={typeTag.bg}
                      $fg={typeTag.fg}
                      style={{ marginLeft: 8 }}
                      onClick={(e) => { e.stopPropagation(); setReplyOpenId(replyOpenId === d._id ? null : d._id); }}
                    >
                      {typeTag.text} {replyOpenId === d._id ? '▾' : '▸'}
                    </EmailTypeBadge>
                  )}
                  <div style={{ flex: 1 }} />
                  {d.status === 'pending' && (
                    <>
                      <EmailActionBtn $bg="#fce4ec" $fg="#c62828" disabled={busy} onClick={() => handleReject(d._id)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        {t('leads.reject')}
                      </EmailActionBtn>
                      <LeadSendBtn disabled={busy} onClick={() => handleApproveAndSend(d)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {busy ? t('leads.processing') : t('leads.approveAndSend')}
                      </LeadSendBtn>
                    </>
                  )}
                  {d.status === 'approved' && (
                    <LeadSendBtn disabled={busy} onClick={() => send.mutate(d._id)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {busy ? t('leads.processing') : t('leads.send')}
                    </LeadSendBtn>
                  )}
                  {d.status === 'rejected' && (
                    <span style={{ fontSize: '0.75rem', color: leTheme.strong.mauve }}>✗ {t('leads.rejected')}</span>
                  )}
                </div>

                {/* 標籤展開彈窗 — 點擊標籤查看客戶回覆郵件 */}
                {typeTag && (
                  <ReplyPopup $open={replyOpenId === d._id}>
                    {(d as any)._reply_body || (d as any)._reply_text || (d as any).reply_body || t('leads.noReplyContent', '暫無回覆內容')}
                  </ReplyPopup>
                )}

                <EmailCardBody>
                  {(() => {
                    const bodyText = (d.body || '—').replace(/<[^>]*>/g, '');
                    const segments = renderEmailBody(bodyText);
                    return (
                      <div>
                        {segments.map((seg, idx) => {
                          switch (seg.type) {
                            case 'greeting': return <EmailGreeting key={idx}>{seg.text}</EmailGreeting>;
                            case 'highlight': return <EmailHighlight key={idx}>{seg.text}</EmailHighlight>;
                            case 'cta': return <EmailCta key={idx}>{seg.text}</EmailCta>;
                            case 'signature': return <EmailSignature key={idx}>{seg.text}</EmailSignature>;
                            case 'list': return <EmailListItem key={idx}>{seg.text}</EmailListItem>;
                            case 'ps': return <EmailPS key={idx}>{seg.text}</EmailPS>;
                            default: return <EmailBodyLine key={idx}>{seg.text}</EmailBodyLine>;
                          }
                        })}
                      </div>
                    );
                  })()}
                </EmailCardBody>

                {/* Status pill — bottom right, small and clean */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <EmailStatusPill $bg={statusColor.bg} $fg={statusColor.fg}>{d.status || 'pending'}</EmailStatusPill>
                </div>
              </EmailCard>
            </EmailTimelineNode>
          );
        })}
      </EmailTimeline>
    </>
  );
};

/* ── Tabs config (labels moved inside component for i18n) ── */

interface SubTab {
  key: string;
  label: string;
  icon: string;
  step?: string;
}
interface TabDef {
  key: string;
  label: string;
  color: string;
  icon: string;
  stepRange: string;
  subs: SubTab[];
  filter: (l: Lead, sub: string) => boolean;
}

/* ── Tab / Sub-pill icon SVG paths (16×16 viewBox) ── */
const TAB_ICONS: Record<string, string> = {
  processing: 'M8 1a7 7 0 100 14A7 7 0 008 1zM8 4v4M6 10h4',                        // AI brain/gear
  review:     'M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm1 3h6M5 7h6M5 9h4', // document
  sent:       'M1 3h14v10H1V3zm0 0l7 5 7-5',                                          // envelope
};
const SUB_ICONS: Record<string, string> = {
  '':             'M2 2h12v12H2V2zm2 3h8M4 7h8M4 9h5',                                // list
  to_enrich:      'M8 1l2 3h3l-1 3 2 2-3 1-1 3-2-2-2 2-1-3-3-1 2-2-1-3h3z',          // sparkle (reuse)
  to_analyze:     'M8 1l2 3h3l-1 3 2 2-3 1-1 3-2-2-2 2-1-3-3-1 2-2-1-3h3z',          // sparkle
  draft_ready:    'M12.146 1.146a.5.5 0 01.708 0l2 2a.5.5 0 010 .708l-9.5 9.5a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168l9.5-9.5z', // pen
  email_draft:    'M1 3h14v10H1V3zm0 0l7 5 7-5',                                      // mail
  wa_draft:       'M8 1a7 7 0 100 14A7 7 0 008 1zM5 6h6M5 8.5h4',                     // chat bubble
  awaiting_reply: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v4l2.5 1.5',                     // clock
  followed_up:    'M8 1a7 7 0 100 14A7 7 0 008 1zm-2 4l2 2 4-4',                      // check
  no_reply:       'M8 1a7 7 0 100 14A7 7 0 008 1zM5.5 5.5l5 5M10.5 5.5l-5 5',         // X
};

/* ══════════════════════════════════════
   Component
   ══════════════════════════════════════ */



const LIMIT = 10;

const Leads: React.FC = () => {
  const { t } = useTranslation();
  const { showConfirm } = useDialog();

  const isNew = (l: Lead) => l.status === 'new' || l.status === null || l.status === undefined;

  const TABS: TabDef[] = [
    {
      key: 'processing',
      label: t('leads.tabProcessing'),
      color: 'blue',
      icon: 'processing',
      stepRange: '1-3',
      subs: [
        { key: '', label: t('leads.subAll'), icon: '' },
        { key: 'to_enrich', label: t('leads.subToEnrich'), icon: 'to_enrich', step: '1' },
        { key: 'to_analyze', label: t('leads.subToAnalyze'), icon: 'to_analyze', step: '2' },
        { key: 'draft_ready', label: t('leads.subDraftReady'), icon: 'draft_ready', step: '3' },
      ],
      filter: (l, sub) => {
        if (!isNew(l)) return false;
        if (sub === 'to_enrich') return !(l as any)._website_researched;
        if (sub === 'to_analyze') return !!(l as any)._website_researched && !(l as any)._has_analysis;
        if (sub === 'draft_ready') return !!(l as any)._has_email_draft;
        return true;
      },
    },
    {
      key: 'review',
      label: t('leads.tabReview'),
      color: 'amber',
      icon: 'review',
      stepRange: '4',
      subs: [
        { key: '', label: t('leads.subAll'), icon: '' },
        { key: 'email_draft', label: t('leads.subEmailDraft'), icon: 'email_draft', step: '4' },
        { key: 'wa_draft', label: t('leads.subWaDraft'), icon: 'wa_draft', step: '4' },
      ],
      filter: (l, sub) => {
        if (l.status !== 'pending') return false;
        if (sub === 'email_draft') return !!(l as any)._has_email_draft;
        if (sub === 'wa_draft') return !!(l as any)._has_wa_message;
        return true;
      },
    },
    {
      key: 'sent',
      label: t('leads.tabSent'),
      color: 'green',
      icon: 'sent',
      stepRange: '5-9',
      subs: [
        { key: '', label: t('leads.subAll'), icon: '' },
        { key: 'awaiting_reply', label: t('leads.subAwaitingReply'), icon: 'awaiting_reply', step: '6' },
        { key: 'followed_up', label: t('leads.subFollowedUp'), icon: 'followed_up', step: '7' },
        { key: 'no_reply', label: t('leads.subNoReply'), icon: 'no_reply', step: '9' },
      ],
      filter: (l, sub) => {
        if (l.status !== 'contacted') return false;
        if (sub === 'awaiting_reply') return !(l as any)._no_reply && !((l as any)._followup_count > 0);
        if (sub === 'followed_up') return ((l as any)._followup_count || 0) > 0;
        if (sub === 'no_reply') return !!(l as any)._no_reply;
        return true;
      },
    },
  ];

  const STATUS_LABEL: Record<string, string> = {
    new: t('leads.setPending'),
    '': t('leads.setPending'),
    pending: t('leads.setContacted'),
  };

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('processing');
  const [activeSub, setActiveSub] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const styledTheme = useTheme() as any;

  /* ── Sliding indicator refs & state ── */
  const tabsRowRef = useRef<HTMLDivElement>(null);
  const subTrackRef = useRef<HTMLDivElement>(null);
  const [tabSlider, setTabSlider] = useState({ left: 0, width: 0 });
  const [subSlider, setSubSlider] = useState({ left: 0, width: 0 });

  const updateTabSlider = useCallback(() => {
    const container = tabsRowRef.current;
    if (!container) return;
    const btn = container.querySelector(`[data-tab-key="${activeTab}"]`) as HTMLElement | null;
    if (btn) {
      setTabSlider({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [activeTab]);

  const updateSubSlider = useCallback(() => {
    const container = subTrackRef.current;
    if (!container) return;
    const btn = container.querySelector(`[data-sub-key="${activeSub}"]`) as HTMLElement | null;
    if (btn) {
      setSubSlider({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [activeSub, activeTab]);

  useLayoutEffect(() => { updateTabSlider(); }, [updateTabSlider]);
  useLayoutEffect(() => {
    // Small RAF delay so new sub pills are rendered before measuring
    const id = requestAnimationFrame(updateSubSlider);
    return () => cancelAnimationFrame(id);
  }, [updateSubSlider]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [showAdd, setShowAdd] = useState(false);
  const [addClosing, setAddClosing] = useState(false);
  const addTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const detailTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Drag & resize state
  const dpRef = useRef<HTMLDivElement>(null);
  const [dpPos, setDpPos] = useState({ x: 0, y: 0 });
  const [dpSize, setDpSize] = useState({ w: 0, h: 0 });
  const dpDrag = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const dpResize = useRef<{ startX: number; startY: number; originW: number; originH: number; originX: number; originY: number; dir: string } | null>(null);

  const [aboutOpen, setAboutOpen] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    source: '',
    rating: '',
    industry_tags: '' as string,
    website_description: '',
  });
  const [replyChecking, setReplyChecking] = useState(false);
  const [replyCheckMsg, setReplyCheckMsg] = useState('');
  const [autoCheckReplies, setAutoCheckReplies] = useState(false);
  const autoCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [followupChecking, setFollowupChecking] = useState(false);
  const [followupCheckMsg, setFollowupCheckMsg] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // 載入 demo mode 狀態
  useEffect(() => {
    client.get('/jobs/demo-mode').then(r => {
      const on = (r.data as any)?.demoMode ?? (r.data as any)?.data?.demoMode ?? false;
      setDemoMode(on);
    }).catch(() => {});
  }, []);

  const closeAddModal = useCallback(() => {
    setAddClosing(true);
    addTimerRef.current = setTimeout(() => { setShowAdd(false); setAddClosing(false); }, 200);
  }, []);

  useEffect(() => () => { if (addTimerRef.current) clearTimeout(addTimerRef.current); }, []);
  useEffect(() => () => { if (detailTimerRef.current) clearTimeout(detailTimerRef.current); }, []);

  const handleToggleDemo = async () => {
    setDemoLoading(true);
    try {
      const r = await client.post('/jobs/demo-mode');
      const on = (r.data as any)?.demoMode ?? (r.data as any)?.data?.demoMode ?? false;
      setDemoMode(on);
    } catch {}
    setDemoLoading(false);
  };

  const handleCheckReplies = async () => {
    setReplyChecking(true); setReplyCheckMsg('');
    try {
      await client.post('/jobs/check-replies/run');
      setReplyCheckMsg(t('leads.checkReplyDispatched'));
      setTimeout(() => setReplyCheckMsg(''), 4000);
    } catch (err: any) {
      setReplyCheckMsg(t('leads.triggerFailed') + (err?.message || ''));
      setTimeout(() => setReplyCheckMsg(''), 5000);
    } finally { setReplyChecking(false); }
  };

  const handleCheckFollowups = async () => {
    setFollowupChecking(true); setFollowupCheckMsg('');
    try {
      await client.post('/jobs/check-followups/run');
      setFollowupCheckMsg(t('leads.checkFollowupDispatched'));
      setTimeout(() => setFollowupCheckMsg(''), 4000);
    } catch (err: any) {
      setFollowupCheckMsg(t('leads.triggerFailed') + (err?.message || ''));
      setTimeout(() => setFollowupCheckMsg(''), 5000);
    } finally { setFollowupChecking(false); }
  };

  // ── Auto-check replies every 10s ──
  useEffect(() => {
    if (autoCheckReplies) {
      // 即刻跑一次
      client.post('/jobs/check-replies/run').catch(() => {});
      autoCheckRef.current = setInterval(() => {
        client.post('/jobs/check-replies/run').catch(() => {});
      }, 10_000);
    } else if (autoCheckRef.current) {
      clearInterval(autoCheckRef.current);
      autoCheckRef.current = null;
    }
    return () => {
      if (autoCheckRef.current) {
        clearInterval(autoCheckRef.current);
        autoCheckRef.current = null;
      }
    };
  }, [autoCheckReplies]);

  // ponytail: bulk-clear with explicit confirm. We require typing "DELETE"
  // (or at least a window.confirm) so a misclick doesn't wipe the DB. The
  // confirm message is in Chinese to match the rest of the UI.
  const handleClearAll = async () => {
    const count = apiLeads.length;
    const ok = await showConfirm(
      t('leads.confirmClearAll', { count }),
      { danger: true },
    );
    if (!ok) return;
    setClearMsg('');
    clearAllLeads.mutate(undefined, {
      onSuccess: (data) => {
        setClearMsg(t('leads.clearedLeads', { count: data?.deleted ?? 0 }));
        setTimeout(() => setClearMsg(''), 4000);
      },
      onError: (err: any) => {
        setClearMsg(t('leads.clearFailed') + (err?.message || ''));
        setTimeout(() => setClearMsg(''), 5000);
      },
    });
  };

  // 攞可攞到嘅全部 leads（backend DTO 限 limit ≤ 100）。
  // status/search filtering client side 做。
  const { data, isLoading, error, refetch, isFetching } = useLeads({ page: 1, limit: 100 });
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const minWait = new Promise(r => setTimeout(r, 1000));
    await Promise.all([refetch(), minWait]);
    setRefreshing(false);
  }, [refetch]);

  const deleteLead = useDeleteLead();
  const changeStatus = useChangeLeadStatus();
  const createLead = useCreateLead();
  const clearAllLeads = useClearAllLeads();
  const reprocessLead = useReprocessLead();

  // Admin: 顯示來源用戶欄
  const { data: me } = useMe();
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ page: 1, limit: 200 }).then(r => r.data),
    enabled: isAdmin,
  });
  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    const list = (usersData as any)?.data ?? (usersData as any) ?? [];
    if (Array.isArray(list)) list.forEach((u: any) => { if (u._id) map[u._id] = u.name || u.email; });
    return map;
  }, [usersData]);

  const [clearMsg, setClearMsg] = useState('');
  const [oldWebsiteOnly, setOldWebsiteOnly] = useState(false);
  const [sortByTech, setSortByTech] = useState(false);

  // ── Quarter filter (driven by URL ?quarter= param, set from sidebar) ──
  const now = useMemo(() => new Date(), []);
  const { year: currentYear, quarter: currentQuarter } = dateToYQ(now);
  const defaultQuarter: QuarterFilterValue = `${currentYear}Q${currentQuarter}`;
  const quarterFilter: QuarterFilterValue = (searchParams.get('quarter') as QuarterFilterValue) || defaultQuarter;
  const quarterOptions = useMemo(() => buildQuarterOptions(now), [now]);
  const [qDropOpen, setQDropOpen] = useState(false);
  const qDropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!qDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (qDropRef.current && !qDropRef.current.contains(e.target as Node)) setQDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [qDropOpen]);

  const apiLeads: Lead[] = data?.data ?? [];
  // Always include MOCK_LEADS for demo richness + any real API data
  const allLeadsRaw: Lead[] = [...MOCK_LEADS, ...apiLeads];

  // Quarter filtering (applied before all other filters so counts reflect the chosen quarter)
  const allLeads = useMemo(() =>
    quarterFilter === 'all'
      ? allLeadsRaw
      : allLeadsRaw.filter(l => matchesQuarterFilter((l as any)._imported_at, quarterFilter)),
    [allLeadsRaw, quarterFilter]
  );

  /* ── Auto-open detail panel from URL ?detail=<leadId> ── */
  const detailHandled = useRef<string | null>(null);
  useEffect(() => {
    const detailId = searchParams.get('detail');
    if (!detailId || detailHandled.current === detailId) return;
    detailHandled.current = detailId;

    // 立即清除 URL param，避免重複觸發
    searchParams.delete('detail');
    setSearchParams(searchParams, { replace: true });

    // 優先從已載入嘅 list 搵
    const lead = allLeads.find(l => l._id === detailId);
    if (lead) {
      setSelectedLead(lead);
      return;
    }
    // 唔喺 list 入面（可能未載入或超出分頁），直接 API fetch
    import('../../api/leads').then(({ leadsApi }) => {
      leadsApi.get(detailId).then(res => {
        const fetched = (res.data as any)?.data ?? res.data;
        if (fetched) setSelectedLead(fetched as Lead);
      }).catch((err) => {
        console.error('[Leads] Failed to fetch detail lead:', err);
      });
    });
  }, [searchParams, allLeads, setSearchParams]);

  // Client-side filtering（search + status）
  const searchFiltered = search.trim()
    ? allLeads.filter(l => {
        const q = search.trim().toLowerCase();
        return (l.company_name || '').toLowerCase().includes(q) ||
               (l.email || '').toLowerCase().includes(q) ||
               (l.phone || '').toLowerCase().includes(q);
      })
    : allLeads;
  const curTab = TABS.find(t => t.key === activeTab) || TABS[0];
  const tabFiltered = searchFiltered.filter(l => curTab.filter(l, activeSub));

  // 舊網站 filter + tech_score 排序
  const techFiltered = oldWebsiteOnly
    ? tabFiltered.filter(l => ((l as any)._tech_score ?? 0) >= 50)
    : tabFiltered;
  const techSorted = sortByTech
    ? [...techFiltered].sort((a, b) => ((b as any)._tech_score ?? 0) - ((a as any)._tech_score ?? 0))
    : techFiltered;

  // Client-side pagination
  const total = techSorted.length;
  const totalPages = Math.ceil(total / LIMIT);
  const leads = techSorted.slice((page - 1) * LIMIT, page * LIMIT);

  // 每個 tab 嘅 count（用全量數據計，唔受 search 影響）
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of TABS) {
      counts[tab.key] = allLeads.filter(l => tab.filter(l, '')).length;
    }
    return counts;
  }, [allLeads]);

  // Sub-tab counts（受主 tab 影響）
  const subCounts = useMemo(() => {
    const mainFiltered = allLeads.filter(l => curTab.filter(l, ''));
    const counts: Record<string, number> = {};
    for (const sub of curTab.subs) {
      counts[sub.key] = sub.key === ''
        ? mainFiltered.length
        : mainFiltered.filter(l => curTab.filter(l, sub.key)).length;
    }
    return counts;
  }, [allLeads, curTab]);

  // 保留 stats.total 畀 KPI header
  const stats = useMemo(() => ({ total: allLeads.length }), [allLeads]);

  // Dynamic page title based on quarter filter
  const pageTitle = useMemo(() => {
    if (quarterFilter === 'all') return t('quarter.titleAll');
    if (quarterFilter === 'prev_years') return t('quarter.titleOlder');
    if (quarterFilter.startsWith('year_')) {
      const y = quarterFilter.slice(5);
      return t('quarter.titleYear', { year: y });
    }
    // e.g. "2026Q3" → "Q3 接觸中的客戶"
    const qPart = quarterFilter.slice(-2); // "Q3"
    return t('quarter.titleCurrent', { q: qPart });
  }, [quarterFilter, t]);

  const handleDelete = async (id: string) => {
    const ok = await showConfirm(t('leads.confirmDelete'));
    if (ok) {
      deleteLead.mutate(id, {
        onSuccess: () => console.info('Lead 已刪除'),
        onError: () => console.error('刪除失敗'),
      });
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    changeStatus.mutate({ id, status: newStatus });
  };

  const handleTabClick = (key: string) => {
    setActiveTab(key);
    setActiveSub('');
    setPage(1);
  };

  const handleSubClick = (key: string) => {
    setActiveSub(key);
    setPage(1);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      industry_tags: form.industry_tags
        ? form.industry_tags.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
    };
    createLead.mutate(payload as any, {
      onSuccess: () => {
        closeAddModal();
        setForm({ company_name: '', email: '', phone: '', website: '', address: '', source: '', rating: '', industry_tags: '', website_description: '' });
      },
    });
  };

  // Reset panel position/size when a new lead is selected
  useEffect(() => {
    if (selectedLead) {
      const isNarrow = window.innerWidth < 1100;
      const w = isNarrow ? window.innerWidth - 12 : Math.min(window.innerWidth * 0.88, 1400);
      const h = isNarrow ? window.innerHeight - 12 : window.innerHeight * 0.9;
      setDpSize({ w, h });
      setDpPos({ x: isNarrow ? 6 : (window.innerWidth - w) / 2, y: isNarrow ? 6 : (window.innerHeight - h) / 2 });
    }
  }, [selectedLead]);

  const onDpDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    e.preventDefault();
    dpDrag.current = { startX: e.clientX, startY: e.clientY, originX: dpPos.x, originY: dpPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dpDrag.current) return;
      let nx = dpDrag.current.originX + ev.clientX - dpDrag.current.startX;
      let ny = dpDrag.current.originY + ev.clientY - dpDrag.current.startY;
      nx = Math.max(0, Math.min(nx, window.innerWidth - dpSize.w));
      ny = Math.max(0, Math.min(ny, window.innerHeight - dpSize.h));
      setDpPos({ x: nx, y: ny });
    };
    const onUp = () => { dpDrag.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [dpPos, dpSize]);

  const onDpResizeStart = useCallback((e: React.MouseEvent, dir: string) => {
    e.preventDefault();
    e.stopPropagation();
    dpResize.current = { startX: e.clientX, startY: e.clientY, originW: dpSize.w, originH: dpSize.h, originX: dpPos.x, originY: dpPos.y, dir };
    const onMove = (ev: MouseEvent) => {
      if (!dpResize.current) return;
      const d = dpResize.current;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      let nw = d.originW, nh = d.originH, nx = d.originX, ny = d.originY;
      if (d.dir.includes('e')) nw = Math.max(400, Math.min(d.originW + dx, window.innerWidth - d.originX));
      if (d.dir.includes('s')) nh = Math.max(300, Math.min(d.originH + dy, window.innerHeight - d.originY));
      if (d.dir.includes('w')) { const dw = Math.min(dx, d.originW - 400); nw = d.originW - dw; nx = Math.max(0, d.originX + dw); }
      if (d.dir.includes('n')) { const dh = Math.min(dy, d.originH - 300); nh = d.originH - dh; ny = Math.max(0, d.originY + dh); }
      setDpSize({ w: nw, h: nh });
      setDpPos({ x: nx, y: ny });
    };
    const onUp = () => { dpResize.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [dpSize, dpPos]);

  const handleCloseDetail = useCallback(() => {
    setDetailClosing(true);
    detailTimerRef.current = setTimeout(() => { setSelectedLead(null); setDetailClosing(false); }, 200);
  }, []);

  return (
    <Page>
        <PageCard>
        <div><PageTitle>{pageTitle}</PageTitle></div>

        {/* ── Orbital-style View Tabs ── */}
        <TabsRow ref={tabsRowRef}>
          <TabSlider $left={tabSlider.left} $width={tabSlider.width} />
          {TABS.map(tab => (
            <TabItem
              key={tab.key}
              data-tab-key={tab.key}
              $active={activeTab === tab.key}
              $color={tab.color}
              onClick={() => handleTabClick(tab.key)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d={TAB_ICONS[tab.icon] || ''} />
              </svg>
              {tab.label}
              <TabNumber>{tabCounts[tab.key] ?? 0}</TabNumber>
            </TabItem>
          ))}
        </TabsRow>

        {/* ── Sub-status pills in track bar + right-side actions ── */}
        <SubPillRow>
          <SubPillTrack ref={subTrackRef}>
            {curTab.subs.length > 1 && <>
              <SubSlider $left={subSlider.left} $width={subSlider.width} />
              {curTab.subs.map(sub => (
                <SubPill
                  key={sub.key}
                  data-sub-key={sub.key}
                  $active={activeSub === sub.key}
                  $color={SUB_COLOR_KEYS[sub.key] || 'blue'}
                  onClick={() => handleSubClick(sub.key)}
                >
                  {SUB_ICONS[sub.key] && (
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d={SUB_ICONS[sub.key]} />
                    </svg>
                  )}
                  {sub.label} {subCounts[sub.key] ?? 0}
                </SubPill>
              ))}
            </>}
          </SubPillTrack>
          <QDropWrap ref={qDropRef}>
            <QDropTrigger $open={qDropOpen} onClick={() => setQDropOpen(v => !v)}>
              {t(quarterOptions.find(o => o.value === quarterFilter)?.labelKey ?? '', quarterOptions.find(o => o.value === quarterFilter)?.labelParams)}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </QDropTrigger>
            {qDropOpen && (
              <QDropMenu>
                {quarterOptions.map(opt => (
                  <QDropItem
                    key={opt.value}
                    $active={quarterFilter === opt.value}
                    onClick={() => {
                      const q = opt.value as QuarterFilterValue;
                      const next = new URLSearchParams(searchParams);
                      if (q === defaultQuarter) next.delete('quarter'); else next.set('quarter', q);
                      setSearchParams(next, { replace: true });
                      setPage(1);
                      setQDropOpen(false);
                    }}
                  >
                    {t(opt.labelKey, opt.labelParams)}
                  </QDropItem>
                ))}
              </QDropMenu>
            )}
          </QDropWrap>
          <SearchWrap>
            <SearchIcon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></SearchIcon>
            <SearchInput
              placeholder={t('leads.searchPlaceholder')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </SearchWrap>
          <CircleActionBtn title={t('leads.filterOldWebsiteOn')} onClick={() => { setOldWebsiteOnly(v => !v); setPage(1); }} style={oldWebsiteOnly ? { background: styledTheme.colors.accent, color: '#fff', borderColor: 'transparent' } : undefined}>
            <IconOldWebsite />
          </CircleActionBtn>
          <CircleActionBtn title={t('leads.checkReplies')} onClick={handleCheckReplies} disabled={replyChecking} $spinning={replyChecking}>
            <IconCheckCircle />
          </CircleActionBtn>
          <CircleActionBtn title={t('leads.refresh')} onClick={handleRefresh} disabled={refreshing} $spinning={refreshing}>
            <IconRefresh spinning={refreshing} />
          </CircleActionBtn>
          <CircleActionBtn title={t('leads.clearAll')} onClick={handleClearAll} disabled={clearAllLeads.isPending} $spinning={clearAllLeads.isPending}>
            <IconTrash />
          </CircleActionBtn>
          <CircleActionBtn title={t('leads.addLead')} onClick={() => setShowAdd(true)} style={{ background: styledTheme.colors.textPrimary, color: '#fff', borderColor: 'transparent' }}>
            <IconPlus />
          </CircleActionBtn>
        </SubPillRow>
        {(replyCheckMsg || followupCheckMsg || clearMsg) && createPortal(
          <>
            {replyCheckMsg && <FloatingToast key={`r-${replyCheckMsg}`} $error={replyCheckMsg.startsWith(t('leads.triggerFailed'))}>{replyCheckMsg}</FloatingToast>}
            {followupCheckMsg && <FloatingToast key={`f-${followupCheckMsg}`} $error={followupCheckMsg.startsWith(t('leads.triggerFailed'))}>{followupCheckMsg}</FloatingToast>}
            {clearMsg && <FloatingToast key={`c-${clearMsg}`} $error={clearMsg.startsWith(t('leads.clearFailed'))}>{clearMsg}</FloatingToast>}
          </>,
          document.body
        )}
          <div style={{ marginTop: 16 }}><ToolbarSep /></div>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}><RowCheckbox readOnly /></th>
                  <th>{t('leads.name')} <IconSortArrow /></th>
                  <th>{t('leads.reply')}</th>
                  {isAdmin && <th>{t('leads.sourceUser')}</th>}
                  <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setSortByTech(v => !v); setPage(1); }}>
                    {t('leads.techScore')} <IconSortArrow />
                  </th>
                  <th>{t('leads.importedAt')} <IconSortArrow /></th>
                  <th>{t('leads.action')}</th>
                </tr>
              </thead>
              <tbody>
                {(error && allLeads.length === 0) ? (
                  <tr>
                    <EmptyCell colSpan={isAdmin ? 7 : 6}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                        <strong style={{ color: styledTheme.strong.mauve }}>{t('common.error')}</strong>
                        <span style={{ color: styledTheme.colors.textTertiary, fontSize: 13 }}>
                          {(error as any)?.message || String(error)}
                        </span>
                        <button
                          onClick={() => refetch()}
                          style={{
                            marginTop: 4,
                            padding: '6px 14px',
                            border: `1px solid ${styledTheme.colors.accent}`,
                            background: styledTheme.colors.accent,
                            color: styledTheme.colors.textInverted,
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          {t('leads.retry')}
                        </button>
                      </div>
                    </EmptyCell>
                  </tr>
                ) : (isLoading && allLeads.length === 0) ? (
                  <tr><EmptyCell colSpan={isAdmin ? 7 : 6}>{t('leads.loading')}</EmptyCell></tr>
                ) : leads.length === 0 ? (
                  <tr><EmptyCell colSpan={isAdmin ? 7 : 6}><div><EmptyLeadsIllustration />{t('leads.noLeads')}</div></EmptyCell></tr>
                ) : (
                  (() => {
                    return leads.map((lead, i) => {
                      const name = lead.company_name || t('common.unknown');
                      const colorIdx = hashColorIndex(name);
                      return (
                        <React.Fragment key={lead._id}>
                          <TRow $even={i % 2 === 1} style={{ cursor: 'pointer' }} onClick={() => setSelectedLead(lead)}>
                        <td style={{ color: styledTheme.colors.textTertiary, fontSize: '0.75rem', textAlign: 'center' }}>{(page - 1) * LIMIT + i + 1}</td>
                        <td>
                          <NameCell>
                            <StatusIcon $status={lead.status ?? 'new'} title={t(STATUS_I18N_KEY[lead.status ?? 'new'] || 'leads.statusNew')} />
                            <Avatar $colorIndex={colorIdx}><AvatarIcon name={name} /></Avatar>
                            <NameText>
                              <strong>{name}</strong>
                              {lead.website && <small>{lead.website}</small>}
                            </NameText>
                            {(() => {
                              const qt = getQuarterTag((lead as any)._imported_at);
                              return qt ? <QuarterTag>{qt}</QuarterTag> : null;
                            })()}
                            {(() => {
                              const src = lead.source || '';
                              const agentKey = SOURCE_AGENT[src];
                              if (!agentKey) return null;
                              if (agentKey === 'farmer') return <SpriteAvatar src={FARMER.sprite} frames={FARMER.frames} frameW={FARMER.frameW} frameH={FARMER.frameH} size={28} />;
                              const agent = AGENTS[agentKey];
                              return agent ? <SpriteAvatar src={agent.sprite} frames={agent.frames} frameW={agent.frameW} frameH={agent.frameH} size={28} /> : null;
                            })()}
                          </NameCell>
                        </td>
                        <td>
                          {(() => {
                            const badge = getReplyBadge(lead, t, styledTheme);
                            return <ReplyBadge $bg={badge.bg} $fg={badge.fg}>{badge.icon && REPLY_ICONS[badge.icon] && <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d={REPLY_ICONS[badge.icon]} /></svg>}{badge.text}</ReplyBadge>;
                          })()}
                        </td>
                        {isAdmin && (
                          <td style={{ fontSize: '0.75rem', color: styledTheme.colors.textSecondary }}>
                            {lead.user_id ? (userMap[lead.user_id] || lead.user_id.slice(0, 8)) : '—'}
                          </td>
                        )}
                        <td style={{ textAlign: 'center' }}>
                          {(lead as any)._tech_score != null ? (() => {
                            const s = (lead as any)._tech_score as number;
                            const bg = s >= 50 ? styledTheme.strong.mauve : s >= 25 ? styledTheme.colors.amber : styledTheme.strong.olive;
                            const label = s >= 50 ? t('leads.techOld') : s >= 25 ? t('leads.techNormal') : t('leads.techNew');
                            return (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: styledTheme.colors.textInverted,
                                background: bg,
                              }}>
                                {s} {label}
                              </span>
                            );
                          })() : <span style={{ color: styledTheme.colors.border, fontSize: '0.75rem' }}>—</span>}
                        </td>
                        <td>{(() => {
                          const g = getDateGroup(lead._imported_at);
                          if (g === 'today') return t('leads.groupToday');
                          if (g === 'yesterday') return t('leads.groupYesterday');
                          return lead._imported_at ? new Date(lead._imported_at).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';
                        })()}</td>
                        <td>
                          {(lead.status ?? '') !== 'contacted' && NEXT_STATUS[lead.status ?? ''] && (
                            <ActionBtn
                              $color={styledTheme.colors.accent}
                              title={STATUS_LABEL[lead.status ?? '']}
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(lead._id, NEXT_STATUS[lead.status ?? '']); }}
                            >
                              <IconArrowRight />
                            </ActionBtn>
                          )}
                          <DeleteIconBtn
                            title={t('leads.delete')}
                            onClick={(e) => { e.stopPropagation(); handleDelete(lead._id); }}
                          >
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M12 4.5l-.5 8.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1L4 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </DeleteIconBtn>
                        </td>
                      </TRow>
                        </React.Fragment>
                      );
                    });
                  })()
                )}
              </tbody>
            </Table>
          </TableWrap>
          {totalPages > 0 && (
            <PaginationRow>
              <span>{t('leads.showingOf', { count: leads.length, total })}</span>
              <PageBtns>
                <PageBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('common.prev')}</PageBtn>
                <PageBtn disabled>{page} / {totalPages}</PageBtn>
                <PageBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{t('common.next')}</PageBtn>
              </PageBtns>
            </PaginationRow>
          )}
        </PageCard>

      {/* Add Lead Modal */}
      {showAdd && (
        <Overlay $closing={addClosing} onClick={closeAddModal}>
          <Modal $closing={addClosing} onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h2>{t('leads.addLead')}</h2>
              <CloseBtn onClick={closeAddModal}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CloseBtn>
            </ModalHeader>
            <form onSubmit={handleCreate}>
              <ModalBody>
                <FormRow>
                  <FormGroup>
                    <Label>{t('leads.companyName')}</Label>
                    <Input
                      required
                      value={form.company_name}
                      onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                      placeholder={t('leads.enterCompanyName')}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('leads.email')}</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder={t('leads.enterEmail')}
                    />
                  </FormGroup>
                </FormRow>
                <FormRow>
                  <FormGroup>
                    <Label>{t('leads.phone')}</Label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder={t('leads.enterPhone')}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('leads.website')}</Label>
                    <Input
                      value={form.website}
                      onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                      placeholder={t('leads.enterWebsite')}
                    />
                  </FormGroup>
                </FormRow>
                <FormGroup>
                  <Label>{t('leads.address')}</Label>
                  <Input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder={t('leads.enterAddress')}
                  />
                </FormGroup>
                <FormRow>
                  <FormGroup>
                    <Label>{t('leads.source')}</Label>
                    <Input
                      value={form.source}
                      onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                      placeholder={t('leads.enterSource')}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>{t('leads.rating')}</Label>
                    <Input
                      value={form.rating}
                      onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}
                      placeholder={t('leads.enterRating')}
                    />
                  </FormGroup>
                </FormRow>
                <FormGroup>
                  <Label>{t('leads.industryTags')}</Label>
                  <Input
                    value={form.industry_tags}
                    onChange={e => setForm(f => ({ ...f, industry_tags: e.target.value }))}
                    placeholder={t('leads.enterIndustryTags')}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>{t('leads.description')}</Label>
                  <Textarea
                    value={form.website_description}
                    onChange={e => setForm(f => ({ ...f, website_description: e.target.value }))}
                    placeholder={t('leads.enterDescription')}
                    rows={3}
                  />
                </FormGroup>
              </ModalBody>
              <ModalFooter>
                <SecondaryBtn type="button" onClick={closeAddModal}>{t('common.close')}</SecondaryBtn>
                <PrimaryBtn type="submit" disabled={createLead.isPending}>
                  {createLead.isPending ? t('leads.creating') : t('common.submit')}
                </PrimaryBtn>
              </ModalFooter>
            </form>
          </Modal>
        </Overlay>
      )}

      {/* Lead Detail Panel — floating modal */}
      {selectedLead && createPortal(
        <DpOverlay $closing={detailClosing} onClick={handleCloseDetail}>
        <DpPanel ref={dpRef} $closing={detailClosing} onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ left: dpPos.x, top: dpPos.y, width: dpSize.w, height: dpSize.h }}>
          {/* Resize handles */}
          <div onMouseDown={e => onDpResizeStart(e, 'n')} style={{ position:'absolute', top:0, left:8, right:8, height:4, cursor:'n-resize', zIndex:10 }} />
          <div onMouseDown={e => onDpResizeStart(e, 's')} style={{ position:'absolute', bottom:0, left:8, right:8, height:4, cursor:'s-resize', zIndex:10 }} />
          <div onMouseDown={e => onDpResizeStart(e, 'w')} style={{ position:'absolute', top:8, bottom:8, left:0, width:4, cursor:'w-resize', zIndex:10 }} />
          <div onMouseDown={e => onDpResizeStart(e, 'e')} style={{ position:'absolute', top:8, bottom:8, right:0, width:4, cursor:'e-resize', zIndex:10 }} />
          <div onMouseDown={e => onDpResizeStart(e, 'nw')} style={{ position:'absolute', top:0, left:0, width:8, height:8, cursor:'nw-resize', zIndex:11 }} />
          <div onMouseDown={e => onDpResizeStart(e, 'ne')} style={{ position:'absolute', top:0, right:0, width:8, height:8, cursor:'ne-resize', zIndex:11 }} />
          <div onMouseDown={e => onDpResizeStart(e, 'sw')} style={{ position:'absolute', bottom:0, left:0, width:8, height:8, cursor:'sw-resize', zIndex:11 }} />
          <div onMouseDown={e => onDpResizeStart(e, 'se')} style={{ position:'absolute', bottom:0, right:0, width:8, height:8, cursor:'se-resize', zIndex:11 }} />
          <DpHeader onMouseDown={onDpDragStart}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <Avatar $colorIndex={hashColorIndex(selectedLead.company_name || 'Unknown')} style={{ width: 32, height: 32, fontSize: '0.7rem', borderRadius: 8, flexShrink: 0 }}>
                <AvatarIcon name={selectedLead.company_name || 'Unknown'} />
              </Avatar>
              <DpCompanyName style={{ fontSize: '1rem' }}>
                {selectedLead.company_name || 'Unknown'}
                {(() => { const qt = getQuarterTag((selectedLead as any)._imported_at); return qt ? <QuarterTag>{qt}</QuarterTag> : null; })()}
              </DpCompanyName>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
              {(selectedLead.status ?? '') !== 'contacted' && NEXT_STATUS[selectedLead.status ?? ''] && (
                <DpActionBtn
                  $variant="primary"
                  onClick={() => {
                    handleStatusChange(selectedLead._id, NEXT_STATUS[selectedLead.status ?? '']);
                    handleCloseDetail();
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ marginRight: 3 }}><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t('leads.advanceStatus')}
                </DpActionBtn>
              )}
            </div>
            <DpCloseBtn onClick={handleCloseDetail}><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></DpCloseBtn>
          </DpHeader>

          <DpBody>
            {/* Left: Avatar + Name + About + Tags + Reply */}
            <DpColLeft>
              <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 015 5c0 2.5-2 4-5 4s-5-1.5-5-4a5 5 0 015-5zM3 13c0-1.66 2.24-3 5-3s5 1.34 5 3" stroke="#D689BF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('leads.about')}</DpSectionTitle>
              <DpSectionContent>
              <DpField>
                <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M1 3.5h14v9H1v-9zm0 0l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.email')}</DpFieldLabel>
                <DpFieldValue>{selectedLead.email || '—'}</DpFieldValue>
              </DpField>
              <DpField>
                <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M10 1.5a3.5 3.5 0 013.5 3.5c0 3-5 8.5-5 8.5s-5-5.5-5-8.5A3.5 3.5 0 017 1.79" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.phone')}</DpFieldLabel>
                <DpFieldValue>{selectedLead.phone || '—'}</DpFieldValue>
              </DpField>
              <DpField>
                <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zM1 8h14M8 1c1.7 2 2.7 4 2.7 7s-1 5-2.7 7c-1.7-2-2.7-4-2.7-7s1-5 2.7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.website')}</DpFieldLabel>
                <DpFieldValue>{selectedLead.website ? <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener noreferrer">{selectedLead.website}</a> : '—'}</DpFieldValue>
              </DpField>
              <DpField>
                <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5 1.5 2 4.5 2 8c0 2.5 1 4.5 2.5 6h7C13 12.5 14 10.5 14 8c0-3.5-3-6.5-6-6.5zM5 14.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.address')}</DpFieldLabel>
                <DpFieldValue>{selectedLead.address || '—'}</DpFieldValue>
              </DpField>
              <DpField>
                <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.rating')}</DpFieldLabel>
                <DpFieldValue>{selectedLead.rating ? `${selectedLead.rating} / 5.0` : '—'}</DpFieldValue>
              </DpField>
              <DpField>
                <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.status')}</DpFieldLabel>
                <DpFieldValue><DpStatusPill $status={selectedLead.status ?? 'new'}>{selectedLead.status ?? 'new'}</DpStatusPill></DpFieldValue>
              </DpField>
              <DpField>
                <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M2 13h12M4 9l4-6 4 6M6 9v4M10 9v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.source')}</DpFieldLabel>
                <DpFieldValue>{getSourceDisplay(selectedLead.source || '') || '—'}</DpFieldValue>
              </DpField>
              </DpSectionContent>

              <DpDivider />
              <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 8.5V2.5a1 1 0 011-1h6l6.5 6.5-7 7L1 8.5z" stroke="#D689BF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5" cy="5" r="1" fill="#D689BF"/></svg>{t('leads.tags')}</DpSectionTitle>
              <DpSectionContent>
              <DpTagList>
                {selectedLead.industry_tags && selectedLead.industry_tags.length > 0
                  ? selectedLead.industry_tags.map(tag => (
                      <DpTag key={tag}>{tag}</DpTag>
                    ))
                  : <span style={{ fontSize: '0.8125rem', color: '#888' }}>—</span>
                }
              </DpTagList>
              </DpSectionContent>

              {selectedLead._replied && (() => {
                const cat = getReplyBadge(selectedLead, t, styledTheme) || { text: t('leads.replied'), bg: styledTheme.status.contacted.bg, fg: styledTheme.colors.accent };
                return (
                  <>
                    <DpDivider />
                    <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 10c0 .55-.45 1-1 1H5l-3 3V3c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v7z" stroke="#D689BF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('leads.replyInfo')}</DpSectionTitle>
                    <DpSectionContent>
                    <DpField>
                      <DpFieldLabel>{t('leads.replyCategory')}</DpFieldLabel>
                      <DpFieldValue><ReplyBadge $bg={cat.bg} $fg={cat.fg}>{cat.icon && REPLY_ICONS[cat.icon] && <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d={REPLY_ICONS[cat.icon]} /></svg>}{cat.text}</ReplyBadge></DpFieldValue>
                    </DpField>
                    <DpField>
                      <DpFieldLabel>{t('leads.replySentiment')}</DpFieldLabel>
                      <DpFieldValue>{selectedLead._reply_sentiment || '—'}</DpFieldValue>
                    </DpField>
                    <DpField>
                      <DpFieldLabel>{t('leads.replySummary')}</DpFieldLabel>
                      <DpFieldValue>{selectedLead._reply_summary || '—'}</DpFieldValue>
                    </DpField>
                    <DpField>
                      <DpFieldLabel>{t('leads.replyNextStep')}</DpFieldLabel>
                      <DpFieldValue>{selectedLead._reply_next_step || '—'}</DpFieldValue>
                    </DpField>
                    <DpField>
                      <DpFieldLabel>{t('leads.replyVia')}</DpFieldLabel>
                      <DpFieldValue>{selectedLead._reply_via || '—'}</DpFieldValue>
                    </DpField>
                    <DpField>
                      <DpFieldLabel>{t('leads.replyTime')}</DpFieldLabel>
                      <DpFieldValue>{selectedLead._reply_at ? new Date(selectedLead._reply_at).toLocaleString() : '—'}</DpFieldValue>
                    </DpField>
                    </DpSectionContent>
                  </>
                );
              })()}
            </DpColLeft>

            {/* Journey timeline */}
            <DpColJourney>
              <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 14V4l4 2 4-2 4 2v10l-4-2-4 2-4-2z" stroke="#D689BF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('leads.leadJourney')}</DpSectionTitle>
              <DpSectionContent>
              <DpTimeline>
                <DpTimelineItem>
                  <DpTimelineDotWrap><DpTimelineDot $active /><DpTimelineLine /></DpTimelineDotWrap>
                  <DpTimelineContent>
                    <DpTimelineText $active>{t('leads.discoveredVia', { source: getSourceDisplay(selectedLead.source || 'unknown') })}</DpTimelineText>
                    <DpTimelineTime>{(() => { const ts = selectedLead.createdAt || (selectedLead as any)._imported_at || (selectedLead as any).created_at; return ts ? new Date(ts).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'; })()}</DpTimelineTime>
                  </DpTimelineContent>
                </DpTimelineItem>
                <DpTimelineItem>
                  <DpTimelineDotWrap><DpTimelineDot $active /><DpTimelineLine /></DpTimelineDotWrap>
                  <DpTimelineContent>
                    <DpTimelineText $active>{t('leads.addedToPool')}</DpTimelineText>
                    <DpTimelineTime>{(() => { const ts = selectedLead.createdAt || (selectedLead as any)._imported_at || (selectedLead as any).created_at; return ts ? new Date(ts).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'; })()}</DpTimelineTime>
                  </DpTimelineContent>
                </DpTimelineItem>
                <DpTimelineItem>
                  <DpTimelineDotWrap>
                    <DpTimelineDot $active={selectedLead.status === 'pending' || selectedLead.status === 'contacted'} />
                    {(selectedLead.status === 'contacted' || selectedLead._replied) && <DpTimelineLine />}
                  </DpTimelineDotWrap>
                  <DpTimelineContent>
                    <DpTimelineText $active={selectedLead.status === 'pending' || selectedLead.status === 'contacted'}>{selectedLead.status === 'new' ? t('leads.awaitingReview') : t('leads.markedAsPending')}</DpTimelineText>
                    {selectedLead.status !== 'new' && selectedLead.updatedAt && <DpTimelineTime>{new Date(selectedLead.updatedAt).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</DpTimelineTime>}
                  </DpTimelineContent>
                </DpTimelineItem>
                {selectedLead.status === 'contacted' && (
                  <DpTimelineItem>
                    <DpTimelineDotWrap>
                      <DpTimelineDot $active />
                      {selectedLead._replied && <DpTimelineLine />}
                    </DpTimelineDotWrap>
                    <DpTimelineContent>
                      <DpTimelineText $active>{t('leads.contactedStep')}</DpTimelineText>
                      {selectedLead.updatedAt && <DpTimelineTime>{new Date(selectedLead.updatedAt).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</DpTimelineTime>}
                    </DpTimelineContent>
                  </DpTimelineItem>
                )}
                {selectedLead._replied && (
                  <DpTimelineItem>
                    <DpTimelineDotWrap><DpTimelineDot $active /></DpTimelineDotWrap>
                    <DpTimelineContent>
                      <DpTimelineText $active>{t('leads.receivedReply', { text: getReplyBadge(selectedLead, t, styledTheme)?.text || t('leads.replied') })}</DpTimelineText>
                      {selectedLead._reply_at && <DpTimelineTime>{new Date(selectedLead._reply_at).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</DpTimelineTime>}
                    </DpTimelineContent>
                  </DpTimelineItem>
                )}
              </DpTimeline>
              </DpSectionContent>
            </DpColJourney>

            {/* Bottom: email feed (full width) */}
            <DpColCenter>
              {selectedLead.company_name && (
                <LeadEmails companyName={selectedLead.company_name} leadId={selectedLead._id} />
              )}
            </DpColCenter>
          </DpBody>
          {/* footer removed — no delete action */}
        </DpPanel>
        </DpOverlay>,
        document.body
      )}

      {/* Footer */}
      <Footer>
        <span>{t('footer.copyrightHermes', { year: 2026 })}</span>
        <div>
          <a href="#">{t('footer.documentation')}</a>
          <a href="#">{t('footer.support')}</a>
          <a href="#">{t('footer.faqs')}</a>
        </div>
      </Footer>
    </Page>
  );
};

export default Leads;
