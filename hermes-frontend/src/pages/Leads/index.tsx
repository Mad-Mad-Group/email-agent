import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const I18N_LOCALE_MAP: Record<string, string> = { en: 'en-US', 'zh-TW': 'zh-HK', 'zh-CN': 'zh-CN' };
const getDateLocale = () => I18N_LOCALE_MAP[i18n.language] || 'en-US';
import { useLeads, useDeleteLead, useChangeLeadStatus, useCreateLead, useEmailQueue, useApproveEmail, useRejectEmail, useSendEmail, useClearAllLeads, useReprocessLead, useMe } from '../../api/hooks';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/services';
import { Lead } from '../../api/leads';
import { EmailItem } from '../../api/emailQueue';
import client from '../../api/client';
import { media } from '../../styles/media';
import { useDialog } from '../../components';
import SpriteAvatar from '../../components/SpriteAvatar';
import { AGENTS, FARMER, SOURCE_AGENT } from '../../config/agents';

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

const IconSortArrow = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: 4, opacity: 0.4 }}>
    <path d="M5 1v8M2 6l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconLeadScraper = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#0ea5e9"/>
    <path d="M13 17a7 7 0 0 1 14 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="20" cy="15" r="3.5" stroke="#fff" strokeWidth="1.8"/>
    <path d="M11 28c0-3.87 4.03-7 9-7s9 3.13 9 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

/* ── Avatar color from name hash ── */

const hashColor = (name: string): string => {
  const colors = ['#bfdbfe', '#c4b5fd', '#a5f3fc', '#bbf7d0', '#fecaca', '#fde68a', '#e9d5ff', '#cffafe'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
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

const HeaderFeedback = styled.div`
  min-height: 0;
  display: flex;
  gap: 12px;
`;

const FeedbackMsg = styled.span<{ $error?: boolean }>`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ $error, theme }) => $error ? theme.colors.red : theme.colors.green};
  animation: leadsFeedbackFade 4s ease-out forwards;
  @keyframes leadsFeedbackFade {
    0% { opacity: 0; transform: translateY(-4px); }
    10% { opacity: 1; transform: translateY(0); }
    80% { opacity: 1; }
    100% { opacity: 0; }
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
  background: ${({ theme }) => theme.colors.blue};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
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
    color: ${({ theme }) => theme.colors.blue};
  }
`;

const HeaderDivider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: 0;
`;

const StatCardsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} { grid-template-columns: repeat(2, 1fr); }
`;

const StatCard = styled.div<{ $accent: string; $bg1?: string; $bg2?: string }>`
  position: relative; overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.card}px;
  border-left: 4px solid ${({ $accent }) => $accent};
  background: ${({ theme, $bg1, $bg2 }) =>
    theme.mode === 'dark'
      ? theme.colors.surface
      : `linear-gradient(135deg, ${$bg1 || '#f0fdf4'}, ${$bg2 || '#dcfce7'})`};
  padding: 18px 20px 16px;
  transition: transform 0.18s, box-shadow 0.18s;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.10); }
`;

const StatCardWatermark = styled.span<{ $color: string }>`
  position: absolute; right: -4px; bottom: -6px;
  width: 56px; height: 56px; opacity: 0.10;
  pointer-events: none;
  color: ${({ $color }) => $color};
  line-height: 0;
  svg { width: 100%; height: 100%; }
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
  font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; opacity: 0.55;
  color: ${({ theme }) => theme.colors.textPrimary}; margin-bottom: 6px; display: block;
`;

const StatCardValue = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
`;

const StatCardNumber = styled.span<{ $color: string }>`
  font-size: 2rem;
  font-weight: 800;
  color: ${({ $color }) => $color};
  line-height: 1;
`;

const StatCardUnit = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Circular Action Buttons with Tooltip ── */

const CircleActionBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ $color, theme }) => $color || theme.colors.textSecondary};
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  position: relative;

  &:hover {
    border-color: ${({ $color, theme }) => $color || theme.colors.accent};
    color: ${({ $color, theme }) => $color || theme.colors.accent};
    background: ${({ $color, theme }) => `${$color || theme.colors.accent}0d`};
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  &:hover::after {
    content: attr(aria-label);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 10px;
    border-radius: 6px;
    background: ${({ theme }) => theme.mode === 'dark' ? theme.colors.borderStrong : theme.colors.textPrimary};
    color: #fff;
    font-size: 0.6875rem;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    z-index: 50;
    animation: tooltipIn 0.12s ease-out;
  }
  @keyframes tooltipIn {
    from { opacity: 0; transform: translateX(-50%) translateY(2px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  &:disabled:hover::after { display: none; }
  svg { width: 16px; height: 16px; }
`;

const AutoCheckBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.green : theme.colors.border};
  background: ${({ $active, theme }) => $active ? `${theme.colors.green}14` : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.green : theme.colors.textSecondary};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  svg { width: 14px; height: 14px; }
  &:hover {
    border-color: ${({ theme }) => theme.colors.green};
    color: ${({ theme }) => theme.colors.green};
    background: ${({ theme }) => `${theme.colors.green}14`};
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
  color: ${({ $color }) => $color};
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
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.accent}, ${({ theme }) => theme.colors.accent}cc);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 3px ${({ theme }) => theme.colors.accent}33;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px ${({ theme }) => theme.colors.accent}40;
    opacity: 0.95;
  }
  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${media.tabletDown} {
    width: 100%;
    justify-content: center;
    padding: 8px 12px;
    font-size: 0.75rem;
  }
`;

const AddBtnGreen = styled(AddBtn)`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.green}, ${({ theme }) => theme.colors.green}cc);
  box-shadow: 0 1px 3px ${({ theme }) => theme.colors.green}33;
  &:hover {
    box-shadow: 0 3px 10px ${({ theme }) => theme.colors.green}40;
  }
`;

// ponytail: red danger button for "一鍵清空" — visually distinct from the
// green AddBtn so the user can't misclick.
const ClearBtn = styled(AddBtn)`
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.red}, ${({ theme }) => theme.colors.red}cc);
  box-shadow: 0 1px 3px ${({ theme }) => theme.colors.red}33;
  &:hover:not(:disabled) {
    box-shadow: 0 3px 10px ${({ theme }) => theme.colors.red}40;
  }
`;

/* ── Tabs Row ── */

const TabsRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  ${media.tabletDown} {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    &::-webkit-scrollbar { display: none; }
  }
`;

const TabItem = styled.button<{ $active?: boolean; $color?: string }>`
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active, $color, theme }) => $active ? ($color || theme.colors.accent) : 'transparent'};
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  font-size: 0.8125rem;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  svg { flex-shrink: 0; opacity: ${({ $active }) => $active ? 0.7 : 0.35}; }
  color: ${({ $active, theme }) => $active ? 'inherit' : theme.colors.textTertiary};
  &:hover { background: rgba(0,0,0,0.02); }
  ${media.tabletDown} { padding: 8px 14px; flex: 1; justify-content: center; }
`;

const TabNumber = styled.span<{ $color: string }>`
  font-size: 1.35rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
`;

const TabLabel = styled.span<{ $active?: boolean }>`
  font-size: 0.875rem;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textTertiary};
`;

const SubPillRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px ${({ theme }) => theme.spacing.xl}px;
  flex-wrap: wrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
  ${media.tabletDown} { padding: 8px 12px; gap: 4px; }
