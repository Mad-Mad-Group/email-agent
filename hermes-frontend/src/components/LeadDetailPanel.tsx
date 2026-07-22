import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Lead } from '../api/leads';
import { media } from '../styles/media';
import { glassSurface } from '../styles/glassSurface';

/* ── Avatar color from name hash ── */

export const AVATAR_COLOR_KEYS = ['blue', 'accent', 'blue', 'green', 'red', 'amber', 'accent', 'blue'] as const;
export const hashColorIndex = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLOR_KEYS.length;
};

/* 20 distinct SVG paths (16x16 viewBox) for company avatars */
export const AVATAR_ICONS: string[] = [
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
export const AvatarIcon: React.FC<{ name: string }> = ({ name }) => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <path d={AVATAR_ICONS[hashIcon(name)]} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Avatar = styled.div<{ $colorIndex: number }>`
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
`;

export const QuarterTag = styled.span`
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

export const NEXT_STATUS: Record<string, string> = {
  new: 'pending',
  '': 'pending',
  pending: 'contacted',
};

export const REPLY_ICONS: Record<string, string> = {
  interested:         'M8 2l1.5 3.5L13 6l-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5z',
  interested_pending: 'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v4l2.5 1.5',
  not_interested:     'M8 1a7 7 0 100 14A7 7 0 008 1zM5.5 5.5l5 5M10.5 5.5l-5 5',
  meeting:            'M2 3h12v10H2V3zm0 3h12M5 1v3M11 1v3',
  auto_reply:         'M1 3h14v10H1V3zm0 0l7 5 7-5',
  question:           'M8 1a7 7 0 100 14A7 7 0 008 1zM6.5 5.5a1.5 1.5 0 013 0c0 1-1.5 1.25-1.5 2.5M8 11h.01',
  unprocessed:        'M8 1a7 7 0 100 14A7 7 0 008 1zM8 5v3M8 10h.01',
  draft_pending:      'M12.146 1.146a.5.5 0 01.708 0l2 2a.5.5 0 010 .708l-9.5 9.5a.5.5 0 01-.168.11l-5 2a.5.5 0 01-.65-.65l2-5a.5.5 0 01.11-.168l9.5-9.5z',
  awaiting:           'M8 1a7 7 0 100 14A7 7 0 008 1zm0 3v4l2.5 1.5',
};

const getReplyCategoryLabel = (t: (k: string, opts?: any) => string, theme: any) => ({
  interested:         { text: t('leads.replyInterested'),        bg: theme.pastel.olive,  fg: theme.colors.textPrimary, icon: 'interested' },
  interested_pending: { text: t('leads.replyInterestedPending'), bg: theme.pastel.gold,   fg: theme.colors.textPrimary, icon: 'interested_pending' },
  not_interested:     { text: t('leads.replyNotInterested'),     bg: theme.pastel.mauve,  fg: theme.colors.textPrimary, icon: 'not_interested' },
  meeting:            { text: t('leads.replyMeeting'),           bg: theme.pastel.blue,   fg: theme.colors.textPrimary, icon: 'meeting' },
  auto_reply:         { text: t('leads.replyAutoReply'),         bg: theme.pastel.gold,   fg: theme.colors.textPrimary, icon: 'auto_reply' },
  question:           { text: t('leads.replyProcessing'),        bg: theme.pastel.blue,   fg: theme.colors.textPrimary, icon: 'question' },
} as Record<string, { text: string; bg: string; fg: string; icon: string }>);

export const getReplyBadge = (lead: Lead, t: (k: string, opts?: any) => string, theme: any) => {
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

export const ReplyBadge = styled.span<{ $bg: string; $fg: string }>`
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

/* ── Detail Panel Animations ── */

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

/* ── Detail Panel Styled Components ── */

const DpOverlay = styled.div<{ $closing?: boolean }>`
  position: fixed;
  inset: 0;
  /* Stack above any embedding popup (AgentPanel's pool popup uses
     z-index 9999/10000). Bump to 11000 so the detail panel always
     shows even when Leads is mounted inside the pool popup. */
  z-index: 11000;
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
  }
  ${media.tabletDown} {
    &::after { display: none; }
  }
  ${media.mobile} {
    width: 95vw;
    height: 92vh;
  }
`;

const DpHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: transparent;
  min-height: 24px;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out);
  font-size: 18px;
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: ${({ theme }) => theme.colors.surfaceMuted};
      color: ${({ theme }) => theme.colors.textPrimary};
    }
  }
