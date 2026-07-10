import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useEmailQueue, useApproveEmail, useRejectEmail, useSendEmail, useBulkApproveEmails, useBulkRejectEmails, useBulkSendEmails } from '../../api/hooks';
import { EmailItem } from '../../api/emailQueue';
import { Lead } from '../../api/leads';
import client from '../../api/client';
import { media } from '../../styles/media';
import { useDialog } from '../../components';
import EmailTemplateEditor from './EmailTemplateEditor';

/* ══════════════════════════════════════
   Email Queue — LUNO-style 3-panel UI
   ══════════════════════════════════════ */

/* ── Icons (inline SVG helper, 16×16 viewBox) ── */

const I = ({ d, size = 16, fill }: { d: string; size?: number; fill?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill={fill || 'none'}
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const icons = {
  inbox: 'M2 10l3-3h6l3 3M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M2 10h3.5a1 1 0 011 1v0a1 1 0 001 1h1a1 1 0 001-1v0a1 1 0 011-1H14',
  clock: 'M8 3v5l3 2M14 8a6 6 0 11-12 0 6 6 0 0112 0z',
  check: 'M3 8.5l3.5 3.5L13 5',
  x: 'M4 4l8 8M12 4l-8 8',
  send: 'M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z',
  shield: 'M8 1.5L2.5 4v4c0 3.5 2.3 5.8 5.5 6.5 3.2-.7 5.5-3 5.5-6.5V4L8 1.5z',
  exclamation: 'M8 1a7 7 0 100 14A7 7 0 008 1zM8 5v3M8 10.5v.5',
  envelope: 'M2 4h12v8H2zM2 4l6 5 6-5',
  eye: 'M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5zM8 10a2 2 0 100-4 2 2 0 000 4z',
  search: 'M11 11l3 3M10 6.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z',
  angleLeft: 'M10 3L5 8l5 5',
  angleRight: 'M6 3l5 5-5 5',
  arrowLeft: 'M12 8H3M7 4L3 8l4 4',
  play: 'M5 3l8 5-8 5V3z',
};

/* ── Avatar helper ── */

const avatarPalette = ['#bfdbfe', '#c4b5fd', '#a5f3fc', '#bbf7d0'];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
};

const getInitial = (email: EmailItem): string => {
  const name = getDisplayName(email);
  return name.charAt(0).toUpperCase();
};

const getDisplayName = (email: EmailItem): string => {
  const addr = email.to_email || 'Unknown';
  const local = addr.split('@')[0] || addr;
  return local.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

/* ── Status helpers ── */

type StatusValue = 'pending' | 'approved' | 'rejected' | 'sent' | 'failed';

interface StatusFolderDef {
  id: string;
  label: string;
  icon: string;
  filterValue: string;
  badgeColor: string;
}

const statusFolders: StatusFolderDef[] = [
  { id: 'all', label: 'All', icon: 'inbox', filterValue: '', badgeColor: '#94a3b8' },
  { id: 'pending', label: 'Pending', icon: 'clock', filterValue: 'pending', badgeColor: '#d97706' },
  { id: 'approved', label: 'Approved', icon: 'check', filterValue: 'approved', badgeColor: '#16a34a' },
  { id: 'rejected', label: 'Rejected', icon: 'x', filterValue: 'rejected', badgeColor: '#dc2626' },
  { id: 'sent', label: 'Sent', icon: 'send', filterValue: 'sent', badgeColor: '#0ea5e9' },
  { id: 'failed', label: 'Failed', icon: 'exclamation', filterValue: 'failed', badgeColor: '#475569' },
];

const statusColorMap: Record<string, string> = {
  pending: '#d97706',
  approved: '#16a34a',
  rejected: '#dc2626',
  sent: '#0ea5e9',
  failed: '#475569',
};

const REPLY_CATEGORY_LABEL: Record<string, { text: string; bg: string; fg: string }> = {
  interested:     { text: '有興趣',   bg: '#dcfce7', fg: '#16a34a' },
  not_interested: { text: '冇興趣',   bg: '#fee2e2', fg: '#dc2626' },
  meeting:        { text: '約時間',   bg: '#cffafe', fg: '#0ea5e9' },
  auto_reply:     { text: '自動回覆', bg: '#f3f4f6', fg: '#6b7280' },
  question:       { text: '有問題',   bg: '#fef3c7', fg: '#d97706' },
};

/* ══════════════════════════════════════
   Styled Components
   ══════════════════════════════════════ */

/* ── Layout ── */

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const PageTabs = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: -${({ theme }) => theme.spacing.md}px;
`;

const PageTab = styled.button<{ $active: boolean }>`
  padding: 10px 20px;
  border: none;
  background: ${({ $active }) => $active
    ? 'transparent'
    : 'transparent'};
  font-size: 0.875rem;
  font-weight: ${({ $active }) => $active ? 700 : 500};
  cursor: pointer;
  color: ${({ $active, theme }) => $active ? theme.colors.blue : theme.colors.textSecondary};
  border-bottom: 2px solid ${({ $active, theme }) => $active ? theme.colors.blue : 'transparent'};
  margin-bottom: -1px;
  transition: all 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  display: flex;
  min-height: 620px;
  overflow: visible;
  position: relative;

  /* airmail stripe bottom edge */
  &::after {
    content: '';
    position: absolute;
    left: 0; right: 0; bottom: -4px;
    height: 4px;
    border-radius: 0 0 ${({ theme }) => theme.radii.card}px ${({ theme }) => theme.radii.card}px;
    background: repeating-linear-gradient(
      -45deg,
      #dc2626 0, #dc2626 4px,
      transparent 4px, transparent 8px,
      #0ea5e9 8px, #0ea5e9 12px,
      transparent 12px, transparent 16px
    );
    opacity: 0.35;
  }

  /* envelope flap triangle */
  &::before {
    content: '';
    position: absolute;
    top: -12px; left: 50%; transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 28px solid transparent;
    border-right: 28px solid transparent;
    border-bottom: 12px solid ${({ theme }) => theme.colors.border};
    opacity: 0.5;
  }

  ${media.mobile} {
    flex-direction: column;
    min-height: auto;
  }
`;

/* ── Sidebar ── */

const Sidebar = styled.div`
  width: 220px;
  min-width: 220px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  ${media.mobile} {
    width: 100%;
    min-width: 100%;
    border-right: none;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    max-height: 240px;
    overflow-y: auto;
  }
  ${media.tablet} {
    width: 180px;
    min-width: 180px;
  }
`;

const SidebarSearch = styled.div`
  padding: 0 ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.md}px;
`;

const SearchInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.sm}px 32px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem;
  outline: none;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: border-color 0.15s, box-shadow 0.15s;
  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }
  &:hover:not(:focus) { border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus {
    border-color: ${({ theme }) => theme.colors.blue};
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12), 0 1px 2px rgba(15,23,42,0.04);
  }
`;

const SearchWrap = styled.div`
  position: relative;
  svg {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.textTertiary};
    pointer-events: none;
  }
`;

const FolderList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const FolderItem = styled.li<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: 8px ${({ theme }) => theme.spacing.md}px;
  margin: 0 ${({ theme }) => theme.spacing.xs}px;
  border-radius: 8px;
  font-size: 0.8125rem;
  color: ${({ $active, theme }) => ($active ? theme.colors.textPrimary : theme.colors.textSecondary)};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  background: ${({ $active, theme }) => ($active
    ? (theme.mode === 'dark' ? 'rgba(37,99,235,0.15)' : '#eff6ff')
    : 'transparent')};
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  &:hover {
    background: ${({ $active, theme }) => ($active
      ? (theme.mode === 'dark' ? 'rgba(37,99,235,0.2)' : '#cffafe')
      : theme.colors.surfaceMuted)};
  }
  svg {
    flex-shrink: 0;
    color: ${({ $active, theme }) => ($active ? theme.colors.blue : theme.colors.textTertiary)};
  }
`;

const FolderBadge = styled.span<{ $color: string }>`
  margin-left: auto;
  background: ${({ $color }) => $color}22;
  color: ${({ $color }) => $color};
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  border: 1px solid ${({ $color }) => $color}33;
`;

/* ── Main Panel ── */

const MainPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

/* ── Toolbar ── */

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  gap: ${({ theme }) => theme.spacing.sm}px;
  flex-wrap: wrap;
  min-height: 48px;
`;

const ToolbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const ToolbarTitle = styled.h2`
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const IconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(15,23,42,0.04)'};
  transition: background 0.15s, color 0.15s, transform 0.1s, border-color 0.15s;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textPrimary};
    border-color: ${({ theme }) => theme.colors.borderStrong};
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ── Email List ── */

const EmailListWrap = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const EmailRow = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: 8px ${({ theme }) => theme.spacing.md}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $selected, theme }) => $selected ? (theme.colors as any).accent || theme.colors.blue : 'transparent'};
  cursor: pointer;
  position: relative;
  background: ${({ $selected, theme }) => $selected
    ? (theme.mode === 'dark' ? 'rgba(37,99,235,0.12)' : '#f0f7ff')
    : 'transparent'};
  transition: background 0.12s, border-left-color 0.12s;
  &:hover {
    background: ${({ $selected, theme }) => $selected
      ? (theme.mode === 'dark' ? 'rgba(37,99,235,0.18)' : '#e0eef9')
      : theme.colors.surfaceMuted};
    box-shadow: ${({ theme }) => theme.mode === 'dark' ? '0 1px 4px rgba(0,0,0,0.2)' : '0 1px 4px rgba(15,23,42,0.06)'};
  }
  &:hover .hover-actions {
    display: flex;
  }
  ${media.mobile} {
    padding: 8px ${({ theme }) => theme.spacing.sm}px;
    gap: 6px;
  }
`;

const AvatarCircle = styled.div<{ $bg: string }>`
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  user-select: none;
  box-shadow: none;
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)'};
`;

const SenderCol = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 180px;
  min-width: 140px;
  flex-shrink: 0;
  ${media.mobile} { width: 120px; min-width: 100px; }
`;

const EmailContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const SenderName = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.blue};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SubjectLine = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Preview = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${media.mobile} {
    display: none;
  }
`;

const StatusBadge = styled.span<{ $status?: string }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
  flex-shrink: 0;
  ${({ $status, theme }) => {
    const color = statusColorMap[$status || ''] || '#d97706';
    return `background: ${theme.colors.surface}; color: ${color}; border: 1px solid ${color}33;`;
  }}
`;

const DateCell = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  white-space: nowrap;
  flex-shrink: 0;
`;

const HoverActions = styled.div`
  display: none;
  position: absolute;
  right: ${({ theme }) => theme.spacing.md}px;
  top: 50%;
  transform: translateY(-50%);
  gap: 2px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? '0 1px 6px rgba(0,0,0,0.4)' : '0 1px 6px rgba(0,0,0,0.12)'};
  border-radius: ${({ theme }) => theme.radii.control}px;
  padding: 2px;
`;

const HoverBtn = styled.button<{ $color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: transparent;
  color: ${({ $color, theme }) => $color || theme.colors.textSecondary};
  cursor: pointer;
  transition: background 0.12s, color 0.12s, transform 0.1s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    box-shadow: 0 1px 4px rgba(15,23,42,0.06);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ── Toolbar Feedback ── */

const ToolbarFeedbackArea = styled.div`
  padding: 0 ${({ theme }) => theme.spacing.md}px;
  min-height: 0;
`;

const FeedbackMsg = styled.span<{ $error?: boolean }>`
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ $error, theme }) => $error ? theme.colors.red : '#16a34a'};
  padding: 4px 0;
  animation: feedbackFade 4s ease-out forwards;
  @keyframes feedbackFade {
    0% { opacity: 0; transform: translateY(-4px); }
    10% { opacity: 1; transform: translateY(0); }
    80% { opacity: 1; }
    100% { opacity: 0; }
  }
`;

/* ── Empty / Loading states ── */

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.xl}px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: 0.875rem;
`;

/* ── Bulk select UI ── */

const BulkCheckbox = styled.input`
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  margin: 0 12px 0 4px;
  cursor: pointer;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.surface};
  position: relative;
  transition: all 0.15s;

  &:checked {
    background: ${({ theme }) => (theme.colors as any).accent || theme.colors.blue};
    border-color: ${({ theme }) => (theme.colors as any).accent || theme.colors.blue};
  }
  &:checked::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 1px;
    width: 5px;
    height: 10px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  &:hover { border-color: ${({ theme }) => (theme.colors as any).accent || theme.colors.blue}; }
  &:focus { outline: none; box-shadow: 0 0 0 3px ${({ theme }) => `${(theme.colors as any).accent || theme.colors.blue}33`}; }