`;

const SUB_COLORS: Record<string, string> = {
  '': '#334155',
  new: '#ca8a04',
  draft: '#ca8a04',
  no_followup: '#dc2626',
  has_followup: '#16a34a',
  interested: '#16a34a',
  meeting: '#16a34a',
  question: '#334155',
  not_interested: '#dc2626',
};

const SubPill = styled.button<{ $active?: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 12px;
  border-radius: 999px;
  border: ${({ $active, theme }) => $active ? `1px solid ${theme.colors.accent}40` : '1px solid transparent'};
  font-size: 0.75rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  background: ${({ $active, theme }) => $active ? `${theme.colors.accent}14` : 'transparent'};
  backdrop-filter: ${({ $active }) => $active ? 'blur(8px)' : 'none'};
  -webkit-backdrop-filter: ${({ $active }) => $active ? 'blur(8px)' : 'none'};
  box-shadow: ${({ $active, theme }) => $active ? `0 1px 4px ${theme.colors.accent}0f` : 'none'};
  color: ${({ $active, $color, theme }) => ($active ? ($color || theme.colors.accent) : 'inherit')};
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s;
`;

/* ── Search Bar (inline in SubPillRow) ── */

const SearchWrap = styled.div`
  position: relative;
  width: 360px;
  margin-left: auto;
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
    border-color: ${({ theme }) => theme.colors.blue};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.accent}14;
  }
  &:hover:not(:focus) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

/* ── Table ── */

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow: hidden;
`;

const TableWrap = styled.div`
  overflow-x: auto;
  padding: ${({ theme }) => theme.spacing.lg}px ${({ theme }) => theme.spacing.xl}px;
`;

const Table = styled.table`
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.8125rem;
  min-width: 960px;
  th:nth-child(1) { width: 12%; }
  th:nth-child(2) { width: 30%; }
  th:nth-child(3) { width: 18%; }
  th:nth-child(4) { width: 20%; }
  th:nth-child(5) { width: 20%; }
  th, td {
    padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  th {
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    letter-spacing: 0.02em;
    background: ${({ theme }) => theme.colors.canvas};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    user-select: none;
    cursor: default;
  }
  ${media.mobile} {
    min-width: 640px;
    font-size: 0.75rem;
    th, td { padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.sm}px; }
    th { font-size: 0.625rem; }
  }
`;

const TRow = styled.tr<{ $even?: boolean; $collapsed?: boolean }>`
  background: ${({ $even, theme }) => $even ? theme.colors.surfaceMuted : theme.colors.surface};
  transition: background 0.15s;
  cursor: pointer;
  &:hover {
    background: ${({ theme, $collapsed }) => $collapsed ? 'transparent' : (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : theme.colors.surfaceMuted)};
  }
  td {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    overflow: hidden;
    transition: padding 0.3s ease, max-height 0.3s ease, opacity 0.3s ease, border-color 0.3s ease;
  }
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

const Avatar = styled.div<{ $color: string }>`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: ${({ $color }) => $color};
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: none;
  line-height: 1;
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

const StatusBadge = styled.span<{ $status?: string }>`
  display: inline-block;
  padding: 4px 14px;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 600;
  ${({ $status, theme }) => {
    const s = theme.status as Record<string, { bg: string; fg: string }>;
    const entry = s[$status ?? 'new'] ?? s.new;
    return `
      background: ${entry.bg};
      color: ${entry.fg};
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    `;
  }}
`;

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
    color: #fff;
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
    color: ${({ theme }) => theme.colors.red};
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

const EmptyLeadsIllustration = () => (
  <svg width="110" height="85" viewBox="0 0 110 85" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="12" width="80" height="56" rx="8" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5"/>
    <circle cx="40" cy="34" r="8" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1"/>
    <rect x="54" y="30" width="30" height="3" rx="1.5" fill="#93c5fd" opacity="0.5"/>
    <rect x="54" y="37" width="20" height="3" rx="1.5" fill="#bfdbfe" opacity="0.5"/>
    <line x1="20" y1="50" x2="90" y2="50" stroke="#dbeafe" strokeWidth="1"/>
    <circle cx="40" cy="58" r="5" fill="#dbeafe" stroke="#bfdbfe" strokeWidth="0.8" strokeDasharray="2 2"/>
    <rect x="54" y="55" width="25" height="3" rx="1.5" fill="#bfdbfe" opacity="0.3"/>
    <rect x="54" y="61" width="16" height="3" rx="1.5" fill="#dbeafe" opacity="0.3"/>
  </svg>
);

/* ── Date Group Header ── */

const GROUP_COLORS: Record<string, { bg: string; bgDark: string; fg: string; fgDark: string }> = {
<<<<<<< Updated upstream
  today:  { bg: '#cffafe', bgDark: '#083344', fg: '#0ea5e9', fgDark: '#67e8f9' },
  yesterday:  { bg: '#fef3c7', bgDark: '#422006', fg: '#b45309', fgDark: '#fcd34d' },
  earlier: { bg: '#f1f5f9', bgDark: '#1e293b', fg: '#64748b', fgDark: '#94a3b8' },
=======
  'today':  { bg: '#cffafe', bgDark: '#083344', fg: '#0ea5e9', fgDark: '#67e8f9' },
  'yesterday':  { bg: '#fef3c7', bgDark: '#422006', fg: '#b45309', fgDark: '#fcd34d' },
  'earlier': { bg: '#f1f5f9', bgDark: '#1e293b', fg: '#64748b', fgDark: '#94a3b8' },
>>>>>>> Stashed changes
};

const GroupBar = styled.tr<{ $group: string; $dark?: boolean }>`
  td {
    padding: 6px 0;
    border-bottom: none;
  }
`;

const GroupBarInner = styled.div<{ $group: string; $dark?: boolean; $collapsed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  background: ${({ $group, $dark }) => {
    const c = GROUP_COLORS[$group] || GROUP_COLORS['earlier'];
    return $dark ? c.bgDark : c.bg;
  }};
  color: ${({ $group, $dark }) => {
    const c = GROUP_COLORS[$group] || GROUP_COLORS['earlier'];
    return $dark ? c.fgDark : c.fg;
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
    ? theme.colors.blue
    : theme.colors.surface};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.colors.textSecondary};
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
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  width: 520px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
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
    background: ${({ theme }) => `${theme.colors.accent}${theme.mode === 'dark' ? '26' : '14'}`};
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
    border-color: ${({ theme }) => theme.colors.blue};
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
    border-color: ${({ theme }) => theme.colors.blue};
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
  background: ${({ theme }) => theme.colors.blue};
  color: #fff;
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

const DpOverlay = styled.div<{ $closing?: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)'};
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${({ $closing }) => $closing ? dpFadeOut : dpFadeIn} 0.2s ease-out forwards;
`;

const DpPanel = styled.div<{ $closing?: boolean }>`
  width: 88vw;
  max-width: 1400px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card + 2}px;
  box-shadow: ${({ theme }) => theme.mode === 'dark'
    ? '0 20px 60px rgba(0,0,0,0.5)'
    : '0 20px 60px rgba(0,0,0,0.18)'};
  overflow: hidden;
  animation: ${({ $closing }) => $closing ? dpSlideDown : dpSlideUp} 0.25s ease-out forwards;
  ${media.mobile} {
    width: 95vw;
    height: 92vh;
  }
`;

const DpHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 24px;
  border-bottom: none;
  background: ${({ theme }) => theme.mode === 'dark' ? '#083344' : '#cffafe'};
  position: relative;
  overflow: hidden;
`;

const DpHeaderInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
`;

const DpCompanyName = styled.h2`
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.mode === 'dark' ? '#cffafe' : '#083344'};
  letter-spacing: 0.01em;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif;
`;

const DpCloseBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.8)' : theme.colors.accent};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : `${theme.colors.accent}14`};
  }
`;

