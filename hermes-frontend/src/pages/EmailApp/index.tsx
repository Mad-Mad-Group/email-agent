import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { media } from '../../styles/media';

/* ══════════════════════════════════════
   LUNO Email App Page — pixel-perfect replica
   Three views: inbox | detail | compose
   ══════════════════════════════════════ */

/* ── Shared Layout ── */

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  display: flex;
  min-height: 620px;
  overflow: hidden;
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
    max-height: 200px;
    overflow-y: auto;
  }
  ${media.tablet} {
    width: 180px;
    min-width: 180px;
  }
`;

const NewMessageBtn = styled.button`
  margin: 0 ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.md}px;
  padding: 10px ${({ theme }) => theme.spacing.md}px;
  background: ${({ theme }) => theme.colors.green};
  color: #fff;
  border: none;
  border-radius: 50px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.88;
  }
  ${media.mobile} {
    margin: 0 ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.sm}px;
    padding: 8px ${({ theme }) => theme.spacing.sm}px;
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
  font-size: 0.8125rem;
  color: ${({ $active, theme }) => ($active ? theme.colors.textPrimary : theme.colors.textSecondary)};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  background: ${({ $active, theme }) => ($active ? theme.colors.surfaceMuted : 'transparent')};
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
  svg {
    flex-shrink: 0;
    color: ${({ $active, theme }) => ($active ? theme.colors.textPrimary : theme.colors.textTertiary)};
  }
`;

const FolderBadge = styled.span`
  margin-left: auto;
  background: ${({ theme }) => theme.colors.red};
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
`;

const SidebarDivider = styled.div`
  margin: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: ${({ theme }) => theme.spacing.sm}px;
`;

const CategoryLabel = styled.div`
  font-size: 0.6875rem;
  text-transform: uppercase;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textTertiary};
  padding: 4px ${({ theme }) => theme.spacing.md}px 8px;
  letter-spacing: 0.5px;
`;

/* ── Main Panel (shared shell) ── */

const MainPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

/* ── Toolbar (inbox + detail share similar pattern) ── */

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

const ToolbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ToolbarBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
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
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.blue};
`;

/* ── Email List (Inbox) ── */

const EmailListWrap = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const EmailRow = styled.div<{ $unread?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: 10px ${({ theme }) => theme.spacing.md}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  position: relative;
  transition: background 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
  &:hover .hover-actions {
    display: flex;
  }
  ${media.mobile} {
    padding: 8px ${({ theme }) => theme.spacing.sm}px;
    gap: 6px;
  }
`;

const StarBtn = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  color: ${({ $active, theme }) => ($active ? theme.colors.amber : theme.colors.borderStrong)};
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.amber};
  }
`;

/* Initial-based avatar */
const avatarPalette = ['#3b82f6', '#10b981', '#f59e0b', '#f87171', '#3b82f6', '#94a3b8', '#10b981', '#94a3b8'];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
};

const AvatarCircle = styled.div<{ $bg: string }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  user-select: none;
  ${media.mobile} {
    width: 32px;
    height: 32px;
    min-width: 32px;
    font-size: 0.75rem;
  }
`;

const EmailContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SenderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const SenderName = styled.span<{ $unread?: boolean }>`
  font-size: 0.8125rem;
  font-weight: ${({ $unread }) => ($unread ? 600 : 500)};
  color: ${({ theme }) => theme.colors.blue};
  white-space: nowrap;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
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

const AttachmentPills = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 2px;
  ${media.mobile} {
    display: none;
  }
`;

const Pill = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.6875rem;
  font-weight: 500;
  background: ${({ $color }) => $color}18;
  color: ${({ $color }) => $color};
`;

const DateCell = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  white-space: nowrap;
  margin-left: auto;
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
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
  border-radius: ${({ theme }) => theme.radii.control}px;
  padding: 2px;
`;

const HoverBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

/* ── Email Detail View ── */

const DetailWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} {
    padding: ${({ theme }) => theme.spacing.sm}px;
  }
`;

const DetailToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  min-height: 48px;
`;

const DetailToolbarBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const BackLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.blue};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  &:hover {
    text-decoration: underline;
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

const ToLine = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-left: 48px;
`;

const EmailBodyText = styled.div`
  font-size: 0.875rem;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: ${({ theme }) => theme.spacing.sm}px 0;
`;

const AttachmentsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm}px;
  flex-wrap: wrap;
  padding-top: ${({ theme }) => theme.spacing.sm}px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const AttachmentCard = styled.div<{ $accent: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.sm}px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  min-width: 180px;
  cursor: pointer;
  transition: background 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
`;

const AttachmentIcon = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background: ${({ $color }) => $color}20;
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AttachmentMeta = styled.div`
  display: flex;
  flex-direction: column;
`;

const AttachmentName = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const AttachmentSize = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const DetailActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding-top: ${({ theme }) => theme.spacing.sm}px;
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
    background: ${({ $color }) => ($color ? $color + '12' : '#f4f5f7')};
  }
`;

/* ── Compose View ── */

const ComposeWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.lg}px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
  ${media.mobile} {
    padding: ${({ theme }) => theme.spacing.sm}px;
  }
`;

const ComposeCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const ComposeHeading = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0 0 ${({ theme }) => theme.spacing.md}px;
`;

const ComposeField = styled.input`
  width: 100%;
  padding: 12px 0;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  outline: none;
  font-family: inherit;
  background: transparent;
  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }
  &:focus {
    border-bottom-color: ${({ theme }) => theme.colors.blue};
  }
`;

const RichToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing.sm}px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;
`;

const RichBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  transition: background 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const ComposeTextarea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  border: none;
  font-size: 0.875rem;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.textSecondary};
  outline: none;
  resize: vertical;
  font-family: inherit;
  background: transparent;
  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }
`;

const ComposeActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding-top: ${({ theme }) => theme.spacing.sm}px;
`;

const GreenBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 22px;
  background: ${({ theme }) => theme.colors.green};
  color: #fff;
  border: none;
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.88;
  }
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
   Icons (inline SVG, 16x16 viewBox)
   ══════════════════════════════════════ */

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
  shield: 'M8 1.5L2.5 4v4c0 3.5 2.3 5.8 5.5 6.5 3.2-.7 5.5-3 5.5-6.5V4L8 1.5z',
  send: 'M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z',
  file: 'M9 2H4.5A1.5 1.5 0 003 3.5v9A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V6L9 2zM9 2v4h4',
  envelope: 'M2 4h12v8H2zM2 4l6 5 6-5',
  exclamation: 'M8 1a7 7 0 100 14A7 7 0 008 1zM8 5v3M8 10.5v.5',
  trash: 'M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v8.5a1 1 0 001 1h4a1 1 0 001-1V4',
  tag: 'M2 8.5V3a1 1 0 011-1h5.5l5 5-5.5 5.5-5-5zM5.25 5.25h.01',
  refresh: 'M2 8a6 6 0 0110.5-4M14 2v4h-4M14 8a6 6 0 01-10.5 4M2 14v-4h4',
  archive: 'M2 4h12v2H2zM3 6v7a1 1 0 001 1h8a1 1 0 001-1V6M6.5 9h3',
  star: 'M8 2l1.8 3.6L14 6.2l-3 2.9.7 4.1L8 11.4 4.3 13.2l.7-4.1-3-2.9 4.2-.6L8 2z',
  angleLeft: 'M10 3L5 8l5 5',
  angleRight: 'M6 3l5 5-5 5',
  markRead: 'M2 8h9M7 4l4 4-4 4',
  snooze: 'M14 8a6 6 0 11-12 0 6 6 0 0112 0zM8 4v4l2 2',
  plus: 'M8 3v10M3 8h10',
  chevronDown: 'M4 6l4 4 4-4',
  attach: 'M6 10l2-2M4 6l4-4a2.83 2.83 0 014 4L6 12a1.41 1.41 0 01-2-2l6-6',
  delete: 'M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v8.5a1 1 0 001 1h4a1 1 0 001-1V4',
  important: 'M3 2v10l5-3 5 3V2z',
  tasks: 'M3 4h10M3 8h10M3 12h6M13 10l1 1 2-3',
  moveTo: 'M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zM6 6l4 2-4 2V6z',
  labels: 'M2 8.5V3a1 1 0 011-1h5.5l5 5-5.5 5.5-5-5zM5.25 5.25h.01',
  moreDots: 'M4 8h.01M8 8h.01M12 8h.01',
  arrowLeft: 'M12 8H3M7 4L3 8l4 4',
  reply: 'M6 8L2 5v6l4-3zM2 8h8a4 4 0 014 4',
  forward: 'M10 8l4-3v6l-4-3zM14 8H6a4 4 0 00-4 4',
  bold: 'M4 2h5a3 3 0 010 6H4zM4 8h6a3 3 0 010 6H4z',
  italic: 'M7 2h5M4 14h5M10 2L6 14',
  underline: 'M4 2v6a4 4 0 008 0V2M3 14h10',
  strikethrough: 'M2 8h12M5 3h3.5a2.5 2.5 0 010 5M11 13H7.5a2.5 2.5 0 010-5',
  listUl: 'M5 4h9M5 8h9M5 12h9M2 4h.01M2 8h.01M2 12h.01',
  listOl: 'M6 4h8M6 8h8M6 12h8M2 3.5v2M2 7v3M2 12.5v1',
  link: 'M6.5 9.5l3-3M5 11a3 3 0 01-1-5l2-2M11 5a3 3 0 011 5l-2 2',
  image: 'M2 3h12v10H2zM2 10l3-3 2 2 3-3 4 4M10 6.5a1 1 0 100-2 1 1 0 000 2z',
  alignLeft: 'M2 4h12M2 7h8M2 10h12M2 13h8',
};

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={icons.star} />
  </svg>
);

/* ══════════════════════════════════════
   Data
   ══════════════════════════════════════ */

interface FolderDef {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

const folders: FolderDef[] = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox', badge: 23 },
  { id: 'snooze', label: 'Snooze', icon: 'clock' },
  { id: 'important', label: 'Important', icon: 'shield', badge: 3 },
  { id: 'sent', label: 'Sent', icon: 'send' },
  { id: 'drafts', label: 'Drafts', icon: 'file' },
  { id: 'allmail', label: 'All Mail', icon: 'envelope' },
  { id: 'spam', label: 'Spam', icon: 'exclamation' },
  { id: 'trash', label: 'Trash', icon: 'trash', badge: 68 },
];

const categories = ['Angular', 'Ui UX design', 'Development', 'Marketing'];

interface Attachment {
  name: string;
  ext: string;
  color: string;
  size: string;
}

interface EmailData {
  id: number;
  sender: string;
  email: string;
  preview: string;
  unread: boolean;
  defaultStarred: boolean;
  attachments: Attachment[];
  date: string;
  body: string;
  subject: string;
}

const colorMap: Record<string, string> = {
  pdf: '#f87171',
  exc: '#10b981',
  zip: '#3b82f6',
  docx: '#3b82f6',
};

const emails: EmailData[] = [
  {
    id: 1,
    sender: 'Marshall Nichols',
    email: 'marshall.nichols@example.com',
    preview: 'If you are going to use a passage of Lorem Ipsum, you need to be sure there isn\'t anything embarrassing hidden...',
    unread: true,
    defaultStarred: false,
    attachments: [{ name: 'project-report.pdf', ext: 'pdf', color: colorMap.pdf, size: '68KB' }],
    date: 'Aug 4',
    subject: 'There are many variations of passages of Lorem Ipsum available',
    body: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using \'Content here, content here\', making it look like readable English.\n\nMany desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for \'lorem ipsum\' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).',
  },
  {
    id: 2,
    sender: 'Marshall Cameron',
    email: 'mcameron@example.com',
    preview: 'The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested...',
    unread: true,
    defaultStarred: true,
    attachments: [],
    date: 'Aug 4',
    subject: 'Lorem Ipsum is simply dummy text of the printing',
    body: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old.',
  },
  {
    id: 3,
    sender: 'Brian Swader',
    email: 'brian.s@example.com',
    preview: 'All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary...',
    unread: false,
    defaultStarred: false,
    attachments: [],
    date: 'Aug 4',
    subject: 'The generated Lorem Ipsum is therefore always free from repetition',
    body: 'All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures.',
  },
  {
    id: 4,
    sender: 'Edit Toke',
    email: 'edit.toke@example.com',
    preview: 'It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures...',
    unread: false,
    defaultStarred: false,
    attachments: [],
    date: 'Aug 4',
    subject: 'Where does it come from?',
    body: 'It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.',
  },
  {
    id: 5,
    sender: 'Dean Otto',
    email: 'dean.otto@example.com',
    preview: 'The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested...',
    unread: true,
    defaultStarred: true,
    attachments: [{ name: 'analytics.pdf', ext: 'pdf', color: colorMap.pdf, size: '120KB' }],
    date: 'Aug 4',
    subject: 'Sections 1.10.32 and 1.10.33 from de Finibus Bonorum',
    body: 'The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form.',
  },
  {
    id: 6,
    sender: 'Jack Bird',
    email: 'jack.bird@example.com',
    preview: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece...',
    unread: true,
    defaultStarred: true,
    attachments: [
      { name: 'budget.exc', ext: 'exc', color: colorMap.exc, size: '45KB' },
      { name: 'summary.pdf', ext: 'pdf', color: colorMap.pdf, size: '92KB' },
    ],
    date: 'Aug 4',
    subject: 'Contrary to popular belief, Lorem Ipsum is not simply random text',
    body: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words.',
  },
  {
    id: 7,
    sender: 'Orlando Lentz',
    email: 'orlando.l@example.com',
    preview: 'The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested...',
    unread: false,
    defaultStarred: false,
    attachments: [{ name: 'assets.zip', ext: 'zip', color: colorMap.zip, size: '3.2MB' }],
    date: 'Aug 4',
    subject: 'Where can I get some Lorem Ipsum?',
    body: 'There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don\'t look even slightly believable.',
  },
  {
    id: 8,
    sender: 'Nellie Maxwell',
    email: 'nellie.m@example.com',
    preview: 'The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested...',
    unread: false,
    defaultStarred: false,
    attachments: [],
    date: 'Aug 4',
    subject: 'Why do we use it?',
    body: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters.',
  },
  {
    id: 9,
    sender: 'Chris Fox',
    email: 'chris.fox@example.com',
    preview: 'It has survived not only five centuries, but also the leap into electronic typesetting...',
    unread: false,
    defaultStarred: false,
    attachments: [{ name: 'proposal.docx', ext: 'docx', color: colorMap.docx, size: '54KB' }],
    date: 'Aug 4',
    subject: 'It has survived not only five centuries',
    body: 'Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.',
  },
];

/* ══════════════════════════════════════
   Component
   ══════════════════════════════════════ */

type ViewType = 'inbox' | 'detail' | 'compose';

const EmailApp: React.FC = () => {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewType>('inbox');
  const [activeFolder, setActiveFolder] = useState('inbox');

  const translatedFolders: FolderDef[] = [
    { id: 'inbox', label: t('email.inbox'), icon: 'inbox', badge: 23 },
    { id: 'snooze', label: t('email.snooze'), icon: 'clock' },
    { id: 'important', label: t('email.important'), icon: 'shield', badge: 3 },
    { id: 'sent', label: t('email.sent'), icon: 'send' },
    { id: 'drafts', label: t('email.drafts'), icon: 'file' },
    { id: 'allmail', label: t('email.allMail'), icon: 'envelope' },
    { id: 'spam', label: t('email.spam'), icon: 'exclamation' },
    { id: 'trash', label: t('email.trash'), icon: 'trash', badge: 68 },
  ];
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [starredEmails, setStarredEmails] = useState<Set<number>>(
    new Set(emails.filter((e) => e.defaultStarred).map((e) => e.id))
  );
  const [activeEmail, setActiveEmail] = useState<EmailData | null>(null);

  const toggleSelect = (id: number) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map((e) => e.id)));
    }
  };

  const toggleStar = (id: number) => {
    setStarredEmails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEmail = (email: EmailData) => {
    setActiveEmail(email);
    setView('detail');
  };

  const openCompose = () => {
    setView('compose');
  };

  const goInbox = () => {
    setView('inbox');
    setActiveEmail(null);
  };

  /* ── Sidebar (shared across all views) ── */
  const renderSidebar = () => (
    <Sidebar>
      <NewMessageBtn onClick={openCompose}>
        <I d={icons.plus} />
        {t('email.newMessage')}
      </NewMessageBtn>

      <FolderList>
        {translatedFolders.map((f) => (
          <FolderItem
            key={f.id}
            $active={activeFolder === f.id}
            onClick={() => {
              setActiveFolder(f.id);
              goInbox();
            }}
          >
            <I d={(icons as any)[f.icon]} />
            {f.label}
            {f.badge != null && <FolderBadge>{f.badge}</FolderBadge>}
          </FolderItem>
        ))}
      </FolderList>

      <SidebarDivider />
      <CategoryLabel>{t('email.categories')}</CategoryLabel>
      <FolderList>
        {categories.map((c) => (
          <FolderItem key={c} onClick={() => setActiveFolder(c)}>
            <I d={icons.tag} />
            {c}
          </FolderItem>
        ))}
      </FolderList>
    </Sidebar>
  );

  /* ── Inbox View ── */
  const renderInbox = () => (
    <MainPanel>
      <Toolbar>
        <ToolbarLeft>
          <Checkbox
            checked={selectedEmails.size === emails.length && emails.length > 0}
            onChange={toggleSelectAll}
          />
          <span style={{ fontSize: '0.8125rem', color: '#6c757d' }}>{t('common.all')}</span>
          <IconBtn onClick={() => {}}>
            <I d={icons.refresh} />
          </IconBtn>
          <ToolbarBtn>
            {t('common.more')} <I d={icons.chevronDown} size={12} />
          </ToolbarBtn>
          <ToolbarBtn>
            {t('email.moveTo')} <I d={icons.chevronDown} size={12} />
          </ToolbarBtn>
        </ToolbarLeft>
        <ToolbarRight>
          <span>1-50 of 234</span>
          <IconBtn>
            <I d={icons.angleLeft} />
          </IconBtn>
          <IconBtn>
            <I d={icons.angleRight} />
          </IconBtn>
        </ToolbarRight>
      </Toolbar>

      <EmailListWrap>
        {emails.map((email) => (
          <EmailRow key={email.id} $unread={email.unread}>
            <Checkbox
              checked={selectedEmails.has(email.id)}
              onChange={() => toggleSelect(email.id)}
            />
            <StarBtn
              $active={starredEmails.has(email.id)}
              onClick={(e) => {
                e.stopPropagation();
                toggleStar(email.id);
              }}
            >
              <StarIcon filled={starredEmails.has(email.id)} />
            </StarBtn>
            <AvatarCircle $bg={getAvatarColor(email.sender)}>
              {email.sender.charAt(0)}
            </AvatarCircle>
            <EmailContent>
              <SenderRow>
                <SenderName $unread={email.unread} onClick={() => openEmail(email)}>
                  {email.sender}
                </SenderName>
              </SenderRow>
              <Preview>{email.preview}</Preview>
              {email.attachments.length > 0 && (
                <AttachmentPills>
                  {email.attachments.map((att, i) => (
                    <Pill key={i} $color={att.color}>
                      <I d={icons.attach} size={11} />
                      {att.name} ({att.ext})
                    </Pill>
                  ))}
                </AttachmentPills>
              )}
            </EmailContent>
            <DateCell>{email.date}</DateCell>

            <HoverActions className="hover-actions">
              <HoverBtn title={t('email.archive')}>
                <I d={icons.archive} />
              </HoverBtn>
              <HoverBtn title={t('common.delete')}>
                <I d={icons.delete} />
              </HoverBtn>
              <HoverBtn title={t('email.markAsRead')}>
                <I d={icons.markRead} />
              </HoverBtn>
              <HoverBtn title={t('email.snooze')}>
                <I d={icons.snooze} />
              </HoverBtn>
            </HoverActions>
          </EmailRow>
        ))}
      </EmailListWrap>
    </MainPanel>
  );

  /* ── Detail View ── */
  const renderDetail = () => {
    if (!activeEmail) return null;
    const e = activeEmail;
    return (
      <MainPanel>
        <DetailToolbar>
          <DetailToolbarBtn title={t('email.archive')}>
            <I d={icons.archive} />
          </DetailToolbarBtn>
          <DetailToolbarBtn title={t('common.delete')}>
            <I d={icons.delete} />
          </DetailToolbarBtn>
          <DetailToolbarBtn title={t('email.important')}>
            <I d={icons.important} />
          </DetailToolbarBtn>
          <DetailToolbarBtn title={t('email.addToTasks')}>
            <I d={icons.tasks} />
          </DetailToolbarBtn>
          <DetailToolbarBtn title={t('email.moveTo')}>
            <I d={icons.moveTo} />
          </DetailToolbarBtn>
          <DetailToolbarBtn title={t('email.labels')}>
            <I d={icons.labels} />
          </DetailToolbarBtn>
          <DetailToolbarBtn title={t('common.more')}>
            <I d={icons.moreDots} />
          </DetailToolbarBtn>
        </DetailToolbar>

        <DetailWrap>
          <BackLink onClick={goInbox}>
            <I d={icons.arrowLeft} />
            {t('email.backToInbox')}
          </BackLink>

          <SubjectHeading>{e.subject}</SubjectHeading>

          <DetailSenderRow>
            <AvatarCircle $bg={getAvatarColor(e.sender)}>
              {e.sender.charAt(0)}
            </AvatarCircle>
            <DetailSenderInfo>
              <DetailSenderName>{e.sender}</DetailSenderName>
              <DetailSenderEmail>&lt;{e.email}&gt;</DetailSenderEmail>
            </DetailSenderInfo>
            <DetailDateRight>
              <span>{e.date}, 2024 10:30 AM</span>
              <IconBtn title={t('email.reply')}>
                <I d={icons.reply} />
              </IconBtn>
              <IconBtn title={t('common.more')}>
                <I d={icons.moreDots} />
              </IconBtn>
            </DetailDateRight>
          </DetailSenderRow>

          <ToLine>To: Me &#9662;</ToLine>

          <EmailBodyText>
            {e.body.split('\n').map((para, i) => (
              <p key={i} style={{ margin: '0 0 12px' }}>{para}</p>
            ))}
          </EmailBodyText>

          {e.attachments.length > 0 && (
            <AttachmentsRow>
              {e.attachments.map((att, i) => (
                <AttachmentCard key={i} $accent={att.color}>
                  <AttachmentIcon $color={att.color}>
                    <I d={icons.file} />
                  </AttachmentIcon>
                  <AttachmentMeta>
                    <AttachmentName>{att.name}</AttachmentName>
                    <AttachmentSize>{t('email.size')} {att.size}</AttachmentSize>
                  </AttachmentMeta>
                </AttachmentCard>
              ))}
            </AttachmentsRow>
          )}

          <DetailActions>
            <OutlineBtn>
              <I d={icons.reply} />
              {t('email.reply')}
            </OutlineBtn>
            <OutlineBtn>
              <I d={icons.forward} />
              {t('email.forward')}
            </OutlineBtn>
          </DetailActions>
        </DetailWrap>
      </MainPanel>
    );
  };

  /* ── Compose View ── */
  const renderCompose = () => (
    <MainPanel>
      <ComposeWrap>
        <BackLink onClick={goInbox}>
          <I d={icons.arrowLeft} />
          {t('email.backToInbox')}
        </BackLink>

        <ComposeCard>
          <ComposeHeading>{t('email.newMessage')}</ComposeHeading>

          <ComposeField placeholder={t('email.emailTo')} />
          <ComposeField placeholder={t('email.subject')} />

          <RichToolbar>
            <RichBtn title={t('email.bold')}><I d={icons.bold} size={14} /></RichBtn>
            <RichBtn title={t('email.italic')}><I d={icons.italic} size={14} /></RichBtn>
            <RichBtn title={t('email.underline')}><I d={icons.underline} size={14} /></RichBtn>
            <RichBtn title={t('email.strikethrough')}><I d={icons.strikethrough} size={14} /></RichBtn>
            <span style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />
            <RichBtn title={t('email.unorderedList')}><I d={icons.listUl} size={14} /></RichBtn>
            <RichBtn title={t('email.orderedList')}><I d={icons.listOl} size={14} /></RichBtn>
            <span style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />
            <RichBtn title={t('email.link')}><I d={icons.link} size={14} /></RichBtn>
            <RichBtn title={t('email.image')}><I d={icons.image} size={14} /></RichBtn>
            <RichBtn title={t('email.align')}><I d={icons.alignLeft} size={14} /></RichBtn>
          </RichToolbar>

          <ComposeTextarea
            placeholder={t('email.writeMessage')}
            defaultValue="It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters."
          />

          <ComposeActions>
            <GreenBtn>
              <I d={icons.send} />
              {t('email.send')}
            </GreenBtn>
            <OutlineBtn>
              <I d={icons.clock} />
              {t('email.scheduleSend')}
            </OutlineBtn>
          </ComposeActions>
        </ComposeCard>
      </ComposeWrap>
    </MainPanel>
  );

  return (
    <Page>
      <Card>
        {renderSidebar()}
        {view === 'inbox' && renderInbox()}
        {view === 'detail' && renderDetail()}
        {view === 'compose' && renderCompose()}
      </Card>

      <Footer>
        <span>{t('footer.copyright', { year: 2023 })}</span>
        <FooterLinks>
          <a href="#">{t('footer.portfolio')}</a>
          <a href="#">{t('footer.licenses')}</a>
          <a href="#">{t('footer.support')}</a>
          <a href="#">{t('footer.faqs')}</a>
        </FooterLinks>
      </Footer>
    </Page>
  );
};

export default EmailApp;