`;

const ToolbarCheckbox = styled(BulkCheckbox)`
  margin: 0 12px 0 0;
`;

const BulkActionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  margin: 0 0 12px;
  background: ${({ theme }) => `${(theme.colors as any).accent || theme.colors.blue}15`};
  border: 1px solid ${({ theme }) => `${(theme.colors as any).accent || theme.colors.blue}44`};
  border-radius: 8px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textPrimary};

  strong { color: ${({ theme }) => (theme.colors as any).accent || theme.colors.blue}; margin: 0 4px; }
`;

const BulkBtn = styled.button<{ $color: string }>`
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  background: ${({ $color }) => $color};
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;

  &:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

/* ── Detail Floating Modal ── */

const DetailOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)'};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: detailFadeIn 0.2s ease-out;
  @keyframes detailFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const DetailModal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card + 2}px;
  width: 90vw;
  max-width: 880px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.mode === 'dark'
    ? '0 20px 60px rgba(0,0,0,0.5)'
    : '0 20px 60px rgba(0,0,0,0.18)'};
  animation: detailSlideUp 0.25s ease-out;
  overflow: hidden;
  @keyframes detailSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  ${media.mobile} {
    width: 95vw;
    height: 92vh;
  }
`;

const DetailModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const DetailModalHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