`;

const DpBody = styled.div`
  flex: 1;
  height: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 1fr;
  gap: 0;
  overflow: hidden;
  ${media.tabletDown} { grid-template-columns: 1fr; grid-template-rows: auto; height: auto; overflow-y: auto; }
`;

const DpColLeft = styled.div`
  padding: 4px 20px 10px 28px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  background: transparent;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #6C97D199; border-radius: 99px; }
  &::-webkit-scrollbar-thumb:hover { background: #6C97D1CC; }
  ${media.tabletDown} { overflow-y: visible; padding: 10px 16px; }
`;

const DpColCenter = styled.div`
  padding: 4px 20px 10px;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #6C97D199; border-radius: 99px; }
  &::-webkit-scrollbar-thumb:hover { background: #6C97D1CC; }
  ${media.tabletDown} { overflow-y: visible; padding: 12px 16px; }
`;

export const DpSectionTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #6C97D1;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const DpSectionContent = styled.div`
  padding-left: 12px;
`;

const DpDivider = styled.div`
  height: 0;
  margin: 6px 0;
`;

export const DpField = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 3px 0;
`;

export const DpFieldLabel = styled.span`
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

export const DpFieldValue = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  word-break: break-word;
  flex: 1;
  min-width: 0;
  line-height: 1.4;
  a { color: ${({ theme }) => theme.colors.accent}; text-decoration: none; &:hover { text-decoration: underline; } }
`;

export const DpFieldIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  color: ${({ theme }) => theme.colors.textTertiary};
  flex-shrink: 0;
  svg { width: 12px; height: 12px; }
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

/* ── AI Score bar ── */
const ScoreBarWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const ScoreBarTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  overflow: hidden;
`;
const ScoreBarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  transition: width 0.4s ease;
`;
const ScoreValue = styled.span<{ $color: string }>`
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
  min-width: 28px;
  text-align: right;
`;
const ScoreCaption = styled.span`
  display: block;
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-top: 3px;
  line-height: 1.4;
`;
const AiParagraph = styled.p`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.55;
  margin: 4px 0 0;
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

export const DpActionBtn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s var(--ease-out);
  border: 0.5px solid ${({ $variant }) =>
    $variant === 'primary' ? '#6C97D1' :
    $variant === 'danger' ? '#e57373' :
    '#999'};
  background: transparent;
  color: ${({ $variant, theme }) =>
    $variant === 'primary' ? '#6C97D1' :
    $variant === 'danger' ? '#e57373' :
    theme.colors.textPrimary};
  @media (hover: hover) and (pointer: fine) {
    &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
  }
`;

/* ── Props ── */

export interface LeadDetailPanelProps {
  lead: Lead;
  closing: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, nextStatus: string) => void;
  onDelete?: (id: string) => void;
  onReprocess?: (id: string, stage: string) => void;
  rightPanel?: React.ReactNode;
}

/* ── Component ── */

const LeadDetailPanel: React.FC<LeadDetailPanelProps> = ({
  lead,
  closing,
  onClose,
  onStatusChange,
  onDelete,
  onReprocess,
  rightPanel,
}) => {
  const { t, i18n } = useTranslation();
  const styledTheme = useTheme() as any;

  // Drag & resize state
  const dpRef = useRef<HTMLDivElement>(null);
  const [dpPos, setDpPos] = useState({ x: 0, y: 0 });
  const [dpSize, setDpSize] = useState({ w: 0, h: 0 });
  const dpDrag = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const dpResize = useRef<{ startX: number; startY: number; originW: number; originH: number; originX: number; originY: number; dir: string } | null>(null);

  // Reset panel position/size when lead changes or window resizes
  const calcPanelLayout = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let w: number, h: number;
    if (vw <= 639) {
      // mobile: full-screen-ish
      w = vw * 0.95;
      h = vh * 0.92;
    } else if (vw <= 1023) {
      // tablet
      w = vw * 0.92;
      h = vh * 0.9;
    } else {
      // desktop
      w = Math.min(vw * 0.88, 1400);
      h = vh * 0.9;
    }
    setDpSize({ w, h });
    setDpPos({ x: (vw - w) / 2, y: (vh - h) / 2 });
  }, []);

  useEffect(() => {
    calcPanelLayout();
  }, [lead, calcPanelLayout]);

  useEffect(() => {
    const onResize = () => calcPanelLayout();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [calcPanelLayout]);

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

  const name = lead.company_name || t('common.unknown');

  const STATUS_LABEL: Record<string, string> = {
    new: t('leads.statusNew'),
    pending: t('leads.statusPending'),
    contacted: t('leads.statusContacted'),
  };
  const statusLabel = (s?: string | null) => STATUS_LABEL[s || 'new'] || s || 'new';

  const dateLocale = ({ en: 'en-US', 'zh-TW': 'zh-HK', 'zh-CN': 'zh-CN' } as Record<string, string>)[i18n.language] || 'en-US';
  const fmtTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(dateLocale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return createPortal(
    <DpOverlay $closing={closing} onClick={onClose}>
      <DpPanel ref={dpRef} $closing={closing} onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ left: dpPos.x, top: dpPos.y, width: dpSize.w, height: dpSize.h }}>
        {/* Resize handles */}
        <div onMouseDown={e => onDpResizeStart(e, 'n')} style={{ position:'absolute', top:0, left:8, right:8, height:4, cursor:'n-resize', zIndex:10 }} />
        <div onMouseDown={e => onDpResizeStart(e, 's')} style={{ position:'absolute', bottom:0, left:8, right:8, height:4, cursor:'s-resize', zIndex:10 }} />
        <div onMouseDown={e => onDpResizeStart(e, 'w')} style={{ position:'absolute', top:8, bottom:8, left:0, width:4, cursor:'w-resize', zIndex:10 }} />
        <div onMouseDown={e => onDpResizeStart(e, 'e')} style={{ position:'absolute', top:8, bottom:8, right:0, width:4, cursor:'e-resize', zIndex:10 }} />
        <div onMouseDown={e => onDpResizeStart(e, 'nw')} style={{ position:'absolute', top:0, left:0, width:8, height:8, cursor:'nw-resize', zIndex:11 }} />
        <div onMouseDown={e => onDpResizeStart(e, 'ne')} style={{ position:'absolute', top:0, right:0, width:8, height:8, cursor:'ne-resize', zIndex:11 }} />
        <div onMouseDown={e => onDpResizeStart(e, 'sw')} style={{ position:'absolute', bottom:0, left:0, width:8, height:8, cursor:'sw-resize', zIndex:11 }} />
        <div onMouseDown={e => onDpResizeStart(e, 'se')} style={{ position:'absolute', bottom:0, right:0, width:8, height:8, cursor:'se-resize', zIndex:11 }} />
        <DpHeader>
          <Avatar $colorIndex={hashColorIndex(name)} style={{ width: 40, height: 40, fontSize: '0.8rem', borderRadius: 10 }} />
          <DpHeaderInfo>
            <DpCompanyName>
              {name}
                          </DpCompanyName>
            <DpHeaderMeta>
              <DpStatusPill $status={lead.status ?? 'new'}>{statusLabel(lead.status)}</DpStatusPill>
            </DpHeaderMeta>
          </DpHeaderInfo>
          <DpCloseBtn onClick={onClose}><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></DpCloseBtn>
        </DpHeader>

        <DpBody>
          {/* Left: Avatar + Name + About + Journey + Tags */}
          <DpColLeft>
            <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 015 5c0 2.5-2 4-5 4s-5-1.5-5-4a5 5 0 015-5zM3 13c0-1.66 2.24-3 5-3s5 1.34 5 3" stroke="#6C97D1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('leads.about')}</DpSectionTitle>
            <DpSectionContent>
            <DpField>
              <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M1 3.5h14v9H1v-9zm0 0l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.email')}</DpFieldLabel>
              <DpFieldValue>{lead.email || '—'}</DpFieldValue>
            </DpField>
            <DpField>
              <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M10 1.5a3.5 3.5 0 013.5 3.5c0 3-5 8.5-5 8.5s-5-5.5-5-8.5A3.5 3.5 0 017 1.79" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.phone')}</DpFieldLabel>
              <DpFieldValue>{lead.phone || '—'}</DpFieldValue>
            </DpField>
            <DpField>
              <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zM1 8h14M8 1c1.7 2 2.7 4 2.7 7s-1 5-2.7 7c-1.7-2-2.7-4-2.7-7s1-5 2.7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.website')}</DpFieldLabel>
              <DpFieldValue>{lead.website ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer">{lead.website}</a> : '—'}</DpFieldValue>
            </DpField>
            <DpField>
              <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5 1.5 2 4.5 2 8c0 2.5 1 4.5 2.5 6h7C13 12.5 14 10.5 14 8c0-3.5-3-6.5-6-6.5zM5 14.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.address')}</DpFieldLabel>
              <DpFieldValue>{lead.address || '—'}</DpFieldValue>
            </DpField>
            <DpField>
              <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.rating')}</DpFieldLabel>
              <DpFieldValue>{lead.rating ? `${lead.rating} / 5.0` : '—'}</DpFieldValue>
            </DpField>
            <DpField>
              <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M8 5v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.status')}</DpFieldLabel>
              <DpFieldValue><DpStatusPill $status={lead.status ?? 'new'}>{statusLabel(lead.status)}</DpStatusPill></DpFieldValue>
            </DpField>
            <DpField>
              <DpFieldLabel><DpFieldIcon><svg viewBox="0 0 16 16" fill="none"><path d="M2 13h12M4 9l4-6 4 6M6 9v4M10 9v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></DpFieldIcon>{t('leads.source')}</DpFieldLabel>
              <DpFieldValue>{getSourceDisplay(lead.source || '') || '—'}</DpFieldValue>
            </DpField>
            </DpSectionContent>

            <DpDivider />

            <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 14V4l4 2 4-2 4 2v10l-4-2-4 2-4-2z" stroke="#6C97D1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('leads.leadJourney')}</DpSectionTitle>
            <DpSectionContent>
            <DpTimeline>
              <DpTimelineItem>
                <DpTimelineDotWrap><DpTimelineDot $active /><DpTimelineLine /></DpTimelineDotWrap>
                <DpTimelineContent>
                  <DpTimelineText $active>{t('leads.discoveredVia', { source: getSourceDisplay(lead.source || 'unknown') })}</DpTimelineText>
                  <DpTimelineTime>{(() => { const ts = lead.createdAt || (lead as any)._imported_at || (lead as any).created_at; return ts ? fmtTime(ts) : '—'; })()}</DpTimelineTime>
                </DpTimelineContent>
              </DpTimelineItem>
              <DpTimelineItem>
                <DpTimelineDotWrap><DpTimelineDot $active /><DpTimelineLine /></DpTimelineDotWrap>
                <DpTimelineContent>
                  <DpTimelineText $active>{t('leads.addedToPool')}</DpTimelineText>
                  <DpTimelineTime>{(() => { const ts = lead.createdAt || (lead as any)._imported_at || (lead as any).created_at; return ts ? fmtTime(ts) : '—'; })()}</DpTimelineTime>
                </DpTimelineContent>
              </DpTimelineItem>
              <DpTimelineItem>
                <DpTimelineDotWrap>
                  <DpTimelineDot $active={lead.status === 'pending' || lead.status === 'contacted'} />
                  {(lead.status === 'contacted' || lead._replied) && <DpTimelineLine />}
                </DpTimelineDotWrap>
                <DpTimelineContent>
                  <DpTimelineText $active={lead.status === 'pending' || lead.status === 'contacted'}>{lead.status === 'new' ? t('leads.awaitingReview') : t('leads.markedAsPending')}</DpTimelineText>
                  {lead.status !== 'new' && lead.updatedAt && <DpTimelineTime>{fmtTime(lead.updatedAt)}</DpTimelineTime>}
                </DpTimelineContent>
              </DpTimelineItem>
              {lead.status === 'contacted' && (
                <DpTimelineItem>
                  <DpTimelineDotWrap>
                    <DpTimelineDot $active />
                    {lead._replied && <DpTimelineLine />}
                  </DpTimelineDotWrap>
                  <DpTimelineContent>
                    <DpTimelineText $active>{t('leads.contactedStep')}</DpTimelineText>
                    {lead.updatedAt && <DpTimelineTime>{fmtTime(lead.updatedAt)}</DpTimelineTime>}
                  </DpTimelineContent>
                </DpTimelineItem>
              )}
              {lead._replied && (
                <DpTimelineItem>
                  <DpTimelineDotWrap><DpTimelineDot $active /></DpTimelineDotWrap>
                  <DpTimelineContent>
                    <DpTimelineText $active>{t('leads.receivedReply', { text: getReplyBadge(lead, t, styledTheme)?.text || t('leads.replied') })}</DpTimelineText>
                    {lead._reply_at && <DpTimelineTime>{fmtTime(lead._reply_at)}</DpTimelineTime>}
                  </DpTimelineContent>
                </DpTimelineItem>
              )}
            </DpTimeline>
            </DpSectionContent>

            <DpDivider />
            <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 8.5V2.5a1 1 0 011-1h6l6.5 6.5-7 7L1 8.5z" stroke="#6C97D1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5" cy="5" r="1" fill="#6C97D1"/></svg>{t('leads.tags')}</DpSectionTitle>
            <DpSectionContent>
            <DpTagList>
              {lead.industry_tags && lead.industry_tags.length > 0
                ? lead.industry_tags.map(tag => (
                    <DpTag key={tag}>{tag}</DpTag>
                  ))
                : <span style={{ fontSize: '0.8125rem', color: '#888' }}>{'—'}</span>
              }
            </DpTagList>
            </DpSectionContent>

            {/* ── AI 分析 section ── */}
            {(lead._tech_score != null || lead._email_draft_score != null || lead._collab_primary) && (
              <>
                <DpDivider />
                <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1l2 4.5 5 .5-3.75 3.5L12.25 15 8 12.5 3.75 15l1-5.5L1 6l5-.5L8 1z" stroke="#6C97D1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('leads.aiAnalysis')}</DpSectionTitle>
                <DpSectionContent>
                  {lead._tech_score != null && (
                    <DpField>
                      <DpFieldLabel>{t('leads.techScore')}</DpFieldLabel>
                      <DpFieldValue>
                        <ScoreBarWrap>
                          <ScoreBarTrack>
                            <ScoreBarFill $pct={lead._tech_score} $color={lead._tech_score >= 50 ? styledTheme.strong.mauve : lead._tech_score >= 25 ? styledTheme.strong.gold : styledTheme.strong.olive} />
                          </ScoreBarTrack>
                          <ScoreValue $color={lead._tech_score >= 50 ? styledTheme.strong.mauve : lead._tech_score >= 25 ? styledTheme.strong.gold : styledTheme.strong.olive}>{lead._tech_score}</ScoreValue>
                        </ScoreBarWrap>
                      </DpFieldValue>
                    </DpField>
                  )}
                  {lead._email_draft_score != null && (
                    <DpField>
                      <DpFieldLabel>{t('leads.emailScore')}</DpFieldLabel>
                      <DpFieldValue>
                        <ScoreBarWrap>
                          <ScoreBarTrack>
                            <ScoreBarFill $pct={lead._email_draft_score} $color={lead._email_draft_score >= 70 ? styledTheme.strong.olive : lead._email_draft_score >= 40 ? styledTheme.strong.gold : styledTheme.strong.mauve} />
                          </ScoreBarTrack>
                          <ScoreValue $color={lead._email_draft_score >= 70 ? styledTheme.strong.olive : lead._email_draft_score >= 40 ? styledTheme.strong.gold : styledTheme.strong.mauve}>{lead._email_draft_score}</ScoreValue>
                        </ScoreBarWrap>
                        {lead._email_draft_score_reason && (
                          <ScoreCaption>{lead._email_draft_score_reason}</ScoreCaption>
                        )}
                      </DpFieldValue>
                    </DpField>
                  )}
                  {lead._collab_primary && (
                    <DpField>
                      <DpFieldLabel>{t('leads.collabDirection')}</DpFieldLabel>
                      <DpFieldValue>{lead._collab_primary}</DpFieldValue>
                    </DpField>
                  )}
                  {lead._collab_pitch && (
                    <AiParagraph>{lead._collab_pitch}</AiParagraph>
                  )}
                  {lead._collab_reason && (
                    <AiParagraph style={{ fontSize: '0.6875rem', color: styledTheme.colors.textTertiary }}>{lead._collab_reason}</AiParagraph>
                  )}
                  {lead._collab_services && lead._collab_services.length > 0 && (
                    <DpField>
                      <DpFieldLabel>{t('leads.collabServices')}</DpFieldLabel>
                      <DpFieldValue>
                        <DpTagList>
                          {lead._collab_services.map(s => <DpTag key={s}>{s}</DpTag>)}
                        </DpTagList>
                      </DpFieldValue>
                    </DpField>
                  )}
                </DpSectionContent>
              </>
            )}

            {lead._replied && (() => {
              const cat = getReplyBadge(lead, t, styledTheme) || { text: t('leads.replied'), bg: styledTheme.status.contacted.bg, fg: styledTheme.colors.accent };
              return (
                <>
                  <DpDivider />
                  <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M14 10c0 .55-.45 1-1 1H5l-3 3V3c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v7z" stroke="#6C97D1" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('leads.replyInfo')}</DpSectionTitle>
                  <DpSectionContent>
                  <DpField>
                    <DpFieldLabel>{t('leads.replyCategory')}</DpFieldLabel>
                    <DpFieldValue><ReplyBadge $bg={cat.bg} $fg={cat.fg}>{cat.icon && REPLY_ICONS[cat.icon] && <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d={REPLY_ICONS[cat.icon]} /></svg>}{cat.text}</ReplyBadge></DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.replySentiment')}</DpFieldLabel>
                    <DpFieldValue>{lead._reply_sentiment || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.replySummary')}</DpFieldLabel>
                    <DpFieldValue>{lead._reply_summary || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.replyNextStep')}</DpFieldLabel>
                    <DpFieldValue>{lead._reply_next_step || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.replyVia')}</DpFieldLabel>
                    <DpFieldValue>{lead._reply_via || '—'}</DpFieldValue>
                  </DpField>
                  <DpField>
                    <DpFieldLabel>{t('leads.replyTime')}</DpFieldLabel>
                    <DpFieldValue>{fmtTime(lead._reply_at)}</DpFieldValue>
                  </DpField>
                  </DpSectionContent>
                </>
              );
            })()}
          </DpColLeft>

          {/* Right: custom content (email feed, etc.) */}
          <DpColCenter>
            {rightPanel}
          </DpColCenter>
        </DpBody>
      </DpPanel>
    </DpOverlay>,
    document.body
  );
};

export default LeadDetailPanel;