const DpBody = styled.div`
  flex: 1;
  height: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 340px 1fr;
  grid-template-rows: 1fr;
  gap: 0;
  overflow: hidden;
  ${media.tabletDown} { grid-template-columns: 1fr; grid-template-rows: auto; height: auto; overflow-y: auto; }
`;

const DpColLeft = styled.div`
  padding: 20px 22px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  ${media.tabletDown} { border-right: none; border-bottom: 1px solid ${({ theme }) => theme.colors.border}; overflow-y: visible; padding: 10px 16px; }
`;

const DpTabSection = styled.div`
  position: relative;
  margin-top: 22px;
  &:first-of-type { margin-top: 0; }
`;

const DpTabLabel = styled.span`
  position: absolute;
  top: 5px;
  left: 0;
  transform: translateY(-100%);
  padding: 3px 14px 2px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border}33;
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  z-index: 2;
  user-select: none;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: -14px;
    width: 14px;
    height: 14px;
    background: transparent;
    border-radius: 0 0 0 14px;
    box-shadow: -6px 0 0 0 ${({ theme }) => theme.colors.surface};
    border-left: 1px solid ${({ theme }) => theme.colors.border}33;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border}33;
  }
`;

const DpTabCard = styled.div`
  position: relative;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.control}px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  border: 1px solid ${({ theme }) => theme.colors.border}33;
`;

const DpCollapsibleHead = styled.div`
  display: none;
  ${media.tabletDown} {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    padding: 2px 0;
  }
`;
const DpCollapsibleBody = styled.div<{ $open?: boolean }>`
  ${media.tabletDown} {
    display: ${({ $open }) => $open ? 'flex' : 'none'};
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
  }
`;

const DpColCenter = styled.div`
  padding: 16px 24px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  ${media.tabletDown} { overflow-y: visible; padding: 12px 16px; }
`;

const DpGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const DpField = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}11;
  &:last-child { border-bottom: none; }
`;

const DpFieldLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textTertiary};
  letter-spacing: 0.02em;
  min-width: 80px;
  flex-shrink: 0;
`;

const DpFieldValue = styled.span`
  font-size: 0.8625rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  word-break: break-word;
  flex: 1;
  min-width: 0;
`;

const DpFieldIcon = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: ${({ $color }) => $color}14;
  color: ${({ $color }) => $color};
  flex-shrink: 0;
  svg { width: 13px; height: 13px; }
`;

const DpSectionTitle = styled.h3`
  margin: 6px 0 2px;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const DpTagList = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const DpTag = styled.span`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const DpTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const DpTimelineItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}15;
  &:last-child { border-bottom: none; }
`;

const DpTimelineTime = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textTertiary};
  min-width: 72px;
  flex-shrink: 0;
  padding-top: 1px;
`;

const DpTimelineDot = styled.span<{ $active?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
  background: ${({ $active, theme }) => $active ? theme.colors.blue : theme.colors.border};
  ${({ $active, theme }) => $active ? `box-shadow: 0 0 6px ${theme.colors.blue}55;` : ''}
`;

const DpTimelineText = styled.span<{ $active?: boolean }>`
  font-size: 0.8rem;
  line-height: 1.4;
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textTertiary};
  font-weight: ${({ $active }) => $active ? 600 : 400};
`;

const DpFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const DpActionBtn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
  border: 1px solid ${({ $variant, theme }) =>
    $variant === 'danger' ? (theme.mode === 'dark' ? 'rgba(239,68,68,0.4)' : `${theme.colors.red}55`) :
    theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : `${theme.colors.accent}33`};
  background: ${({ $variant, theme }) =>
    $variant === 'danger' ? (theme.mode === 'dark' ? 'rgba(239,68,68,0.18)' : '#fef2f2') :
    $variant === 'primary' ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : `${theme.colors.accent}1a`) :
    'transparent'};
  color: ${({ $variant, theme }) =>
    $variant === 'danger' ? (theme.mode === 'dark' ? '#fca5a5' : '#dc2626') :
    theme.colors.accent};
  &:hover { opacity: 0.85; }
`;

/* ── Helpers ── */

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const NEXT_STATUS: Record<string, string> = {
  new: 'pending',
  pending: 'contacted',
};

const getReplyCategoryLabel = (t: (k: string, opts?: any) => string) => ({
  interested:         { text: t('leads.replyInterested'),        bg: '#dcfce7', fg: '#16a34a' },
  interested_pending: { text: t('leads.replyInterestedPending'), bg: '#fef3c7', fg: '#b45309' },
  not_interested:     { text: t('leads.replyNotInterested'),     bg: '#fee2e2', fg: '#dc2626' },
  meeting:            { text: t('leads.replyMeeting'),           bg: '#cffafe', fg: '#0ea5e9' },
  auto_reply:         { text: t('leads.replyAutoReply'),         bg: '#f3f4f6', fg: '#6b7280' },
  question:           { text: t('leads.replyProcessing'),        bg: '#cffafe', fg: '#0ea5e9' },
} as Record<string, { text: string; bg: string; fg: string }>);

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
    subject: 'Partnership Opportunity — ClientRadar AI x Dragon Logistics',
    body: '<p>Hi there,</p><p>We\'d love to explore a potential partnership. Our AI-driven email automation could significantly reduce your outreach costs.</p><p>Would you be available for a 15-min call next week?</p><p>Best,<br/>ClientRadar AI Team</p>',
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
    subject: 'Re: Pricing & Compliance — ClientRadar AI Platform',
    body: '<p>Hi,</p><p>Thanks for your questions. Here\'s our pricing breakdown:</p><ul><li>Starter: $299/mo</li><li>Pro: $799/mo</li><li>Enterprise: Custom</li></ul><p>All plans include SOC2 compliance. Happy to discuss further.</p>',
    status: 'pending', _type: 'reply', created_at: new Date(Date.now() - 7200000).toISOString(),
    _summary: 'Detailed pricing info sent. Covers Starter/Pro/Enterprise tiers + SOC2 compliance.' } as any,
  // Acme Corp — sent first outreach
  { _id: 'em-7', lead_id: 'mock-1', company_name: 'Acme Corp', to_email: 'hello@acme.com',
    subject: 'Intro — ClientRadar AI Email Agent',
    body: '<p>Hello Acme Corp,</p><p>We\'re reaching out because we believe our AI email agent could help your sales team. Would you be open to a quick intro call?</p>',
    status: 'sent', created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    sent_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  // Peak Ventures — reoutreach, pending
  { _id: 'em-8', lead_id: 'mock-10', company_name: 'Peak Ventures', to_email: 'invest@peakvc.com',
    subject: 'Re-introduction — ClientRadar AI Series A Update',
    body: '<p>Hi Peak Ventures,</p><p>Since we last connected, we\'ve hit some exciting milestones. Would love to share our latest traction numbers.</p>',
    status: 'pending', _type: 'reoutreach', created_at: new Date(Date.now() - 3600000).toISOString() },
];

/** 根據 lead 狀態決定顯示邊個 reply badge */
const getReplyBadge = (lead: Lead, t: (k: string, opts?: any) => string) => {
  const labels = getReplyCategoryLabel(t);
  if (lead._replied) {
    if (lead._reply_category === 'interested' && lead._pending_meeting) {
      return labels.interested_pending;
    }
    return labels[lead._reply_category || ''] || { text: t('leads.replyProcessing'), bg: '#cffafe', fg: '#0ea5e9' };
  }
  if (lead.status === 'contacted') {
    return lead._has_email_draft
      ? { text: t('leads.draftPending'), bg: '#fef3c7', fg: '#b45309' }
      : { text: t('leads.awaitingReply'), bg: '#cffafe', fg: '#0ea5e9' };
  }
  if (lead.status === 'pending') {
    return { text: t('leads.draftPending'), bg: '#fef3c7', fg: '#b45309' };
  }
  if (lead._has_email_draft) {
    return { text: t('leads.draftPending'), bg: '#fef3c7', fg: '#b45309' };
  }
  return { text: t('leads.unprocessed'), bg: '#f3f4f6', fg: '#9ca3af' };
};

const ReplyBadge = styled.span<{ $bg: string; $fg: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  white-space: nowrap;
`;