const DetailModalClose = styled.button`
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

const DetailToolbarBtn = styled.button<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid ${({ $color, theme }) => $color || theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ $color }) => ($color ? $color + '12' : 'transparent')};
  color: ${({ $color, theme }) => $color || theme.colors.textSecondary};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const SendBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: #10b981;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const DetailModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.lg}px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} {
    padding: ${({ theme }) => theme.spacing.md}px;
  }
`;

const SubjectHeading = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0;
`;

const DetailSenderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  ${media.mobile} {
    flex-wrap: wrap;
  }
`;

const DetailSenderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const DetailSenderName = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const DetailSenderEmail = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.blue};
  margin-left: 6px;
`;

const DetailDateRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  flex-shrink: 0;
`;

const DetailMeta = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md}px;
  flex-wrap: wrap;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  align-items: center;
`;

const EmailBodyText = styled.div`
  font-size: 0.875rem;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: ${({ theme }) => theme.spacing.md}px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: ${({ theme }) => theme.radii.control}px;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
`;

const DetailActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding-top: ${({ theme }) => theme.spacing.sm}px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const ActionButton = styled.button<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: 1px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ $color }) => $color};
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.88;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const OutlineBtn = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: 1px solid ${({ $color, theme }) => $color || theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: transparent;
  color: ${({ $color, theme }) => $color || theme.colors.textSecondary};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

/* ── Modal (fallback preview) ── */

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
  width: 600px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
  ${media.mobile} {
    width: 95%;
  }
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

const ModalMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  gap: ${({ theme }) => theme.spacing.md}px;
  flex-wrap: wrap;
  align-items: center;
`;

