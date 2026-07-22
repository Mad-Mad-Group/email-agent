import React, { useState, useMemo, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useLeads, useDeleteLead, useChangeLeadStatus, useCreateLead, useClearAllLeads, useReprocessLead, useMe } from '../../api/hooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/services';
import { Lead, leadsApi } from '../../api/leads';
import client from '../../api/client';
import { media } from '../../styles/media';
import { glassSurface } from '../../styles/glassSurface';
import { useDialog } from '../../components';
import SpriteAvatar from '../../components/SpriteAvatar';
import { AGENTS, FARMER, SOURCE_AGENT } from '../../config/agents';
import LeadDetailPanel, { hashColorIndex, Avatar, ReplyBadge, DpSectionTitle, DpActionBtn, DpField, DpFieldLabel, DpFieldValue, DpFieldIcon, getReplyBadge, NEXT_STATUS, REPLY_ICONS } from '../../components/LeadDetailPanel';
import LeadEmails from '../../components/LeadEmails';

/* ══════════════════════════════════════
   CMS Leads — Luno Contacts-style UI
   ══════════════════════════════════════ */

/* ── Inline SVG icons (16x16 viewBox) ── */

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

/* ── Layout ── */

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg}px;
  animation: fadeSlideUp 0.5s var(--ease-out) both;
`;

const PageCard = styled.div`
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: ${({ theme }) => theme.radii.card}px;
  padding: 28px;
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.lg}px;
`;

const PageTitle = styled.h1`
  font-size: clamp(1.35rem, 2.5vw, 1.85rem);
  font-weight: 700;
  margin: 0;
  background: ${({ theme }) => theme.gradients.brand};
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  ${({ theme }) => theme.mode === 'dark' && `
    background: linear-gradient(135deg, #E0ACD2, #ACC0DE);
    -webkit-background-clip: text; background-clip: text;
  `}
`;
const PageSub = styled.p`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin: 2px 0 0;`;


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
  transition: border-color 0.2s var(--ease-out), color 0.2s var(--ease-out), background 0.2s var(--ease-out), transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out);
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
  @media (hover: hover) and (pointer: fine) {
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
  ${media.tabletDown} { padding: 2px 12px; gap: 6px; flex-wrap: wrap; }
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

/* ── Table ── */

const TableWrap = styled.div`
  overflow-x: auto;
  padding: 0;
`;

const Table = styled.table`
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.8125rem;
  min-width: 960px;
  th, td {
    padding: 10px 14px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  th {
    font-weight: 600;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.colors.textTertiary};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    user-select: none;
    cursor: default;
  }
  td {
    font-size: 0.8125rem;
    line-height: 1.4;
    border-bottom: none;
  }
  ${media.mobile} {
    min-width: 640px;
    font-size: 0.75rem;
    th, td { padding: 6px 10px; }
    th { font-size: 0.5625rem; }
  }
`;

const TRow = styled.tr<{ $even?: boolean; $collapsed?: boolean }>`
  transition: background 0.15s;
  cursor: pointer;
  animation: fadeInRow 0.35s var(--ease-out) both;
  &:nth-child(even) td { background: ${({ theme }) => theme.colors.surfaceMuted}40; }
  &:hover td {
    background: ${({ theme, $collapsed }) => $collapsed ? 'transparent' : `${theme.colors.accent}08`};
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

/* ── Card Grid View ── */
const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 4px 0;
`;

const LeadCard = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  padding: 20px;
  cursor: pointer;
  display: flex; flex-direction: column; gap: 12px;
  transition: transform 0.2s var(--ease-out), box-shadow 0.3s ease, border-color 0.3s ease;
  animation: fadeInRow 0.35s var(--ease-out) both;
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    border-color: ${({ theme }) => theme.colors.accent}50;
  }
`;

const LeadCardHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
`;

const LeadCardName = styled.div`
  font-size: 0.9375rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const LeadCardUrl = styled.div`
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const LeadCardTags = styled.div`
  display: flex; flex-wrap: wrap; gap: 4px;
`;

const LeadCardTag = styled.span`
  font-size: 0.6875rem; padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceMuted}50;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const LeadCardMeta = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
