import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useLeads, useDeleteLead, useChangeLeadStatus, useCreateLead, useEmailQueue, useApproveEmail, useRejectEmail, useSendEmail, useClearAllLeads } from '../../api/hooks';
import { Lead } from '../../api/leads';
import { EmailItem } from '../../api/emailQueue';
import client from '../../api/client';
import { media } from '../../styles/media';

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
    <rect width="40" height="40" rx="10" fill="#3b82f6"/>
    <path d="M13 17a7 7 0 0 1 14 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="20" cy="15" r="3.5" stroke="#fff" strokeWidth="1.8"/>
    <path d="M11 28c0-3.87 4.03-7 9-7s9 3.13 9 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

/* ── Avatar color from name hash ── */

const hashColor = (name: string): string => {
  const colors = ['#bfdbfe', '#c4b5fd', '#a5f3fc', '#bbf7d0'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/* ── Layout ── */

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
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
  margin: 0;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: 0.8125rem;
`;

/* ── Header Card (title + buttons + stats in one box) ── */

const HeaderSection = styled.div`
  padding: ${({ theme }) => theme.spacing.lg}px ${({ theme }) => theme.spacing.md}px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
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
  color: ${({ $error, theme }) => $error ? theme.colors.red : '#16a34a'};
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
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(37,99,235,0.2);
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 3px 10px rgba(37,99,235,0.25);
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
  background: linear-gradient(135deg, #16a34a, #22c55e);
  box-shadow: 0 1px 3px rgba(22,163,74,0.2);
  &:hover {
    box-shadow: 0 3px 10px rgba(22,163,74,0.25);
  }
`;

// ponytail: red danger button for "一鍵清空" — visually distinct from the
// green AddBtn so the user can't misclick.
const ClearBtn = styled(AddBtn)`
  background: linear-gradient(135deg, #dc2626, #ef4444);
  box-shadow: 0 1px 3px rgba(220,38,38,0.2);
  &:hover:not(:disabled) {
    box-shadow: 0 3px 10px rgba(220,38,38,0.25);
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
  border-top: 2px solid ${({ $active, $color }) => $active ? ($color || '#2563eb') : 'transparent'};
  margin-top: -1px;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  svg { flex-shrink: 0; opacity: ${({ $active }) => $active ? 1 : 0.5}; }
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
  padding: 10px 24px;
  flex-wrap: wrap;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  position: relative;
  ${media.tabletDown} { padding: 8px 12px; gap: 4px; }
`;

const SUB_COLORS: Record<string, string> = {
  '': '#334155',
  new: '#f59e0b',
  draft: '#f59e0b',
  no_followup: '#ef4444',
  has_followup: '#10b981',
  interested: '#10b981',
  meeting: '#10b981',
  question: '#334155',
  not_interested: '#ef4444',
};

const SubPill = styled.button<{ $active?: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  border-radius: 999px;
  border: ${({ $active }) => $active ? '1px solid rgba(191, 219, 254, 0.4)' : '1px solid transparent'};
  font-size: 0.8125rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  background: ${({ $active }) => $active ? 'rgba(219, 234, 254, 0.55)' : 'transparent'};
  backdrop-filter: ${({ $active }) => $active ? 'blur(8px)' : 'none'};
  -webkit-backdrop-filter: ${({ $active }) => $active ? 'blur(8px)' : 'none'};
  box-shadow: ${({ $active }) => $active ? '0 1px 4px rgba(37, 99, 235, 0.06)' : 'none'};
  color: ${({ $active, $color }) => ($active ? ($color || '#2563eb') : 'inherit')};
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
    box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
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
  padding: ${({ theme }) => theme.spacing.md}px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
  min-width: 960px;
  th, td {
    padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
    text-align: left;
    white-space: nowrap;
  }
  th {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textTertiary};
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

const TRow = styled.tr<{ $even?: boolean }>`
  background: ${({ $even, theme }) => $even ? theme.colors.surfaceMuted : theme.colors.surface};
  transition: background 0.15s;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#eff6ff'};
  }
  td {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.div<{ $color: string }>`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
  text-transform: uppercase;
  box-shadow: none;
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
  padding: 3px 12px;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: capitalize;
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

const EmptyCell = styled.td`
  text-align: center;
  padding: 48px ${({ theme }) => theme.spacing.md}px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: 0.875rem;
`;

/* ── Date Group Header ── */

const GroupRow = styled.tr`
  td {
    padding: 10px 16px 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: ${({ theme }) => theme.colors.textTertiary};
    background: ${({ theme }) => theme.colors.surfaceMuted};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const getDateGroup = (dateStr?: string): string => {
  if (!dateStr) return '更早前';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 864e5);
  const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (itemDate.getTime() >= today.getTime()) return '今日';
  if (itemDate.getTime() >= yesterday.getTime()) return '昨日';
  return '更早前';
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

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  width: 520px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
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
  color: ${({ theme }) => theme.colors.blue};
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)'};
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
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12), 0 1px 2px rgba(15,23,42,0.04);
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

const DpOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)'};
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${dpFadeIn} 0.2s ease-out;
`;

const DpPanel = styled.div`
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
  animation: ${dpSlideUp} 0.25s ease-out;
  ${media.mobile} {
    width: 95vw;
    height: 92vh;
  }
`;

const DpHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceMuted};
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
  font-size: 1.15rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.01em;
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
  color: ${({ theme }) => theme.colors.blue};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)'};
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
  padding: 16px 18px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  ${media.tabletDown} { border-right: none; border-bottom: 1px solid ${({ theme }) => theme.colors.border}; overflow-y: visible; padding: 10px 16px; }
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
  gap: 2px;
`;

const DpField = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 4px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}22;
`;

const DpFieldLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const DpFieldValue = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  word-break: break-word;
  text-align: right;
  max-width: 55%;
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
  position: relative;
  padding-left: 14px;
`;

const DpTimelineItem = styled.div<{ $active?: boolean }>`
  position: relative;
  padding: 8px 0 8px 16px;
  font-size: 0.7rem;
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textTertiary};
  font-weight: ${({ $active }) => $active ? 600 : 400};

  /* Vertical connecting line */
  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 1.5px;
    background: ${({ $active, theme }) => $active ? theme.colors.blue : theme.colors.border};
    ${({ $active, theme }) => $active ? `
      box-shadow: 0 0 6px ${theme.colors.blue}66, 0 0 12px ${theme.colors.blue}33;
    ` : ''}
  }
  &:last-child::after {
    display: none;
  }

  /* Dot */
  &::before {
    content: '';
    position: absolute;
    left: -3.5px;
    top: 10px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    z-index: 1;
    background: ${({ $active, theme }) => $active ? theme.colors.blue : theme.colors.border};
    ${({ $active, theme }) => $active ? `
      box-shadow: 0 0 8px ${theme.colors.blue}88, 0 0 16px ${theme.colors.blue}44;
    ` : ''}
    transition: box-shadow 0.3s, background 0.3s;
  }
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
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
  background: ${({ $variant, theme }) =>
    $variant === 'danger' ? (theme.mode === 'dark' ? '#374151' : '#f3f4f6') :
    $variant === 'primary' ? theme.colors.blue : theme.colors.surfaceMuted};
  color: ${({ $variant, theme }) =>
    $variant === 'danger' ? (theme.mode === 'dark' ? '#9ca3af' : '#6b7280') :
    $variant === 'primary' ? '#fff' : 'inherit'};
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
  meeting:            { text: t('leads.replyMeeting'),           bg: '#dbeafe', fg: '#2563eb' },
  auto_reply:         { text: t('leads.replyAutoReply'),         bg: '#f3f4f6', fg: '#6b7280' },
  question:           { text: t('leads.replyProcessing'),        bg: '#e0e7ff', fg: '#4338ca' },
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
    website: 'https://bytedance.hk', address: '灣仔告士打道 100 號',
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
    website: 'https://dragonlogistics.cn', address: '深圳市南山區科技園',
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
    website: 'https://quantumfinance.hk', address: '中環國際金融中心 38 樓',
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
const getReplyBadge = (lead: Lead, t: (k: string, opts?: any) => string) => {
  const labels = getReplyCategoryLabel(t);
  if (lead._replied) {
    if (lead._reply_category === 'interested' && lead._pending_meeting) {
      return labels.interested_pending;
    }
    return labels[lead._reply_category || ''] || { text: t('leads.replyProcessing'), bg: '#e0e7ff', fg: '#4338ca' };
  }
  if (lead.status === 'contacted') {
    return lead._has_email_draft
      ? { text: t('leads.draftPending'), bg: '#fef3c7', fg: '#b45309' }
      : { text: t('leads.awaitingReply'), bg: '#e0e7ff', fg: '#6366f1' };
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
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.6875rem;
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
  reply:      { text: t('leads.emailTypeReply'),      bg: '#dcfce7', fg: '#15803d' },
  followup:   { text: t('leads.emailTypeFollowup'),   bg: '#fef3c7', fg: '#b45309' },
  reoutreach: { text: t('leads.emailTypeReoutreach'), bg: '#e0e7ff', fg: '#4338ca' },
} as Record<string, { text: string; bg: string; fg: string }>);

const EMAIL_STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  pending:  { bg: '#fef3c7', fg: '#d97706' },
  approved: { bg: '#dcfce7', fg: '#16a34a' },
  sent:     { bg: '#dbeafe', fg: '#2563eb' },
  rejected: { bg: '#fee2e2', fg: '#dc2626' },
  failed:   { bg: '#f3f4f6', fg: '#475569' },
};

const EmailCard = styled.div<{ $expanded?: boolean }>`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  margin-bottom: 6px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  max-width: 100%;
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
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: ${({ theme }) => theme.spacing.sm}px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.control}px;
  max-width: 100%;
  overflow-x: hidden;
`;
const EmailCardMeta = styled.div`
  margin-top: 6px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;
const EmailSummary = styled.div`
  margin: 0 ${({ theme }) => theme.spacing.md}px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.mode === 'dark' ? '#1e3a5f' : '#eff6ff'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? '#2563eb40' : '#bfdbfe'};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.blue};
  display: flex;
  align-items: flex-start;
  gap: 6px;
`;
const EmailSummaryLabel = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.blue};
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
  background: #10b981;
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

  const handleReject = (id: string) => {
    const reason = window.prompt('拒絕原因（可空）') || undefined;
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
              <ReplyBadge $bg={statusColor.bg} $fg={statusColor.fg}>{d.status || 'pending'}</ReplyBadge>
              <EmailCardDate>
                {d.created_at ? new Date(d.created_at).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' }) : ''}
              </EmailCardDate>
              <div style={{ flex: 1 }} />
              {d.status === 'pending' && (
                <>
                  <LeadSendBtn disabled={busy} onClick={() => handleApproveAndSend(d)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {busy ? t('leads.processing') : t('leads.approveAndSend')}
                  </LeadSendBtn>
                  <EmailActionBtn $bg="#fef2f2" $fg="#ef4444" disabled={busy} onClick={() => handleReject(d._id)}>
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
                <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>✓ {t('leads.sentAt')} {d.sent_at ? new Date(d.sent_at).toLocaleString('zh-HK') : ''}</span>
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

  const isNew = (l: Lead) => l.status === 'new' || l.status === null || l.status === undefined;

  const TABS: TabDef[] = [
    {
      key: 'preparing',
      label: t('leads.tabPreparing'),
      color: '#2563eb',
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
      color: '#d97706',
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

  const [searchParams, setSearchParams] = useSearchParams();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
  });
  const [replyChecking, setReplyChecking] = useState(false);
  const [replyCheckMsg, setReplyCheckMsg] = useState('');
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
      setReplyCheckMsg('已派發檢查回覆任務');
      setTimeout(() => setReplyCheckMsg(''), 4000);
    } catch (err: any) {
      setReplyCheckMsg('觸發失敗: ' + (err?.message || '未知錯誤'));
      setTimeout(() => setReplyCheckMsg(''), 5000);
    } finally { setReplyChecking(false); }
  };

  const handleCheckFollowups = async () => {
    setFollowupChecking(true); setFollowupCheckMsg('');
    try {
      await client.post('/jobs/check-followups/run');
      setFollowupCheckMsg('已派發檢查跟進任務');
      setTimeout(() => setFollowupCheckMsg(''), 4000);
    } catch (err: any) {
      setFollowupCheckMsg('觸發失敗: ' + (err?.message || '未知錯誤'));
      setTimeout(() => setFollowupCheckMsg(''), 5000);
    } finally { setFollowupChecking(false); }
  };

  // ponytail: bulk-clear with explicit confirm. We require typing "DELETE"
  // (or at least a window.confirm) so a misclick doesn't wipe the DB. The
  // confirm message is in Chinese to match the rest of the UI.
  const handleClearAll = async () => {
    const count = apiLeads.length;
    const ok = window.confirm(
      `確定清空全部 Leads 嗎？\n\n將會永久刪除 ${count} 筆客戶資料，呢個動作唔可以 undo。`,
    );
    if (!ok) return;
    setClearMsg('');
    clearAllLeads.mutate(undefined, {
      onSuccess: (data) => {
        setClearMsg(`已清空 ${data?.deleted ?? 0} 筆 leads`);
        setTimeout(() => setClearMsg(''), 4000);
      },
      onError: (err: any) => {
        setClearMsg('清空失敗: ' + (err?.message || '未知錯誤'));
        setTimeout(() => setClearMsg(''), 5000);
      },
    });
  };

  // 攞可攞到嘅全部 leads（backend DTO 限 limit ≤ 100）。
  // status/search filtering client side 做。
  const { data, isLoading, error, refetch, isFetching } = useLeads({ page: 1, limit: 100 });

  const deleteLead = useDeleteLead();
  const changeStatus = useChangeLeadStatus();
  const createLead = useCreateLead();
  const clearAllLeads = useClearAllLeads();
  const [clearMsg, setClearMsg] = useState('');

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

  // Client-side pagination
  const total = tabFiltered.length;
  const totalPages = Math.ceil(total / LIMIT);
  const leads = tabFiltered.slice((page - 1) * LIMIT, page * LIMIT);

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

  const handleDelete = (id: string) => {
    if (window.confirm(t('leads.confirmDelete'))) {
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
    createLead.mutate(form as any, {
      onSuccess: () => {
        setShowAdd(false);
        setForm({ company_name: '', email: '', phone: '', website: '', address: '' });
      },
    });
  };

  const handleCloseDetail = useCallback(() => setSelectedLead(null), []);

  return (
    <Page>
        <Card>
        <HeaderSection>
          <HeaderTop>
            <ProfileIcon><IconUsers /></ProfileIcon>
            <ProfileInfo>
              <ProfileTitle>
                {t('leads.totalInSystem', { count: '__N__' }).split('__N__').map((part, i, arr) =>
                  i < arr.length - 1 ? (
                    <React.Fragment key={i}>{part}<span className="count-number">{stats.total}</span></React.Fragment>
                  ) : part
                )}
              </ProfileTitle>
            </ProfileInfo>
            <HeaderBtns>
              <AddBtn onClick={handleCheckReplies} disabled={replyChecking}>
                {replyChecking ? t('leads.checking') : t('leads.checkReplies')}
              </AddBtn>
              <AddBtn onClick={handleCheckFollowups} disabled={followupChecking}>
                {followupChecking ? t('leads.checking') : t('leads.checkFollowups')}
              </AddBtn>
              <AddBtn
                onClick={handleToggleDemo}
                disabled={demoLoading}
                style={demoMode ? { background: '#dc2626', color: '#fff', border: 'none' } : {}}
              >
                {demoMode ? '⏱ Demo ON (10s)' : '⏱ Demo 模式'}
              </AddBtn>
              <AddBtn onClick={() => refetch()} disabled={isFetching} title="重新整理">
                {isFetching ? '⟳ 刷新中…' : '⟳ 刷新'}
              </AddBtn>
              <ClearBtn onClick={handleClearAll} disabled={clearAllLeads.isPending || apiLeads.length === 0} title="永久刪除所有 leads">
                {clearAllLeads.isPending ? '清空中…' : '🗑 一鍵清空'}
              </ClearBtn>
              <AddBtnGreen onClick={() => setShowAdd(true)}>
                <IconPlus />
                {t('leads.addLead')}
              </AddBtnGreen>
            </HeaderBtns>
          </HeaderTop>
          {(replyCheckMsg || followupCheckMsg || clearMsg) && (
            <HeaderFeedback>
              {replyCheckMsg && <FeedbackMsg key={replyCheckMsg} $error={replyCheckMsg.startsWith('觸發失敗')}>{replyCheckMsg}</FeedbackMsg>}
              {followupCheckMsg && <FeedbackMsg key={followupCheckMsg} $error={followupCheckMsg.startsWith('觸發失敗')}>{followupCheckMsg}</FeedbackMsg>}
              {clearMsg && <FeedbackMsg key={clearMsg} $error={clearMsg.startsWith('清空失敗')}>{clearMsg}</FeedbackMsg>}
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
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={tab.color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
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
              $color={SUB_COLORS[sub.key] || '#2563eb'}
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
        </SubPillRow>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>{t('leads.status')}</th>
                  <th>{t('leads.name')} <IconSortArrow /></th>
                  <th>{t('leads.reply')}</th>
                  <th>{t('leads.importedAt')}</th>
                  <th>{t('leads.action')}</th>
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr>
                    <EmptyCell colSpan={6}>
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
                            border: '1px solid #3b82f6',
                            background: '#3b82f6',
                            color: '#fff',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          {t('common.retry') || '重試'}
                        </button>
                      </div>
                    </EmptyCell>
                  </tr>
                ) : isLoading ? (
                  <tr><EmptyCell colSpan={6}>{t('leads.loading')}</EmptyCell></tr>
                ) : leads.length === 0 ? (
                  <tr><EmptyCell colSpan={6}>{t('leads.noLeads')}</EmptyCell></tr>
                ) : (
                  (() => {
                    let lastGroup = '';
                    return leads.map((lead, i) => {
                      const name = lead.company_name || 'Unknown';
                      const color = hashColor(name);
                      const group = getDateGroup(lead._imported_at);
                      const showHeader = group !== lastGroup;
                      if (showHeader) lastGroup = group;
                      return (
                        <React.Fragment key={lead._id}>
                          {showHeader && (
                            <GroupRow><td colSpan={6}>{group}</td></GroupRow>
                          )}
                          <TRow $even={i % 2 === 1} style={{ cursor: 'pointer' }} onClick={() => setSelectedLead(lead)}>
                        <td>
                          <StatusBadge $status={lead.status ?? 'new'}>{lead.status ?? 'new'}</StatusBadge>
                        </td>
                        <td>
                          <NameCell>
                            <Avatar $color={color}>{getInitials(name)}</Avatar>
                            <NameText>
                              <strong>{name}</strong>
                              {lead.website && <small>{lead.website}</small>}
                            </NameText>
                          </NameCell>
                        </td>
                        <td>
                          {(() => {
                            const badge = getReplyBadge(lead, t);
                            return <ReplyBadge $bg={badge.bg} $fg={badge.fg}>{badge.text}</ReplyBadge>;
                          })()}
                        </td>
                        <td>{(() => {
                          const g = getDateGroup(lead._imported_at);
                          if (g === '今日' || g === '昨日') return g;
                          return lead._imported_at ? new Date(lead._imported_at).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';
                        })()}</td>
                        <td>
                          {lead.status && lead.status !== 'contacted' && NEXT_STATUS[lead.status] && (
                            <ActionBtn
                              $color="#3b82f6"
                              title={STATUS_LABEL[lead.status]}
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(lead._id, NEXT_STATUS[lead.status!]); }}
                            >
                              <IconArrowRight />
                            </ActionBtn>
                          )}
                          <ActionBtn $color="#d97706" title="View" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}>
                            <IconEye />
                          </ActionBtn>
                          <ActionBtn
                            $color="#dc2626"
                            title="Delete"
                            onClick={(e) => { e.stopPropagation(); handleDelete(lead._id); }}
                          >
                            <IconTrash />
                          </ActionBtn>
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
        </Card>

      {/* Add Lead Modal */}
      {showAdd && (
        <Overlay onClick={() => setShowAdd(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <h2>{t('leads.addLead')}</h2>
              <CloseBtn onClick={() => setShowAdd(false)}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CloseBtn>
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
              </ModalBody>
              <ModalFooter>
                <SecondaryBtn type="button" onClick={() => setShowAdd(false)}>{t('common.close')}</SecondaryBtn>
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
        <DpOverlay onClick={handleCloseDetail}>
        <DpPanel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <DpHeader>
            <Avatar $color={hashColor(selectedLead.company_name || 'Unknown')} style={{ width: 42, height: 42, fontSize: '0.875rem' }}>
              {getInitials(selectedLead.company_name || 'Unknown')}
            </Avatar>
            <DpHeaderInfo>
              <DpCompanyName>{selectedLead.company_name || 'Unknown'}</DpCompanyName>
              <StatusBadge $status={selectedLead.status ?? 'new'}>{selectedLead.status ?? 'new'}</StatusBadge>
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
                <DpSectionTitle>{t('leads.about')}</DpSectionTitle>
                <DpGrid>
                  <DpField>
                    <DpFieldLabel>{t('leads.email')}</DpFieldLabel>
                    <DpFieldValue>{selectedLead.email || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.phone')}</DpFieldLabel>
                    <DpFieldValue>{selectedLead.phone || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.website')}</DpFieldLabel>
                    <DpFieldValue>{selectedLead.website || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.address')}</DpFieldLabel>
                    <DpFieldValue>{selectedLead.address || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.source')}</DpFieldLabel>
                    <DpFieldValue>{selectedLead.source || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.rating', { defaultValue: '評分' })}</DpFieldLabel>
                    <DpFieldValue>{selectedLead.rating ? `${selectedLead.rating} / 5.0` : '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.importedAt')}</DpFieldLabel>
                    <DpFieldValue>{selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</DpFieldValue>
                  </DpField>
                </DpGrid>

                <div style={{ height: 12 }} />
                <DpSectionTitle>{t('leads.leadJourney')}</DpSectionTitle>
                <DpTimeline>
                  <DpTimelineItem $active>
                    {t('leads.discoveredVia', { source: selectedLead.source || 'unknown' })}
                  </DpTimelineItem>
                  <DpTimelineItem $active>
                    {t('leads.addedToPool')}
                  </DpTimelineItem>
                  <DpTimelineItem $active={selectedLead.status === 'pending' || selectedLead.status === 'contacted'}>
                    {selectedLead.status === 'new' ? t('leads.awaitingReview') : t('leads.markedAsPending')}
                  </DpTimelineItem>
                  {(selectedLead.status === 'contacted') && (
                    <DpTimelineItem $active>
                      {t('leads.contactedStep')}
                    </DpTimelineItem>
                  )}
                  {selectedLead._replied && (
                    <DpTimelineItem $active>
                      {t('leads.receivedReply', { text: getReplyBadge(selectedLead, t)?.text || t('leads.replied') })}
                    </DpTimelineItem>
                  )}
                </DpTimeline>

                {selectedLead.industry_tags && selectedLead.industry_tags.length > 0 && (
                  <>
                    <div style={{ height: 8 }} />
                    <DpSectionTitle>{t('leads.tags')}</DpSectionTitle>
                    <DpTagList>
                      {selectedLead.industry_tags.map(tag => (
                        <DpTag key={tag}>{tag}</DpTag>
                      ))}
                    </DpTagList>
                  </>
                )}

                {selectedLead._replied && (() => {
                  const cat = getReplyBadge(selectedLead, t) || { text: '已回覆', bg: '#e0e7ff', fg: '#4338ca' };
                  return (
                    <>
                      <div style={{ height: 8 }} />
                      <DpSectionTitle>回覆資訊</DpSectionTitle>
                      <DpGrid>
                        <DpField>
                          <DpFieldLabel>分類</DpFieldLabel>
                          <DpFieldValue><ReplyBadge $bg={cat.bg} $fg={cat.fg}>{cat.text}</ReplyBadge></DpFieldValue>
                        </DpField>
                        <DpField>
                          <DpFieldLabel>情緒</DpFieldLabel>
                          <DpFieldValue>{selectedLead._reply_sentiment || '—'}</DpFieldValue>
                        </DpField>
                        <DpField>
                          <DpFieldLabel>摘要</DpFieldLabel>
                          <DpFieldValue>{selectedLead._reply_summary || '—'}</DpFieldValue>
                        </DpField>
                        <DpField>
                          <DpFieldLabel>下一步</DpFieldLabel>
                          <DpFieldValue>{selectedLead._reply_next_step || '—'}</DpFieldValue>
                        </DpField>
                        <DpField>
                          <DpFieldLabel>方式</DpFieldLabel>
                          <DpFieldValue>{selectedLead._reply_via || '—'}</DpFieldValue>
                        </DpField>
                        <DpField>
                          <DpFieldLabel>時間</DpFieldLabel>
                          <DpFieldValue>{selectedLead._reply_at ? new Date(selectedLead._reply_at).toLocaleString('zh-HK') : '—'}</DpFieldValue>
                        </DpField>
                      </DpGrid>
                    </>
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
        </DpPanel>
        </DpOverlay>,
        document.body
      )}

      {/* Footer */}
      <Footer>
        <span>{t('footer.copyrightHermes', { year: 2024 })}</span>
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