const NoReplyText = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Lead Emails section（撳開 lead 就睇到所有相關 email） ── */

const getEmailTypeLabel = (t: (k: string) => string) => ({
  reply:      { text: t('leads.emailTypeReply'),      bg: '#dcfce7', fg: '#16a34a' },
  followup:   { text: t('leads.emailTypeFollowup'),   bg: '#fef3c7', fg: '#b45309' },
  reoutreach: { text: t('leads.emailTypeReoutreach'), bg: '#cffafe', fg: '#0ea5e9' },
} as Record<string, { text: string; bg: string; fg: string }>);

const EMAIL_STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  pending:  { bg: '#fef3c7', fg: '#ca8a04' },
  approved: { bg: '#dcfce7', fg: '#16a34a' },
  sent:     { bg: '#cffafe', fg: '#0ea5e9' },
  rejected: { bg: '#fee2e2', fg: '#dc2626' },
  failed:   { bg: '#f3f4f6', fg: '#475569' },
};

const EmailCard = styled.div<{ $expanded?: boolean }>`
  border: none;
  border-radius: ${({ theme }) => theme.radii.card}px;
  margin-bottom: 10px;
  background: ${({ theme }) => theme.mode === 'dark' ? theme.colors.surface : '#fffdf9'};
  box-shadow: 0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03);
  max-width: 100%;
  position: relative;
  overflow: visible;

  /* Paper fold corner */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 20px;
    height: 20px;
    background: linear-gradient(225deg, ${({ theme }) => theme.mode === 'dark' ? theme.colors.canvas : '#f1ede6'} 50%, transparent 50%);
    border-bottom-left-radius: 4px;
  }
`;
const EmailCardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px ${({ theme }) => theme.spacing.md}px;
  flex-wrap: wrap;
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
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  white-space: nowrap;
`;
const EmailCardBody = styled.div`
  padding: 0 ${({ theme }) => theme.spacing.md}px 8px;
`;
const EmailBodyContent = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  font-size: 0.875rem;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: ${({ theme }) => theme.spacing.md}px;
  background: ${({ theme }) => theme.mode === 'dark' ? theme.colors.surfaceMuted : '#fffcf7'};
  border-radius: ${({ theme }) => theme.radii.control}px;
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? theme.colors.border : '#e8e0d4'};
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.04);
  max-width: 100%;
  overflow-x: hidden;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
`;
const EmailCardMeta = styled.div`
  margin-top: 6px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;
const EmailSummary = styled.div`
  margin: 0 ${({ theme }) => theme.spacing.md}px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.mode === 'dark' ? '#083344' : '#ecfeff'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? `${theme.colors.accent}40` : '#99f6e4'};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.accent};
  display: flex;
  align-items: flex-start;
  gap: 6px;