`;

const ViewToggleBtn = styled.button<{ $active?: boolean }>`
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, theme }) => $active ? `${theme.colors.accent}18` : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.textSecondary};
  transition: background 0.15s, color 0.15s;
  &:hover { background: ${({ theme }) => `${theme.colors.accent}12`}; color: ${({ theme }) => theme.colors.accent}; }
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

/* Status text pill — colored text-only badge next to name */
const STATUS_COLOR_KEY: Record<string, 'blue' | 'gold' | 'mauve' | 'olive'> = {
  new: 'olive', pending: 'gold', contacted: 'mauve', confirmed: 'olive',
  qualified: 'olive', rejected: 'mauve', draft: 'gold',
  interested: 'olive', meeting: 'olive', not_interested: 'mauve',
};

const StatusPillSpan = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  background: ${({ $color }) => `${$color}18`};
  color: ${({ $color }) => $color};
`;

const StatusIcon = ({ $status, title }: { $status?: string; title?: string }) => {
  const theme = useTheme() as any;
  const { t } = useTranslation();
  const colorKey = STATUS_COLOR_KEY[$status ?? 'new'] ?? 'olive';
  const color = (theme.strong as any)[colorKey];
  const label = t(STATUS_I18N_KEY[$status ?? 'new'] || 'leads.statusNew');
  return <StatusPillSpan $color={color} title={title}>{label}</StatusPillSpan>;
};

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

/* ── Selection Bar ── */

const SelectionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: ${({ theme }) => theme.colors.textPrimary};
  color: #fff;
  border-radius: ${({ theme }) => theme.radii.badge}px;
  font-size: 0.8125rem;
  font-weight: 600;
  position: sticky;
  bottom: 12px;
  margin: 12px 16px 0;
  z-index: 10;
`;