const ModalContent = styled.div`
  padding: ${({ theme }) => theme.spacing.md}px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: pre-wrap;
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

/* ── Reply Section ── */

const ReplySection = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  overflow: hidden;
`;

const ReplySectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px ${({ theme }) => theme.spacing.md}px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ReplyCategoryBadge = styled.span<{ $bg: string; $fg: string }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
`;

const ReplyBody = styled.div`
  padding: ${({ theme }) => theme.spacing.md}px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ReplyFieldRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md}px;
  flex-wrap: wrap;
`;

const ReplyField = styled.div`
  flex: 1;
  min-width: 140px;
`;

const ReplyFieldLabel = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-bottom: 2px;
`;

const ReplyFieldValue = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

/* ── Footer ── */

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px 0 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const FooterLinks = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md}px;
  a {
    color: ${({ theme }) => theme.colors.textTertiary};
    text-decoration: none;
    &:hover {
      color: ${({ theme }) => theme.colors.textPrimary};
    }
  }
`;

/* ══════════════════════════════════════
   Component
   ══════════════════════════════════════ */

const LIMIT = 10;

const EmailQueue: React.FC = () => {
  const { t } = useTranslation();
  const { showConfirm, showPrompt } = useDialog();
  const [urlParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const s = urlParams.get('status');
    return s && ['pending', 'approved', 'rejected', 'sent', 'failed'].includes(s) ? s : '';
  });
  const [activeEmail, setActiveEmail] = useState<EmailItem | null>(null);
  const [modalPreview, setModalPreview] = useState<EmailItem | null>(null);
  const [pageTab, setPageTab] = useState<'queue' | 'templates'>('queue');
  const [leadReply, setLeadReply] = useState<Lead | null>(null);
  const [replyChecking, setReplyChecking] = useState(false);
  const [replyCheckMsg, setReplyCheckMsg] = useState('');
  const [followupChecking, setFollowupChecking] = useState(false);
  const [followupCheckMsg, setFollowupCheckMsg] = useState('');

  const handleCheckReplies = async () => {
    setReplyChecking(true);
    setReplyCheckMsg('');
    try {
      await client.post('/jobs/check-replies/run');
      setReplyCheckMsg('已派發檢查回覆任務');
      setTimeout(() => setReplyCheckMsg(''), 4000);
    } catch (err: any) {
      setReplyCheckMsg('觸發失敗: ' + (err?.message || '未知錯誤'));
      setTimeout(() => setReplyCheckMsg(''), 5000);
    } finally {
      setReplyChecking(false);
    }
  };

  const handleCheckFollowups = async () => {
    setFollowupChecking(true);
    setFollowupCheckMsg('');
    try {
      await client.post('/jobs/check-followups/run');
      setFollowupCheckMsg('已派發檢查跟進任務');
      setTimeout(() => setFollowupCheckMsg(''), 4000);
    } catch (err: any) {
      setFollowupCheckMsg('觸發失敗: ' + (err?.message || '未知錯誤'));
      setTimeout(() => setFollowupCheckMsg(''), 5000);
    } finally {
      setFollowupChecking(false);
    }
  };

  const translatedStatusFolders: StatusFolderDef[] = [
    { id: 'all', label: t('emailQueue.all'), icon: 'inbox', filterValue: '', badgeColor: '#94a3b8' },
    { id: 'pending', label: t('emailQueue.pending'), icon: 'clock', filterValue: 'pending', badgeColor: '#d97706' },
    { id: 'approved', label: t('emailQueue.approved'), icon: 'check', filterValue: 'approved', badgeColor: '#16a34a' },
    { id: 'rejected', label: t('emailQueue.rejected'), icon: 'x', filterValue: 'rejected', badgeColor: '#dc2626' },
    { id: 'sent', label: t('emailQueue.sent'), icon: 'send', filterValue: 'sent', badgeColor: '#0ea5e9' },
    { id: 'failed', label: t('emailQueue.failed'), icon: 'exclamation', filterValue: 'failed', badgeColor: '#475569' },
  ];

  // 攞可攞到嘅全部 email（backend DTO 限 limit ≤ 100）。
  // status/search filtering 全部 client side 做，咁 sidebar badge count
  // 就唔會因為切換 tab 而變。
  const { data, isLoading, error, refetch } = useEmailQueue({ page: 1, limit: 100 });

  const approve = useApproveEmail();
  const reject = useRejectEmail();
  const send = useSendEmail();
  const bulkApprove = useBulkApproveEmails();
  const bulkReject = useBulkRejectEmails();
  const bulkSend = useBulkSendEmails();

  // Bulk selection state — checkbox per row
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));
  const deselectAll = () => setSelectedIds(new Set());

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    bulkApprove.mutate([...selectedIds], { onSuccess: () => clearSelection() });
  };
  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    const reason = await showPrompt(`拒絕 ${selectedIds.size} 個 email 嘅原因?（可空）`);
    if (reason === null) return;
    bulkReject.mutate(
      { ids: [...selectedIds], reason: reason || undefined },
      { onSuccess: () => clearSelection() },
    );
  };
  const handleBulkSend = async () => {
    if (selectedIds.size === 0) return;
    if (!(await showConfirm(`寄出 ${selectedIds.size} 個 email?`))) return;
    bulkSend.mutate([...selectedIds], { onSuccess: () => clearSelection() });
  };

  // Fetch lead reply data when viewing detail of a sent email
  useEffect(() => {
    if (!activeEmail?.lead_id) {
      setLeadReply(null);
      return;
    }
    client.get(`/leads/${activeEmail.lead_id}`)
      .then((res) => {
        const lead = (res.data as any)?.data ?? res.data;
        if (lead?._replied) setLeadReply(lead);
        else setLeadReply(null);
      })
      .catch(() => setLeadReply(null));
  }, [activeEmail?.lead_id]);

  const apiEmails: EmailItem[] = data?.data ?? [];
  // 唔再 fall back 去 MOCK_EMAILS —— backend 失敗應該 user-facing 出 error，
  // 唔可以悄悄 display demo 假資料。
  const allEmails: EmailItem[] = apiEmails;

  // Client-side filtering（status + search）
  const searchFiltered = search.trim()
    ? allEmails.filter(e => {
        const q = search.trim().toLowerCase();
        return (e.to_email || '').toLowerCase().includes(q) ||
               (e.subject || '').toLowerCase().includes(q);
      })
    : allEmails;
  const statusFiltered = statusFilter
    ? searchFiltered.filter(e => e.status === statusFilter)
    : searchFiltered;

  // 分頁（client side）
  const total = statusFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const emails = statusFiltered.slice((page - 1) * LIMIT, page * LIMIT);
  // 全選/全不選狀態: 考慮所有 filter 後的 email（唔只當前頁）
  const visibleIds = statusFiltered.map(e => e._id);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someSelected = !allSelected && visibleIds.some(id => selectedIds.has(id));

  // Per-status counts for sidebar badges（用全量數據計，唔受 filter 影響）
  const statusCounts: Record<string, number> = {};
  for (const e of allEmails) {
    const s = e.status || 'pending';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const handleReject = async (id: string) => {
    const reason = await showPrompt(t('emailQueue.rejectPrompt'));
    if (reason === null) return;
    reject.mutate({ id, reason: reason || undefined });
  };

  const openDetail = (item: EmailItem) => {
    setActiveEmail(item);
  };

  const closeDetail = () => {
    setActiveEmail(null);
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateFull = (dateStr?: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  /* ── Sidebar ── */

  const renderSidebar = () => (
    <Sidebar>
      <SidebarSearch>
        <SearchWrap>
          <I d={icons.search} size={14} />
          <SearchInput
            placeholder={t('emailQueue.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </SearchWrap>
      </SidebarSearch>

      <FolderList>
        {translatedStatusFolders.map((f) => (
          <FolderItem
            key={f.id}
            $active={statusFilter === f.filterValue}
            onClick={() => {
              setStatusFilter(f.filterValue);
              setPage(1);
              closeDetail();
            }}
          >
            <I d={(icons as Record<string, string>)[f.icon] || icons.inbox} />
            {f.label}
            {f.id === 'all' ? (
              <FolderBadge $color={f.badgeColor}>{allEmails.length}</FolderBadge>
            ) : (
              <FolderBadge $color={f.badgeColor}>
                {statusCounts[f.filterValue] || 0}
              </FolderBadge>
            )}
          </FolderItem>
        ))}
      </FolderList>
    </Sidebar>
  );

  /* ── List View ── */

  const renderList = () => (
    <MainPanel>
      <Toolbar>
        <ToolbarLeft>
          <ToolbarCheckbox
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => {
              if (e.target.checked) selectAll(visibleIds);
              else deselectAll();
            }}
            aria-label="全選/全不選"
          />
          <ToolbarTitle>{t('emailQueue.outbox')}</ToolbarTitle>
          <DetailToolbarBtn
            $color="#8b5cf6"
            onClick={handleCheckReplies}
            disabled={replyChecking}
            style={{ marginLeft: 8 }}
          >
            <I d={icons.envelope} />
            {replyChecking ? '檢查中…' : '檢查回覆'}
          </DetailToolbarBtn>
          <DetailToolbarBtn
            $color="#d97706"
            onClick={handleCheckFollowups}
            disabled={followupChecking}
            style={{ marginLeft: 4 }}
          >
            <I d={icons.clock} />
            {followupChecking ? '檢查中…' : '檢查跟進'}
          </DetailToolbarBtn>
        </ToolbarLeft>
        <ToolbarRight>
          {total > 0 && (
            <span>
              {t('emailQueue.showingRange', { start: (page - 1) * LIMIT + 1, end: Math.min(page * LIMIT, total), total })}
            </span>
          )}
          <IconBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <I d={icons.angleLeft} />
          </IconBtn>
          <IconBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <I d={icons.angleRight} />
          </IconBtn>
        </ToolbarRight>
      </Toolbar>
      {(replyCheckMsg || followupCheckMsg) && (
        <ToolbarFeedbackArea>
          {replyCheckMsg && (
            <FeedbackMsg key={replyCheckMsg} $error={replyCheckMsg.startsWith('觸發失敗')}>
              {replyCheckMsg}
            </FeedbackMsg>
          )}
          {followupCheckMsg && (
            <FeedbackMsg key={followupCheckMsg} $error={followupCheckMsg.startsWith('觸發失敗')} style={{ marginLeft: replyCheckMsg ? 12 : 0 }}>
              {followupCheckMsg}
            </FeedbackMsg>
          )}
        </ToolbarFeedbackArea>
      )}

      <EmailListWrap>
        {error ? (
          <EmptyState>
            <strong style={{ color: '#dc2626', display: 'block', marginBottom: 8 }}>
              {t('common.error')}
            </strong>
            <span style={{ color: '#7f8c8d', fontSize: 13, display: 'block', marginBottom: 12 }}>
              {(error as any)?.message || String(error)}
            </span>
            <button
              onClick={() => refetch()}
              style={{
                padding: '6px 14px',
                border: '1px solid #0ea5e9',
                background: '#0ea5e9',
                color: '#fff',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {t('common.retry') || '重試'}
            </button>
          </EmptyState>
        ) : isLoading ? (
          <EmptyState>
            <I d={icons.clock} size={24} />
            {t('emailQueue.loadingEmails')}
          </EmptyState>
        ) : emails.length === 0 ? (
          <EmptyState>
            <I d={icons.envelope} size={24} />
            {t('emailQueue.noEmails')}
          </EmptyState>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <BulkActionBar>
                <span>
                  已選 <strong>{selectedIds.size}</strong> 個
                </span>
                <BulkBtn $color="#0ea5e9" onClick={handleBulkApprove} disabled={bulkApprove.isPending}>
                  Approve ({selectedIds.size})
                </BulkBtn>
                <BulkBtn $color="#ef4444" onClick={handleBulkReject} disabled={bulkReject.isPending}>
                  Reject ({selectedIds.size})
                </BulkBtn>
                <BulkBtn
                  $color="#0ea5e9"
                  onClick={handleBulkSend}
                  disabled={bulkSend.isPending || statusFilter !== 'approved'}
                  title={statusFilter !== 'approved' ? 'Send 只可喺 Approved panel 做' : ''}
                >
                  Send ({selectedIds.size})
                </BulkBtn>
                <BulkBtn $color="#888" onClick={clearSelection}>
                  清除
                </BulkBtn>
              </BulkActionBar>
            )}
            {emails.map((item) => {
              const displayName = getDisplayName(item);
              const avatarColor = getAvatarColor(displayName);
              const initial = getInitial(item);
              const status = item.status || 'pending';

              return (
                <EmailRow key={item._id} $selected={selectedIds.has(item._id)} onClick={() => openDetail(item)}>
                <BulkCheckbox
                  type="checkbox"
                  checked={selectedIds.has(item._id)}
                  onClick={(e) => { e.stopPropagation(); }}
                  onChange={() => toggleSelected(item._id)}
                  aria-label={`select ${displayName}`}
                />
                <SenderCol>
                  <AvatarCircle $bg={avatarColor}>{initial}</AvatarCircle>
                  <SenderName>{displayName}</SenderName>
                </SenderCol>
                <EmailContent>
                  <SubjectLine>{item.subject || t('emailQueue.noSubject')}</SubjectLine>
                  <Preview>{(item.body || '').replace(/<[^>]*>/g, ' ').trim()}</Preview>
                </EmailContent>
                <StatusBadge $status={status}>{status}</StatusBadge>
                <DateCell>{formatDate(item.created_at)}</DateCell>

                {/* Hover action buttons */}
                <HoverActions className="hover-actions">
                  {status === 'pending' && (
                    <>
                      <HoverBtn
                        $color="#0ea5e9"
                        title={t('emailQueue.approve')}
                        onClick={(e) => {
                          e.stopPropagation();
                          approve.mutate(item._id);
                        }}
                        disabled={approve.isPending}
                      >
                        <I d={icons.check} />
                      </HoverBtn>
                      <HoverBtn
                        $color="#dc2626"
                        title={t('emailQueue.reject')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(item._id);
                        }}
                        disabled={reject.isPending}
                      >
                        <I d={icons.x} />
                      </HoverBtn>
                    </>
                  )}
                  {status === 'approved' && (
                    <HoverBtn
                      $color="#0ea5e9"
                      title={t('emailQueue.send')}
                      onClick={(e) => {
                        e.stopPropagation();
                        send.mutate(item._id);
                      }}
                      disabled={send.isPending}
                    >
                      <I d={icons.play} />
                    </HoverBtn>
                  )}
                  <HoverBtn
                    $color="#d97706"
                    title={t('emailQueue.preview')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalPreview(item);
                    }}
                  >
                    <I d={icons.eye} />
                  </HoverBtn>
                </HoverActions>
              </EmailRow>
            );
          })}
          </>
        )}
      </EmailListWrap>
    </MainPanel>
  );

  /* ── Detail Floating Modal ── */

  const renderDetail = () => {
    if (!activeEmail) return null;
    const item = activeEmail;
    const displayName = getDisplayName(item);
    const avatarColor = getAvatarColor(displayName);
    const initial = getInitial(item);
    const status = item.status || 'pending';

    return (
      <DetailOverlay onClick={closeDetail}>
        <DetailModal onClick={(e) => e.stopPropagation()}>
          <DetailModalHeader>
            <DetailModalHeaderLeft>
              <AvatarCircle $bg={avatarColor}>{initial}</AvatarCircle>
              <SubjectHeading style={{ fontSize: '1.05rem' }}>
                {item.subject || t('emailQueue.noSubject')}
              </SubjectHeading>
            </DetailModalHeaderLeft>
            <DetailModalHeaderLeft style={{ flex: 'none', gap: 6 }}>
              {status === 'pending' && (
                <>
                  <DetailToolbarBtn
                    $color="#0ea5e9"
                    onClick={() => {
                      approve.mutate(item._id);
                      closeDetail();
                    }}
                    disabled={approve.isPending}
                  >
                    <I d={icons.check} />
                    {t('emailQueue.approve')}
                  </DetailToolbarBtn>
                  <DetailToolbarBtn
                    $color="#ef4444"
                    onClick={() => {
                      handleReject(item._id);
                      closeDetail();
                    }}
                    disabled={reject.isPending}
                    style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    Reject
                  </DetailToolbarBtn>
                </>
              )}
              {status === 'approved' && (
                <SendBtn
                  onClick={() => {
                    send.mutate(item._id);
                    closeDetail();
                  }}
                  disabled={send.isPending}
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {t('emailQueue.send')}
                </SendBtn>
              )}
              <DetailModalClose onClick={closeDetail}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </DetailModalClose>
            </DetailModalHeaderLeft>
          </DetailModalHeader>

          <DetailModalBody>
            <DetailSenderRow>
              <DetailSenderInfo>
                <DetailSenderName>{displayName}</DetailSenderName>
                {item.to_email && <DetailSenderEmail>&lt;{item.to_email}&gt;</DetailSenderEmail>}
              </DetailSenderInfo>
              <DetailDateRight>
                <StatusBadge $status={status}>{status}</StatusBadge>
                <span>{formatDateFull(item.created_at)}</span>
              </DetailDateRight>
            </DetailSenderRow>

            <DetailMeta>
              <span>寄件人: {import.meta.env.VITE_SMTP_FROM || '—'}</span>
              <span>收件人: {item.to_email || import.meta.env.VITE_TEST_RECIPIENT || '—'}</span>
              {item.error?.rejected_reason && <span>{t('emailQueue.reason')} {item.error?.rejected_reason}</span>}
              {item.lead_id && <span>{t('emailQueue.lead')} {item.lead_id}</span>}
            </DetailMeta>

            <EmailBodyText dangerouslySetInnerHTML={{ __html: item.body || t('emailQueue.emptyBody') }} />

            {/* Lead Reply Section */}
            {leadReply && (() => {
              const cat = REPLY_CATEGORY_LABEL[leadReply._reply_category || ''] || { text: leadReply._reply_category || '已回覆', bg: '#e0e7ff', fg: '#4338ca' };
              return (
                <ReplySection>
                  <ReplySectionHeader>
                    📩 對方回覆
                    <ReplyCategoryBadge $bg={cat.bg} $fg={cat.fg}>{cat.text}</ReplyCategoryBadge>
                    {leadReply._reply_at && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8', marginLeft: 'auto' }}>
                        {new Date(leadReply._reply_at).toLocaleString('zh-HK')}
                      </span>
                    )}
                  </ReplySectionHeader>
                  <ReplyBody>
                    <ReplyFieldRow>
                      <ReplyField>
                        <ReplyFieldLabel>摘要</ReplyFieldLabel>
                        <ReplyFieldValue>{leadReply._reply_summary || '—'}</ReplyFieldValue>
                      </ReplyField>
                    </ReplyFieldRow>
                    <ReplyFieldRow>
                      <ReplyField>
                        <ReplyFieldLabel>情緒</ReplyFieldLabel>
                        <ReplyFieldValue>{leadReply._reply_sentiment || '—'}</ReplyFieldValue>
                      </ReplyField>
                      <ReplyField>
                        <ReplyFieldLabel>回覆方式</ReplyFieldLabel>
                        <ReplyFieldValue>{leadReply._reply_via || '—'}</ReplyFieldValue>
                      </ReplyField>
                    </ReplyFieldRow>
                    <ReplyFieldRow>
                      <ReplyField>
                        <ReplyFieldLabel>建議下一步</ReplyFieldLabel>
                        <ReplyFieldValue>{leadReply._reply_next_step || '—'}</ReplyFieldValue>
                      </ReplyField>
                    </ReplyFieldRow>
                  </ReplyBody>
                </ReplySection>
              );
            })()}
          </DetailModalBody>
        </DetailModal>
      </DetailOverlay>
    );
  };

  /* ── Modal Preview (fallback) ── */

  const renderModal = () => {
    if (!modalPreview) return null;
    const item = modalPreview;
    const status = item.status || 'pending';

    return (
      <Overlay onClick={() => setModalPreview(null)}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <h2>{item.subject || t('emailQueue.noSubject')}</h2>
            <CloseBtn onClick={() => setModalPreview(null)}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CloseBtn>
          </ModalHeader>
          <ModalBody>
            <ModalMeta>
              <span>寄件人: {import.meta.env.VITE_SMTP_FROM || '—'}</span>
              <span>收件人: {item.to_email || import.meta.env.VITE_TEST_RECIPIENT || '—'}</span>
              <span>
                {t('emailQueue.status')} <StatusBadge $status={status}>{status}</StatusBadge>
              </span>
              {item.error?.rejected_reason && <span>{t('emailQueue.reason')} {item.error?.rejected_reason}</span>}
              {item.lead_id && <span>{t('emailQueue.lead')} {item.lead_id}</span>}
            </ModalMeta>
            <ModalContent dangerouslySetInnerHTML={{ __html: item.body || t('emailQueue.emptyBody') }} />
          </ModalBody>
          <ModalFooter>
            {status === 'pending' && (
              <>
                <ActionButton
                  $color="#0ea5e9"
                  onClick={() => {
                    approve.mutate(item._id);
                    setModalPreview(null);
                  }}
                  disabled={approve.isPending}
                >
                  {t('emailQueue.approve')}
                </ActionButton>
                <ActionButton
                  $color="#ef4444"
                  onClick={() => {
                    handleReject(item._id);
                    setModalPreview(null);
                  }}
                  disabled={reject.isPending}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Reject
                </ActionButton>
              </>
            )}
            {status === 'approved' && (
              <SendBtn
                onClick={() => {
                  send.mutate(item._id);
                  setModalPreview(null);
                }}
                disabled={send.isPending}
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t('emailQueue.send')}
              </SendBtn>
            )}
            <OutlineBtn onClick={() => setModalPreview(null)}>{t('common.close')}</OutlineBtn>
          </ModalFooter>
        </Modal>
      </Overlay>
    );
  };

  return (
    <Page>
      <PageTabs>
        <PageTab $active={pageTab === 'queue'} onClick={() => setPageTab('queue')}>
          寄件匣
        </PageTab>
        <PageTab $active={pageTab === 'templates'} onClick={() => setPageTab('templates')}>
          郵件樣板
        </PageTab>
      </PageTabs>

      {pageTab === 'queue' ? (
        <>
          <Card>
            {renderSidebar()}
            {renderList()}
          </Card>
          {renderDetail()}
          {renderModal()}
        </>
      ) : (
        <EmailTemplateEditor />
      )}

      <Footer>
        <span>{t('footer.copyrightHermes', { year: 2024 })}</span>
        <FooterLinks>
          <a href="#">{t('footer.documentation')}</a>
          <a href="#">{t('footer.support')}</a>
          <a href="#">{t('footer.faqs')}</a>
        </FooterLinks>
      </Footer>
    </Page>
  );
};

export default EmailQueue;