`;
const EmailSummaryLabel = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent};
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
  padding: 5px 14px;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ $fg }) => $fg};
  background: ${({ $bg }) => $bg};
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover:not(:disabled) { opacity: 0.85; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const LeadSendBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.green};
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover:not(:disabled) { opacity: 0.85; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const LeadEmails: React.FC<{ companyName: string; leadId?: string }> = ({ companyName, leadId }) => {
  const { t } = useTranslation();
  const { showPrompt } = useDialog();
  const { data } = useEmailQueue({ search: companyName });
  const approve = useApproveEmail();
  const reject = useRejectEmail();
  const send = useSendEmail();

  const apiEmails = (data?.data as EmailItem[]) || [];
  const pool = [...MOCK_EMAILS, ...apiEmails];
  const emails = pool
    .filter((e) => (e.lead_id === leadId) || (e.company_name || '') === companyName)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

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

  return (
    <>
      <DpSectionTitle>{t('leads.emailRecords')} ({emails.length})</DpSectionTitle>
      {emails.map((d) => {
        const typeTag = d._type ? getEmailTypeLabel(t)[d._type] : null;
        const statusColor = EMAIL_STATUS_COLOR[d.status || 'pending'] || EMAIL_STATUS_COLOR.pending;

        return (
          <EmailCard key={d._id}>
            <EmailCardHead>
              {typeTag && <ReplyBadge $bg={typeTag.bg} $fg={typeTag.fg}>{typeTag.text}</ReplyBadge>}
              <ReplyBadge $bg={statusColor.bg} $fg={statusColor.fg}>{t(`email.status.${d.status || 'pending'}`)}</ReplyBadge>
              <EmailCardDate>
                {d.created_at ? new Date(d.created_at).toLocaleString(getDateLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
              </EmailCardDate>
              <div style={{ flex: 1 }} />
              {d.status === 'pending' && (
                <>
                  <LeadSendBtn disabled={busy} onClick={() => handleApproveAndSend(d)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {busy ? t('leads.processing') : t('leads.approveAndSend')}
                  </LeadSendBtn>
                  <EmailActionBtn $bg="#fef2f2" $fg="#dc2626" disabled={busy} onClick={() => handleReject(d._id)}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    {t('leads.reject')}
                  </EmailActionBtn>
                </>
              )}
              {d.status === 'approved' && (
                <LeadSendBtn disabled={busy} onClick={() => send.mutate(d._id)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {busy ? t('leads.processing') : t('leads.send')}
                </LeadSendBtn>
              )}
              {d.status === 'sent' && (
                <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>✓ {t('leads.sentAt')} {d.sent_at ? new Date(d.sent_at).toLocaleString(getDateLocale()) : ''}</span>
              )}
              {d.status === 'rejected' && (
                <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>✗ {t('leads.rejected')}</span>
              )}
            </EmailCardHead>

            {(d as any)._summary && (
              <EmailSummary>
                <EmailSummaryLabel>{t('leads.aiSummary')}</EmailSummaryLabel>
                {(d as any)._summary}
              </EmailSummary>
            )}

            <EmailCardBody>
              <EmailBodyContent dangerouslySetInnerHTML={{ __html: d.body || '—' }} />
              <EmailCardMeta>{t('leads.sendTo')} {d.to_email || '—'}</EmailCardMeta>
            </EmailCardBody>
          </EmailCard>
        );
      })}
    </>
  );
};

/* ── Tabs config (labels moved inside component for i18n) ── */

interface SubTab {
  key: string;
  label: string;
  icon: string;
}
interface TabDef {
  key: string;
  label: string;
  color: string;
  icon: string;
  subs: SubTab[];
  filter: (l: Lead, sub: string) => boolean;
}

/* ── Tab / Sub-pill icon SVG paths (16×16 viewBox) ── */
const TAB_ICONS: Record<string, string> = {
  preparing: 'M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm1 3h6M5 7h6M5 9h4',
  awaiting: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v4l2.5 1.5',
  replied: 'M1 3h14v10H1V3zm0 0l7 5 7-5',
};
const SUB_ICONS: Record<string, string> = {
  '': 'M2 2h12v12H2V2zm2 3h8M4 7h8M4 9h5',
  new: 'M8 1l2 3h3l-1 3 2 2-3 1-1 3-2-2-2 2-1-3-3-1 2-2-1-3h3z',
  draft: 'M12.146 1.146a.5.5 0 01.708 0l2 2a.5.5 0 010 .708l-9.5 9.5a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168l9.5-9.5z',
  no_followup: 'M8 1a7 7 0 100 14A7 7 0 008 1zm3 4L7 9.5 5 7.5',
  has_followup: 'M8 1a7 7 0 100 14A7 7 0 008 1zm-2 4l2 2 4-4',
  interested: 'M8 2l1.5 3.5L13 6l-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5z',
  meeting: 'M2 3h12v10H2V3zm0 3h12M5 1v3M11 1v3',
  question: 'M8 1a7 7 0 100 14A7 7 0 008 1zM6.5 5.5a1.5 1.5 0 013 0c0 1-1.5 1.25-1.5 2.5M8 11h.01',
  not_interested: 'M8 1a7 7 0 100 14A7 7 0 008 1zM5.5 5.5l5 5M10.5 5.5l-5 5',
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
      key: 'preparing',
      label: t('leads.tabPreparing'),
      color: '#0ea5e9',
      icon: 'preparing',
      subs: [
        { key: '', label: t('leads.subAll'), icon: '' },
        { key: 'new', label: t('leads.subNew'), icon: 'new' },
        { key: 'draft', label: t('leads.subDraft'), icon: 'draft' },
      ],
      filter: (l, sub) => {
        if (!isNew(l) && l.status !== 'pending') return false;
        if (sub === 'new') return isNew(l);
        if (sub === 'draft') return l.status === 'pending';
        return true;
      },
    },
    {
      key: 'awaiting',
      label: t('leads.tabAwaiting'),
      color: '#ca8a04',
      icon: 'awaiting',
      subs: [
        { key: '', label: t('leads.subAll'), icon: '' },
        { key: 'no_followup', label: t('leads.subNoFollowup'), icon: 'no_followup' },
        { key: 'has_followup', label: t('leads.subHasFollowup'), icon: 'has_followup' },
      ],
      filter: (l, sub) => {
        if (l.status !== 'contacted') return false;
        if (l._replied) return false;
        if (sub === 'no_followup') return !l._followup_count;
        if (sub === 'has_followup') return (l._followup_count || 0) > 0;
        return true;
      },
    },
    {
      key: 'replied',
      label: t('leads.tabReplied'),
      color: '#16a34a',
      icon: 'replied',
      subs: [
        { key: '', label: t('leads.subAll'), icon: '' },
        { key: 'interested', label: t('leads.subInterested'), icon: 'interested' },
        { key: 'meeting', label: t('leads.subMeeting'), icon: 'meeting' },
        { key: 'question', label: t('leads.subQuestion'), icon: 'question' },
        { key: 'not_interested', label: t('leads.subNotInterested'), icon: 'not_interested' },
      ],
      filter: (l, sub) => {
        if (l.status !== 'contacted') return false;
        if (!l._replied) return false;
        if (sub === 'interested') return l._reply_category === 'interested';
        if (sub === 'meeting') return l._reply_category === 'meeting';
        if (sub === 'question') return l._reply_category === 'question';
        if (sub === 'not_interested') return l._reply_category === 'not_interested';
        return true;
      },
    },
  ];

  const STATUS_LABEL: Record<string, string> = {
    new: t('leads.setPending'),
    pending: t('leads.setContacted'),
  };

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('preparing');
  const [activeSub, setActiveSub] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const styledTheme = useTheme() as any;
  const isDark = styledTheme?.mode === 'dark';

  const [searchParams, setSearchParams] = useSearchParams();
  const [showAdd, setShowAdd] = useState(false);
  const [addClosing, setAddClosing] = useState(false);
  const addTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const detailTimerRef = useRef<ReturnType<typeof setTimeout>>();
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
  const [replyCheckError, setReplyCheckError] = useState(false);
  const [autoCheckReplies, setAutoCheckReplies] = useState(false);
  const autoCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [followupChecking, setFollowupChecking] = useState(false);
  const [followupCheckMsg, setFollowupCheckMsg] = useState('');
  const [followupCheckError, setFollowupCheckError] = useState(false);
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
<<<<<<< Updated upstream
      setReplyCheckMsg(t('leads.checkReplyDispatched'));
      setTimeout(() => setReplyCheckMsg(''), 4000);
    } catch (err: any) {
      setReplyCheckMsg(t('leads.triggerFailed') + (err?.message || ''));
=======
      setReplyCheckError(false);
      setReplyCheckMsg(t('leads.dispatchedReplyCheck'));
      setTimeout(() => setReplyCheckMsg(''), 4000);
    } catch (err: any) {
      setReplyCheckError(true);
      setReplyCheckMsg(t('leads.dispatchFailed') + (err?.message || t('leads.unknownError')));
>>>>>>> Stashed changes
      setTimeout(() => setReplyCheckMsg(''), 5000);
    } finally { setReplyChecking(false); }
  };

  const handleCheckFollowups = async () => {
    setFollowupChecking(true); setFollowupCheckMsg('');
    try {
      await client.post('/jobs/check-followups/run');
<<<<<<< Updated upstream
      setFollowupCheckMsg(t('leads.checkFollowupDispatched'));
      setTimeout(() => setFollowupCheckMsg(''), 4000);
    } catch (err: any) {
      setFollowupCheckMsg(t('leads.triggerFailed') + (err?.message || ''));
=======
      setFollowupCheckError(false);
      setFollowupCheckMsg(t('leads.dispatchedFollowupCheck'));
      setTimeout(() => setFollowupCheckMsg(''), 4000);
    } catch (err: any) {
      setFollowupCheckError(true);
      setFollowupCheckMsg(t('leads.dispatchFailed') + (err?.message || t('leads.unknownError')));
>>>>>>> Stashed changes
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
    );
    if (!ok) return;
    setClearMsg('');
    clearAllLeads.mutate(undefined, {
      onSuccess: (data) => {
<<<<<<< Updated upstream
        setClearMsg(t('leads.clearedLeads', { count: data?.deleted ?? 0 }));
        setTimeout(() => setClearMsg(''), 4000);
      },
      onError: (err: any) => {
        setClearMsg(t('leads.clearFailed') + (err?.message || ''));
=======
        setClearError(false);
        setClearMsg(`已清空 ${data?.deleted ?? 0} 筆 leads`);
        setTimeout(() => setClearMsg(''), 4000);
      },
      onError: (err: any) => {
        setClearError(true);
        setClearMsg(t('leads.clearFailed') + (err?.message || t('leads.unknownError')));
>>>>>>> Stashed changes
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
  const [clearError, setClearError] = useState(false);
  const [oldWebsiteOnly, setOldWebsiteOnly] = useState(false);
  const [sortByTech, setSortByTech] = useState(false);

  const apiLeads: Lead[] = data?.data ?? [];
  // ponytail: was `[...MOCK_LEADS, ...apiLeads]` — removed mock per request;
  // the "一鍵清空" button now produces a visibly empty list.
  const allLeads: Lead[] = apiLeads;

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

  const handleCloseDetail = useCallback(() => {
    setDetailClosing(true);
    detailTimerRef.current = setTimeout(() => { setSelectedLead(null); setDetailClosing(false); }, 200);
  }, []);

  return (
    <Page>
        <PageCard>
        <div><PageTitle>{t('leads.title')}</PageTitle><PageSub>{t('leads.subtitle')}</PageSub></div>
        <HeaderSection>
          <StatCardsRow>
<<<<<<< Updated upstream
            <StatCard $accent="#0ea5e9" $bg1="#ecfeff" $bg2="#cffafe">
=======
            <StatCard $accent="#64748b">
>>>>>>> Stashed changes
              <StatCardLabel>{t('leads.totalLeads')}</StatCardLabel>
              <StatCardValue>
                <StatCardNumber $color="#0ea5e9">{stats.total}</StatCardNumber>
                <StatCardUnit>{t('leads.unit')}</StatCardUnit>
              </StatCardValue>
              <StatCardWatermark $color="#0ea5e9"><WmUsers /></StatCardWatermark>
            </StatCard>
            <StatCard $accent="#d97706" $bg1="#fffbeb" $bg2="#fef3c7">
              <StatCardLabel>{t('leads.tabPreparing')}</StatCardLabel>
              <StatCardValue>
                <StatCardNumber $color="#d97706">{tabCounts['preparing'] || 0}</StatCardNumber>
                <StatCardUnit>{t('leads.unit')}</StatCardUnit>
              </StatCardValue>
              <StatCardWatermark $color="#d97706"><WmEdit /></StatCardWatermark>
            </StatCard>
            <StatCard $accent="#16a34a" $bg1="#f0fdf4" $bg2="#dcfce7">
              <StatCardLabel>{t('leads.tabAwaiting')}</StatCardLabel>
              <StatCardValue>
                <StatCardNumber $color="#16a34a">{tabCounts['awaiting'] || 0}</StatCardNumber>
                <StatCardUnit>{t('leads.unit')}</StatCardUnit>
              </StatCardValue>
              <StatCardWatermark $color="#16a34a"><WmClock /></StatCardWatermark>
            </StatCard>
            <StatCard $accent="#8b5cf6" $bg1="#faf5ff" $bg2="#ede9fe">
              <StatCardLabel>{t('leads.tabReplied')}</StatCardLabel>
              <StatCardValue>
                <StatCardNumber $color="#8b5cf6">{tabCounts['replied'] || 0}</StatCardNumber>
                <StatCardUnit>{t('leads.unit')}</StatCardUnit>
              </StatCardValue>
              <StatCardWatermark $color="#8b5cf6"><WmCheck /></StatCardWatermark>
            </StatCard>
          </StatCardsRow>
          <HeaderTop style={{ justifyContent: 'space-between' }}>
            <HeaderBtns style={{ gap: '8px' }}>
              <CircleActionBtn $color="#0ea5e9" aria-label={t('leads.checkReplies')} onClick={handleCheckReplies} disabled={replyChecking}>
                <IconCheckCircle />
              </CircleActionBtn>
              <CircleActionBtn $color="#ca8a04" aria-label={t('leads.checkFollowups')} onClick={handleCheckFollowups} disabled={followupChecking}>
                <IconSparkle />
              </CircleActionBtn>
              <CircleActionBtn $color="#64748b" aria-label={t('leads.refresh')} onClick={handleRefresh} disabled={refreshing}>
                <IconRefresh spinning={refreshing} />
              </CircleActionBtn>
              <CircleActionBtn $color="#dc2626" aria-label={t('leads.clearAll')} onClick={handleClearAll} disabled={clearAllLeads.isPending}>
                <IconTrash />
              </CircleActionBtn>
              <AutoCheckBtn $active={autoCheckReplies} onClick={() => setAutoCheckReplies(p => !p)}>
                <IconCheckCircle />
                {autoCheckReplies ? t('leads.autoCheckActive') : t('leads.autoCheckReplies')}
              </AutoCheckBtn>
            </HeaderBtns>
            <AddBtnGreen onClick={() => setShowAdd(true)}>
              <IconPlus />
              {t('leads.addLead')}
            </AddBtnGreen>
          </HeaderTop>
          {(replyCheckMsg || followupCheckMsg || clearMsg) && (
            <HeaderFeedback>
<<<<<<< Updated upstream
              {replyCheckMsg && <FeedbackMsg key={replyCheckMsg} $error={replyCheckMsg.startsWith(t('leads.triggerFailed'))}>{replyCheckMsg}</FeedbackMsg>}
              {followupCheckMsg && <FeedbackMsg key={followupCheckMsg} $error={followupCheckMsg.startsWith(t('leads.triggerFailed'))}>{followupCheckMsg}</FeedbackMsg>}
              {clearMsg && <FeedbackMsg key={clearMsg} $error={clearMsg.startsWith(t('leads.clearFailed'))}>{clearMsg}</FeedbackMsg>}
=======
              {replyCheckMsg && <FeedbackMsg key={replyCheckMsg} $error={replyCheckError}>{replyCheckMsg}</FeedbackMsg>}
              {followupCheckMsg && <FeedbackMsg key={followupCheckMsg} $error={followupCheckError}>{followupCheckMsg}</FeedbackMsg>}
              {clearMsg && <FeedbackMsg key={clearMsg} $error={clearError}>{clearMsg}</FeedbackMsg>}
>>>>>>> Stashed changes
            </HeaderFeedback>
          )}
        </HeaderSection>
        {/* Tabs */}
        <TabsRow>
          {TABS.map(tab => (
            <TabItem
              key={tab.key}
              $active={activeTab === tab.key}
              $color={tab.color}
              onClick={() => handleTabClick(tab.key)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={tab.color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: activeTab === tab.key ? 0.7 : 0.35 }}>
                <path d={TAB_ICONS[tab.icon] || ''} />
              </svg>
              <TabNumber $color={tab.color}>{tabCounts[tab.key] || 0}</TabNumber>
              <TabLabel $active={activeTab === tab.key}>{tab.label}</TabLabel>
            </TabItem>
          ))}
        </TabsRow>

        <SubPillRow>
          {curTab.subs.length > 1 && curTab.subs.map(sub => (
            <SubPill
              key={sub.key}
              $active={activeSub === sub.key}
              $color={SUB_COLORS[sub.key] || '#0ea5e9'}
              onClick={() => handleSubClick(sub.key)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d={SUB_ICONS[sub.icon] || SUB_ICONS[''] || ''} />
              </svg>
              {sub.label}
              <span style={{ opacity: 0.5 }}>{subCounts[sub.key] ?? 0}</span>
            </SubPill>
          ))}
          <SearchWrap>
            <SearchIcon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></SearchIcon>
            <SearchInput
              placeholder={t('leads.searchPlaceholder')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </SearchWrap>
          <button
            onClick={() => { setOldWebsiteOnly(v => !v); setPage(1); }}
            style={{
              padding: '4px 12px',
              borderRadius: 14,
              border: oldWebsiteOnly ? '1.5px solid #dc2626' : '1px solid #d1d5db',
              background: oldWebsiteOnly ? '#fef2f2' : '#fff',
              color: oldWebsiteOnly ? '#dc2626' : '#6b7280',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
<<<<<<< Updated upstream
            {oldWebsiteOnly ? t('leads.filterOldWebsiteOff') : t('leads.filterOldWebsiteOn')}
=======
            {oldWebsiteOnly ? `✕ ${t('leads.hideOldWebsite')}` : `🔍 ${t('leads.showOldWebsite')}`}
>>>>>>> Stashed changes
          </button>
          <button
            onClick={() => { setSortByTech(v => !v); setPage(1); }}
            style={{
              padding: '4px 12px',
              borderRadius: 14,
              border: sortByTech ? '1.5px solid #f59e0b' : '1px solid #d1d5db',
              background: sortByTech ? '#fffbeb' : '#fff',
              color: sortByTech ? '#d97706' : '#6b7280',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
<<<<<<< Updated upstream
            {sortByTech ? t('leads.filterSortTechOff') : t('leads.filterSortTechOn')}
=======
            {sortByTech ? `✕ ${t('leads.sortByTechOn')}` : `↓ ${t('leads.sortByTechOff')}`}
>>>>>>> Stashed changes
          </button>
        </SubPillRow>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>{t('leads.status')}</th>
                  <th>{t('leads.name')} <IconSortArrow /></th>
                  <th>{t('leads.reply')}</th>
                  {isAdmin && <th>{t('leads.sourceUser')}</th>}
                  <th style={{ textAlign: 'center' }}>{t('leads.techScore')}</th>
                  <th>{t('leads.importedAt')}</th>
                  <th>{t('leads.action')}</th>
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr>
                    <EmptyCell colSpan={isAdmin ? 7 : 6}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                        <strong style={{ color: '#dc2626' }}>{t('common.error')}</strong>
                        <span style={{ color: '#7f8c8d', fontSize: 13 }}>
                          {(error as any)?.message || String(error)}
                        </span>
                        <button
                          onClick={() => refetch()}
                          style={{
                            marginTop: 4,
                            padding: '6px 14px',
                            border: '1px solid #0ea5e9',
                            background: '#0ea5e9',
                            color: '#fff',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
<<<<<<< Updated upstream
                          {t('leads.retry')}
=======
                          {t('common.retry')}
>>>>>>> Stashed changes
                        </button>
                      </div>
                    </EmptyCell>
                  </tr>
                ) : isLoading ? (
                  <tr><EmptyCell colSpan={isAdmin ? 7 : 6}>{t('leads.loading')}</EmptyCell></tr>
                ) : leads.length === 0 ? (
                  <tr><EmptyCell colSpan={isAdmin ? 7 : 6}><div><EmptyLeadsIllustration />{t('leads.noLeads')}</div></EmptyCell></tr>
                ) : (
                  (() => {
                    let lastGroup = '';
                    return leads.map((lead, i) => {
                      const name = lead.company_name || 'Unknown';
                      const color = hashColor(name);
                      const group = getDateGroup(lead._imported_at);
                      const showHeader = group !== lastGroup;
                      if (showHeader) lastGroup = group;
                      const isCollapsed = !!collapsedGroups[group];
                      return (
                        <React.Fragment key={lead._id}>
                          {showHeader && (
                            <GroupBar $group={group} $dark={isDark}>
                              <td colSpan={isAdmin ? 7 : 6}>
                                <GroupBarInner
                                  $group={group}
                                  $dark={isDark}
                                  $collapsed={isCollapsed}
                                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }))}
                                >
<<<<<<< Updated upstream
                                  {group === 'today' ? t('leads.groupToday') : group === 'yesterday' ? t('leads.groupYesterday') : t('leads.groupEarlier')}
=======
                                  {t(`leads.${group}`)}
>>>>>>> Stashed changes
                                </GroupBarInner>
                              </td>
                            </GroupBar>
                          )}
                          <TRow $even={i % 2 === 1} $collapsed={isCollapsed} style={{ cursor: isCollapsed ? 'default' : 'pointer' }} onClick={() => !isCollapsed && setSelectedLead(lead)}>
                        <td>
                          <StatusBadge $status={lead.status ?? 'new'}>{t(`leads.${lead.status ?? 'new'}`)}</StatusBadge>
                        </td>
                        <td>
                          <NameCell>
                            <Avatar $color={color}><AvatarIcon name={name} /></Avatar>
                            <NameText>
                              <strong>{name}</strong>
                              {lead.website && <small>{lead.website}</small>}
                            </NameText>
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
                            const badge = getReplyBadge(lead, t);
                            return <ReplyBadge $bg={badge.bg} $fg={badge.fg}>{badge.text}</ReplyBadge>;
                          })()}
                        </td>
                        {isAdmin && (
                          <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {lead.user_id ? (userMap[lead.user_id] || lead.user_id.slice(0, 8)) : '—'}
                          </td>
                        )}
                        <td style={{ textAlign: 'center' }}>
                          {(lead as any)._tech_score != null ? (() => {
                            const s = (lead as any)._tech_score as number;
                            const bg = s >= 50 ? '#dc2626' : s >= 25 ? '#f59e0b' : '#22c55e';
<<<<<<< Updated upstream
                            const label = s >= 50 ? t('leads.techOld') : s >= 25 ? t('leads.techNormal') : t('leads.techNew');
=======
                            const label = s >= 50 ? t('leads.techOld') : s >= 25 ? t('leads.techFair') : t('leads.techNew');
>>>>>>> Stashed changes
                            return (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#fff',
                                background: bg,
                              }}>
                                {s} {label}
                              </span>
                            );
                          })() : <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>}
                        </td>
                        <td>{(() => {
                          const g = getDateGroup(lead._imported_at);
<<<<<<< Updated upstream
                          if (g === 'today') return t('leads.groupToday');
                          if (g === 'yesterday') return t('leads.groupYesterday');
=======
                          if (g === 'today' || g === 'yesterday') return t(`leads.${g}`);
>>>>>>> Stashed changes
                          return lead._imported_at ? new Date(lead._imported_at).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';
                        })()}</td>
                        <td>
                          {lead.status && lead.status !== 'contacted' && NEXT_STATUS[lead.status] && (
                            <ActionBtn
                              $color="#0ea5e9"
                              title={STATUS_LABEL[lead.status]}
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(lead._id, NEXT_STATUS[lead.status!]); }}
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
        <DpPanel $closing={detailClosing} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DpHeader>
            <span style={{
              position: 'absolute',
              top: 0,
              left: 0,
              background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(14,165,233,0.12)',
              color: isDark ? '#67e8f9' : '#0ea5e9',
              fontSize: '0.625rem',
              fontWeight: 700,
              padding: '3px 16px 3px 8px',
              borderBottomRightRadius: '10px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              backdropFilter: 'blur(4px)',
            }}>{t(`leads.${selectedLead.status ?? 'new'}`)}</span>
            <Avatar $color={hashColor(selectedLead.company_name || 'Unknown')} style={{ width: 42, height: 42, fontSize: '0.875rem', border: isDark ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(14,165,233,0.2)' }}>
              <AvatarIcon name={selectedLead.company_name || 'Unknown'} />
            </Avatar>
            <DpHeaderInfo>
              <DpCompanyName>{selectedLead.company_name || 'Unknown'}</DpCompanyName>
            </DpHeaderInfo>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
              {selectedLead.status && selectedLead.status !== 'contacted' && NEXT_STATUS[selectedLead.status] && (
                <DpActionBtn
                  $variant="primary"
                  onClick={() => {
                    handleStatusChange(selectedLead._id, NEXT_STATUS[selectedLead.status!]);
                    handleCloseDetail();
                  }}
                >
                  {t('leads.advanceStatus')}
                </DpActionBtn>
              )}
              <DpActionBtn
                $variant="danger"
                onClick={() => {
                  handleDelete(selectedLead._id);
                  handleCloseDetail();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4 }}><path d="M2.5 4h9M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M11 4v7.5a1 1 0 01-1 1H4a1 1 0 01-1-1V4M6 6.5v3M8 6.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Delete
              </DpActionBtn>
            </div>
            <DpCloseBtn onClick={handleCloseDetail}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></DpCloseBtn>
          </DpHeader>

          <DpBody>
            {/* Left: About + Journey + Tags + Reply */}
            <DpColLeft>
              <DpCollapsibleHead onClick={() => setAboutOpen(o => !o)}>
                <DpSectionTitle>{t('leads.about')} — {selectedLead.email || '—'}</DpSectionTitle>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{aboutOpen ? '▲' : '▼'}</span>
              </DpCollapsibleHead>
              <DpCollapsibleBody $open={aboutOpen}>
                <DpTabSection>
                <DpTabLabel>{t('leads.about')}</DpTabLabel>
                <DpTabCard>
                <DpGrid>
                  <DpField>
                    <DpFieldLabel>
                      <DpFieldIcon $color="#0ea5e9"><svg viewBox="0 0 16 16" fill="none"><path d="M1 3.5h14v9H1v-9zm0 0l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>
                      {t('leads.email')}
                    </DpFieldLabel>
                    <DpFieldValue style={{ color: selectedLead.email ? '#0ea5e9' : undefined }}>{selectedLead.email || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>
                      <DpFieldIcon $color="#16a34a"><svg viewBox="0 0 16 16" fill="none"><path d="M10 1.5a3.5 3.5 0 013.5 3.5c0 3-5 8.5-5 8.5s-5-5.5-5-8.5A3.5 3.5 0 017 1.79" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 9l1.5-3h1L10 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>
                      {t('leads.phone')}
                    </DpFieldLabel>
                    <DpFieldValue style={{ color: selectedLead.phone ? '#16a34a' : undefined }}>{selectedLead.phone || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>
                      <DpFieldIcon $color="#7c3aed"><svg viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zM1 8h14M8 1c1.7 2 2.7 4 2.7 7s-1 5-2.7 7c-1.7-2-2.7-4-2.7-7s1-5 2.7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>
                      {t('leads.website')}
                    </DpFieldLabel>
                    <DpFieldValue style={{ color: selectedLead.website ? '#7c3aed' : undefined }}>
                      {selectedLead.website ? (
                        <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{selectedLead.website}</a>
                      ) : '—'}
                    </DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>
                      <DpFieldIcon $color="#ea580c"><svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5 1.5 2 4.5 2 8c0 2.5 1 4.5 2.5 6h7C13 12.5 14 10.5 14 8c0-3.5-3-6.5-6-6.5zM5 14.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>
                      {t('leads.address')}
                    </DpFieldLabel>
                    <DpFieldValue>{selectedLead.address || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>
                      <DpFieldIcon $color="#64748b"><svg viewBox="0 0 16 16" fill="none"><path d="M2 13V3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>
                      {t('leads.source')}
                    </DpFieldLabel>
                    <DpFieldValue>{selectedLead.source || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>
                      <DpFieldIcon $color="#d97706"><svg viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>
                      {t('leads.rating')}
                    </DpFieldLabel>
                    <DpFieldValue style={{ color: selectedLead.rating ? '#d97706' : undefined }}>{selectedLead.rating ? `${selectedLead.rating} / 5.0` : '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>
                      <DpFieldIcon $color="#94a3b8"><svg viewBox="0 0 16 16" fill="none"><path d="M2 3h12v10H2V3zm0 3h12M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>
                      {t('leads.importedAt')}
                    </DpFieldLabel>
                    <DpFieldValue>{selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</DpFieldValue>
                  </DpField>
                </DpGrid>
                </DpTabCard>
                </DpTabSection>

                <DpTabSection>
                <DpTabLabel>{t('leads.leadJourney')}</DpTabLabel>
                <DpTabCard>
                <DpTimeline>
                  <DpTimelineItem>
                    <DpTimelineTime>{selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleString(getDateLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}</DpTimelineTime>
                    <DpTimelineDot $active />
                    <DpTimelineText $active>{t('leads.discoveredVia', { source: selectedLead.source || 'unknown' })}</DpTimelineText>
                  </DpTimelineItem>
                  <DpTimelineItem>
                    <DpTimelineTime>{selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleString(getDateLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}</DpTimelineTime>
                    <DpTimelineDot $active />
                    <DpTimelineText $active>{t('leads.addedToPool')}</DpTimelineText>
                  </DpTimelineItem>
                  <DpTimelineItem>
                    <DpTimelineTime>{selectedLead.status !== 'new' && selectedLead.updatedAt ? new Date(selectedLead.updatedAt).toLocaleString(getDateLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}</DpTimelineTime>
                    <DpTimelineDot $active={selectedLead.status === 'pending' || selectedLead.status === 'contacted'} />
                    <DpTimelineText $active={selectedLead.status === 'pending' || selectedLead.status === 'contacted'}>{selectedLead.status === 'new' ? t('leads.awaitingReview') : t('leads.markedAsPending')}</DpTimelineText>
                  </DpTimelineItem>
                  {(selectedLead.status === 'contacted') && (
                    <DpTimelineItem>
                      <DpTimelineTime>{selectedLead.updatedAt ? new Date(selectedLead.updatedAt).toLocaleString(getDateLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}</DpTimelineTime>
                      <DpTimelineDot $active />
                      <DpTimelineText $active>{t('leads.contactedStep')}</DpTimelineText>
                    </DpTimelineItem>
                  )}
                  {selectedLead._replied && (
                    <DpTimelineItem>
                      <DpTimelineTime>{selectedLead._reply_at ? new Date(selectedLead._reply_at).toLocaleString(getDateLocale(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}</DpTimelineTime>
                      <DpTimelineDot $active />
                      <DpTimelineText $active>{t('leads.receivedReply', { text: getReplyBadge(selectedLead, t)?.text || t('leads.replied') })}</DpTimelineText>
                    </DpTimelineItem>
                  )}
                </DpTimeline>
                </DpTabCard>
                </DpTabSection>

                {selectedLead.industry_tags && selectedLead.industry_tags.length > 0 && (
                  <DpTabSection>
                    <DpTabLabel>{t('leads.tags')}</DpTabLabel>
                    <DpTabCard>
                    <DpTagList>
                      {selectedLead.industry_tags.map(tag => (
                        <DpTag key={tag}>{tag}</DpTag>
                      ))}
                    </DpTagList>
                    </DpTabCard>
                  </DpTabSection>
                )}

                {selectedLead._replied && (() => {
                  const cat = getReplyBadge(selectedLead, t) || { text: t('leads.replied'), bg: '#cffafe', fg: '#0ea5e9' };
                  return (
                    <DpTabSection>
                      <DpTabLabel>{t('leads.replyInfo')}</DpTabLabel>
                      <DpTabCard>
                      <DpGrid>
                        <DpField>
                          <DpFieldLabel>{t('leads.replyCategory')}</DpFieldLabel>
                          <DpFieldValue><ReplyBadge $bg={cat.bg} $fg={cat.fg}>{cat.text}</ReplyBadge></DpFieldValue>
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
                          <DpFieldValue>{selectedLead._reply_at ? new Date(selectedLead._reply_at).toLocaleString(getDateLocale()) : '—'}</DpFieldValue>
                        </DpField>
                      </DpGrid>
                      </DpTabCard>
                    </DpTabSection>
                  );
                })()}
              </DpCollapsibleBody>
            </DpColLeft>

            {/* Right: email feed (full width) */}
            <DpColCenter>
              {selectedLead.company_name && (
                <LeadEmails companyName={selectedLead.company_name} leadId={selectedLead._id} />
              )}
            </DpColCenter>
          </DpBody>
          <DpFooter>
            {(['enrich', 'analyze', 'draft', 'send'] as const).map(stage => (
              <DpActionBtn
                key={stage}
                $variant="primary"
                onClick={() => {
                  reprocessLead.mutate({ id: selectedLead._id, stage });
                }}
                style={{ textTransform: 'capitalize' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginRight: 4 }}><path d="M13.5 8a5.5 5.5 0 0 1-9.72 3.5M2.5 8a5.5 5.5 0 0 1 9.72-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.5 3v3.5H10M2.5 13v-3.5H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t('leads.rerunStage', { stage })}
              </DpActionBtn>
            ))}
          </DpFooter>
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