const SelectionBtn = styled.button`
  padding: 5px 14px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: ${({ theme }) => theme.radii.badge}px;
  background: transparent;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.15); }
`;

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
  transition: background 0.15s var(--ease-out);
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
  const queryClient = useQueryClient();

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => (localStorage.getItem('leads_view_mode') as 'table' | 'grid') || 'table');
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => {
      const next = prev === 'table' ? 'grid' : 'table';
      localStorage.setItem('leads_view_mode', next);
      return next;
    });
  }, []);
  const [detailClosing, setDetailClosing] = useState(false);
  const detailTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Drag & resize state

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

  const closeAddModal = useCallback(() => {
    setAddClosing(true);
    addTimerRef.current = setTimeout(() => { setShowAdd(false); setAddClosing(false); }, 200);
  }, []);

  useEffect(() => () => { if (addTimerRef.current) clearTimeout(addTimerRef.current); }, []);
  useEffect(() => () => { if (detailTimerRef.current) clearTimeout(detailTimerRef.current); }, []);

  const handleCheckReplies = async () => {
    setReplyChecking(true);
    try {
      await client.post('/jobs/check-replies/run');
      toast.success(t('leads.checkReplyDispatched'));
    } catch (err: any) {
      toast.error(t('leads.triggerFailed') + (err?.message || ''));
    } finally { setReplyChecking(false); }
  };

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
    clearAllLeads.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(t('leads.clearedLeads', { count: data?.deleted ?? 0 }));
      },
      onError: (err: any) => {
        toast.error(t('leads.clearFailed') + (err?.message || ''));
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

  const [simulating, setSimulating] = useState(false);
  const handleSimulateNoReply = async () => {
    // Find real leads (skip mock-*) that have been sent but not yet replied
    const candidates = allLeads.filter(l =>
      !l._id.startsWith('mock-') &&
      l.status === 'contacted' && !(l as any)._no_reply && !((l as any)._followup_count > 0),
    );
    if (candidates.length === 0) {
      toast(t('leads.noLeadsToSimulate'));
      return;
    }
    const names = candidates.slice(0, 10).map(l => (l as any).company_name || l.name || l._id).join('、');
    const msg = t('leads.confirmSimulateNoReply', { count: candidates.length, names });
    const ok = await showConfirm(msg);
    if (!ok) return;

    setSimulating(true);
    let success = 0;
    for (const lead of candidates) {
      try {
        await leadsApi.simulateNoReply(lead._id);
        success++;
      } catch { /* skip failed */ }
    }
    toast.success(t('leads.simulateDone', { count: success }));
    setSimulating(false);
    refetch();
    queryClient.invalidateQueries({ queryKey: ['emailQueue'] });
  };

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

  const [oldWebsiteOnly, setOldWebsiteOnly] = useState(false);
  const [sortByTech, setSortByTech] = useState(false);

  const apiLeads: Lead[] = data?.data ?? [];
  // Always include MOCK_LEADS for demo richness + any real API data
  const allLeads: Lead[] = [...MOCK_LEADS, ...apiLeads];

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

  const handleExportExcel = useCallback(async () => {
    const XLSX = await import('xlsx');
    const rows = techSorted.map(l => ({
      [t('leads.name')]: l.company_name || '',
      [t('leads.website')]: l.website || '',
      Email: l.email || '',
      [t('leads.phone')]: l.phone || '',
      [t('leads.status')]: l.status || 'new',
      [t('leads.sourceUser')]: l.user_id ? (userMap[l.user_id] || l.user_id) : '',
      [t('leads.techScore')]: l._tech_score ?? '',
      [t('leads.aiScore')]: l._email_draft_score ?? '',
      [t('leads.importedAt')]: l._imported_at || l.createdAt || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `leads_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t('leads.exportDone'));
  }, [techSorted, userMap, t]);

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
  const pageTitle = t('leads.title');

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SpriteAvatar src={AGENTS.S1.sprite} frames={AGENTS.S1.frames} frameW={AGENTS.S1.frameW} frameH={AGENTS.S1.frameH} size={48} />
          <div><PageTitle>{pageTitle}</PageTitle><PageSub>{t('leads.subtitle')}</PageSub></div>
        </div>

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
          <SearchWrap>
            <SearchIcon><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></SearchIcon>
            <SearchInput
              placeholder={t('leads.searchPlaceholder')}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </SearchWrap>
          <CircleActionBtn title={t('leads.simulateNoReply')} onClick={handleSimulateNoReply} disabled={simulating} $spinning={simulating}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l14 14M4 4a5 5 0 007 7M3 8a5 5 0 010-5M13 8a5 5 0 010 5"/></svg>
          </CircleActionBtn>
          <CircleActionBtn title={t('leads.filterOldWebsiteOn')} onClick={() => { setOldWebsiteOnly(v => !v); setPage(1); }} style={oldWebsiteOnly ? { background: styledTheme.colors.accent, color: '#fff', borderColor: 'transparent' } : undefined}>
            <IconOldWebsite />
          </CircleActionBtn>
          <CircleActionBtn title={t('leads.checkReplies')} onClick={handleCheckReplies} disabled={replyChecking} $spinning={replyChecking}>
            <IconCheckCircle />
          </CircleActionBtn>
          <CircleActionBtn title={t('leads.refresh')} onClick={handleRefresh} disabled={refreshing} $spinning={refreshing}>
            <IconRefresh spinning={refreshing} />
          </CircleActionBtn>
          <CircleActionBtn title={t('leads.exportExcel')} onClick={handleExportExcel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </CircleActionBtn>
          <CircleActionBtn title={t('leads.clearAll')} onClick={handleClearAll} disabled={clearAllLeads.isPending} $spinning={clearAllLeads.isPending}>
            <IconTrash />
          </CircleActionBtn>
          <CircleActionBtn title={t('leads.addLead')} onClick={() => setShowAdd(true)} style={{ background: styledTheme.colors.textPrimary, color: '#fff', borderColor: 'transparent' }}>
            <IconPlus />
          </CircleActionBtn>
          <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
            <ViewToggleBtn $active={viewMode === 'table'} onClick={() => { setViewMode('table'); localStorage.setItem('leads_view_mode', 'table'); }} title="Table view">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
            </ViewToggleBtn>
            <ViewToggleBtn $active={viewMode === 'grid'} onClick={() => { setViewMode('grid'); localStorage.setItem('leads_view_mode', 'grid'); }} title="Grid view">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>
            </ViewToggleBtn>
          </div>
        </SubPillRow>
          <div style={{ marginTop: 16 }}><ToolbarSep /></div>
          {viewMode === 'grid' ? (
            <CardGrid>
              {leads.map((lead, i) => (
                <LeadCard
                  key={lead._id}
                  style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  onClick={() => setSelectedLead(lead)}
                >
                  <LeadCardHeader>
                    <LeadCardName>{lead.company_name || '—'}</LeadCardName>
                    <StatusIcon $status={lead.status} />
                  </LeadCardHeader>
                  {lead.website && <LeadCardUrl>{lead.website.replace(/^https?:\/\//, '')}</LeadCardUrl>}
                  {lead.industry_tags && lead.industry_tags.length > 0 && (
                    <LeadCardTags>
                      {lead.industry_tags.slice(0, 3).map((tag: string, j: number) => (
                        <LeadCardTag key={j}>{tag}</LeadCardTag>
                      ))}
                      {lead.industry_tags.length > 3 && <LeadCardTag>+{lead.industry_tags.length - 3}</LeadCardTag>}
                    </LeadCardTags>
                  )}
                  <LeadCardMeta>
                    <span>{lead.rating ? `★ ${lead.rating}` : ''}</span>
                    <span>{lead._imported_at ? new Date(lead._imported_at).toLocaleDateString('en-CA') : ''}</span>
                  </LeadCardMeta>
                </LeadCard>
              ))}
            </CardGrid>
          ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '4%' }}>
                    <RowCheckbox
                      checked={leads.length > 0 && leads.every(l => selectedIds.has(l._id))}
                      onChange={e => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) { leads.forEach(l => next.add(l._id)); }
                        else { leads.forEach(l => next.delete(l._id)); }
                        setSelectedIds(next);
                      }}
                    />
                  </th>
                  <th style={{ width: isAdmin ? '24%' : '30%' }}>{t('leads.name')} <IconSortArrow /></th>
                  <th style={{ width: '13%' }}>{t('leads.reply')}</th>
                  {isAdmin && <th style={{ width: '10%' }}>{t('leads.sourceUser')}</th>}
                  <th style={{ textAlign: 'center', cursor: 'pointer', width: '10%' }} onClick={() => { setSortByTech(v => !v); setPage(1); }}>
                    {t('leads.techScore')} <IconSortArrow />
                  </th>
                  <th style={{ textAlign: 'center', width: '10%' }}>{t('leads.aiScore')}</th>
                  <th style={{ width: '14%' }}>{t('leads.importedAt')} <IconSortArrow /></th>
                  <th style={{ width: '8%' }}>{t('leads.action')}</th>
                </tr>
              </thead>
              <tbody>
                {(error && allLeads.length === 0) ? (
                  <tr>
                    <EmptyCell colSpan={isAdmin ? 8 : 7}>
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
                  <tr><EmptyCell colSpan={isAdmin ? 8 : 7}>{t('leads.loading')}</EmptyCell></tr>
                ) : leads.length === 0 ? (
                  <tr><EmptyCell colSpan={isAdmin ? 8 : 7}><div><EmptyLeadsIllustration />{t('leads.noLeads')}</div></EmptyCell></tr>
                ) : (
                  (() => {
                    return leads.map((lead, i) => {
                      const name = lead.company_name || t('common.unknown');
                      const colorIdx = hashColorIndex(name);
                      return (
                        <React.Fragment key={lead._id}>
                          <TRow $even={i % 2 === 1} style={{ cursor: 'pointer', animationDelay: `${Math.min(i * 30, 300)}ms` }} onClick={() => setSelectedLead(lead)}>
                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <RowCheckbox
                            checked={selectedIds.has(lead._id)}
                            onChange={e => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(lead._id); else next.delete(lead._id);
                              setSelectedIds(next);
                            }}
                          />
                        </td>
                        <td>
                          <NameCell>
                            <StatusIcon $status={lead.status ?? 'new'} title={t(STATUS_I18N_KEY[lead.status ?? 'new'] || 'leads.statusNew')} />
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
                          {lead._tech_score != null ? (() => {
                            const s = lead._tech_score as number;
                            const bg = s >= 50 ? styledTheme.strong.mauve : s >= 25 ? styledTheme.strong.gold : styledTheme.strong.olive;
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
                        <td style={{ textAlign: 'center' }}>
                          {lead._email_draft_score != null ? (() => {
                            const s = lead._email_draft_score as number;
                            const bg = s >= 80 ? styledTheme.colors.accent : s >= 60 ? styledTheme.strong.mauve : s >= 40 ? styledTheme.strong.gold : styledTheme.strong.olive;
                            const reason = lead._email_draft_score_reason || '';
                            return (
                              <span
                                title={reason ? t('leads.aiScoreReason') + '：' + reason : ''}
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: styledTheme.colors.textInverted,
                                  background: bg,
                                  cursor: reason ? 'help' : 'default',
                                }}
                              >
                                {s}
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
          )}
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
          {selectedIds.size > 0 && (
            <SelectionBar>
              <span>{t('leads.selectedCount', { count: selectedIds.size })}</span>
              <SelectionBtn onClick={async () => {
                const XLSX = await import('xlsx');
                const selected = techSorted.filter(l => selectedIds.has(l._id));
                const rows = selected.map(l => ({
                  [t('leads.name')]: l.company_name || '',
                  [t('leads.website')]: l.website || '',
                  Email: l.email || '',
                  [t('leads.phone')]: l.phone || '',
                  [t('leads.status')]: l.status || 'new',
                  [t('leads.sourceUser')]: l.user_id ? (userMap[l.user_id] || l.user_id) : '',
                  [t('leads.techScore')]: l._tech_score ?? '',
                  [t('leads.aiScore')]: l._email_draft_score ?? '',
                  [t('leads.importedAt')]: l._imported_at || l.createdAt || '',
                }));
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Leads');
                XLSX.writeFile(wb, `leads_${new Date().toISOString().slice(0, 10)}.xlsx`);
                toast.success(t('leads.exportDone'));
              }}>{t('leads.exportSelected')}</SelectionBtn>
              <SelectionBtn onClick={async () => {
                const ok = await showConfirm(t('leads.confirmDeleteSelected', { count: selectedIds.size }));
                if (!ok) return;
                for (const id of selectedIds) {
                  if (!id.startsWith('mock-')) {
                    try { await deleteLead.mutateAsync(id); } catch { /* skip */ }
                  }
                }
                setSelectedIds(new Set());
                refetch();
              }}>{t('leads.deleteSelected')}</SelectionBtn>
              <SelectionBtn onClick={() => setSelectedIds(new Set())}>{t('leads.clearSelection')}</SelectionBtn>
            </SelectionBar>
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

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          closing={detailClosing}
          onClose={handleCloseDetail}
          onStatusChange={(id, status) => handleStatusChange(id, status)}
          onDelete={(id) => handleDelete(id)}
          onReprocess={(id, stage) => reprocessLead.mutate({ id, stage })}
          rightPanel={
            selectedLead.company_name ? (
              <LeadEmails companyName={selectedLead.company_name} leadId={selectedLead._id} />
            ) : undefined
          }
        />
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
