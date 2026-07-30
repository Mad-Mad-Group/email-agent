import React, { useEffect, useState } from 'react';
import styled, { css, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { media } from '../../styles/media';
import { glassSurface } from '../../styles/glassSurface';
import { useSettings, useNotificationPrefs, useUpdateNotificationPrefs, useWhatsappTemplates, useUpdateWhatsappTemplates, useEmailSettings, useUpdateEmailSettings } from '../../api/hooks';
import { settingsApi, emailSettingsApi } from '../../api/services';
import { useAuth } from '../../contexts/AuthContext';
import { glassAvatar } from '../../styles/liquidGlass';
import { sectionIconSlot, IconSend, IconInbox } from '../../components/SectionIcons';

/* ══════════════════════════════════════
   CMS Settings — LUNO-style UI
   ══════════════════════════════════════ */

/* ── Layout ── */

const Page = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.lg}px; animation: fadeSlideUp 0.5s var(--ease-out) both;`;

const PageCard = styled.div`
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: ${({ theme }) => theme.radii.card}px;
  padding: 28px;
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.lg}px;
`;

const Card = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
`;

const HeroBody = styled.div`
  display: flex; align-items: center; gap: 20px;
  ${media.mobile} { flex-direction: column; text-align: center; }
`;

const HeroAvatar = styled.div`
  width: 64px; height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  ${glassAvatar}
`;

const HeroInfo = styled.div`flex: 1;`;

const HeroName = styled.h2`
  margin: 0; font-size: clamp(1.25rem, 2.2vw, 1.5rem); font-weight: 700;
  background: ${({ theme }) => theme.gradients.brand};
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  ${({ theme }) => theme.mode === 'dark' && `
    background: linear-gradient(135deg, #E0ACD2, #ACC0DE);
    -webkit-background-clip: text; background-clip: text;
  `}
`;

const HeroSub = styled.div`
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 2px;
`;

/* ── Settings Layout (segmented control + centered content) ── */

const SettingsLayout = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg}px;
  ${media.mobile} { flex-direction: column; }
`;

const TabNav = styled.div`
  display: flex;
  flex-direction: column;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radii.card}px;
  background: ${({ theme }) => theme.colors.surfaceMuted}40;
  border: 1px solid ${({ theme }) => theme.colors.border};
  gap: 2px;
  min-width: 200px;
  flex-shrink: 0;
  align-self: flex-start;
  ${media.mobile} { flex-direction: row; flex-wrap: wrap; min-width: unset; width: 100%; }
`;

const TabItem = styled.button<{ $active?: boolean }>`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.card}px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  text-align: left;
  transition: color 0.2s var(--ease-out), background 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out);

  ${({ $active, theme }) => $active ? css`
    background: ${theme.colors.surface};
    color: ${theme.colors.accent};
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  ` : css`
    background: transparent;
    color: ${theme.colors.textSecondary};
    &:hover {
      color: ${theme.colors.accent};
      background: ${theme.colors.surface}80;
    }
  `}

  ${media.mobile} {
    flex: 1;
    justify-content: center;
    padding: 10px 12px;
  }
`;

const TabIcon = styled.span`
  display: flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; flex-shrink: 0;
`;

const ContentPanel = styled.div`
  flex: 1;
  min-width: 0;
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
`;

const ContentHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  h2 { margin: 0; font-size: 1rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const ContentBody = styled.div`
  padding: ${({ theme }) => theme.spacing.lg}px;
  display: flex; flex-direction: column; gap: 20px;
  ${media.mobile} { padding: ${({ theme }) => theme.spacing.md}px; }
`;

/* ── Form ── */

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;

const Label = styled.label`
  font-size: 0.8125rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input<{ $error?: boolean }>`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 1px solid ${({ $error, theme }) => $error ? '#e53e3e' : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ $error, theme }) => $error ? '#fff5f5' : theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: ${({ $error, theme }) => $error ? '#e53e3e' : theme.colors.accent}; }
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
  &:disabled { opacity: 0.6; cursor: not-allowed; background: ${({ theme }) => theme.colors.surfaceMuted}; }
`;

const FieldErrorHint = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #e53e3e;
  margin-top: 2px;
`;

const InfoCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const FormHint = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const PasswordWrap = styled.div`
  position: relative;
`;
const PasswordToggle = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textTertiary};
  padding: 4px;
  display: flex;
  align-items: center;
  &:hover { color: ${({ theme }) => theme.colors.textSecondary}; }
`;

const BtnRow = styled.div`
  display: flex; gap: 10px; padding-top: 4px;
`;

const SaveBtn = styled.button`
  padding: 10px 24px;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DiscardBtn = styled.button`
  padding: 10px 24px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textSecondary};
  border: none;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
`;

const EmptyText = styled.p`
  font-size: 0.875rem; color: ${({ theme }) => theme.colors.textTertiary};
  padding: ${({ theme }) => theme.spacing.xl}px 0; text-align: center; margin: 0;
`;

/* ── Settings Row (for notification toggles & other config) ── */

const SettingRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md}px;
  padding: 14px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
  ${media.mobile} { flex-direction: column; gap: ${({ theme }) => theme.spacing.xs}px; align-items: flex-start; }
`;

const SettingKey = styled.span`
  font-size: 0.8125rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  min-width: 180px; flex-shrink: 0; text-transform: capitalize;
  ${media.mobile} { min-width: unset; }
`;

const SettingValue = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  word-break: break-all;
`;

/* ── Physical Toggle Switch ── */

const ToggleTrack = styled.label<{ $on: boolean }>`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  cursor: pointer;
  background: ${({ $on, theme }) => $on ? theme.strong.olive : theme.colors.border};
  box-shadow:
    inset 0 2px 4px rgba(0,0,0,0.15),
    0 1px 2px rgba(0,0,0,0.08);
  transition: background 0.3s;
`;

const ToggleKnob = styled.span<{ $on: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $on }) => $on ? '22px' : '2px'};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow:
    0 1px 3px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.8);
  transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  &::after {
    content: '';
    position: absolute;
    top: 4px; left: 5px;
    width: 10px; height: 10px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, rgba(255,255,255,0.9) 0%, transparent 70%);
  }
`;

const ToggleHidden = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const ToggleSwitch: React.FC<{ on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }> = ({ on, onChange, disabled }) => (
  <ToggleTrack $on={on} style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
    <ToggleHidden type="checkbox" checked={on} onChange={(e) => !disabled && onChange?.(e.target.checked)} />
    <ToggleKnob $on={on} />
  </ToggleTrack>
);

/* ── SVG Icons ── */

const SettingsGearIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const NetworkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const RepeatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const ZapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.88L2 22l5.23-1.24A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
    <path d="M16.5 14.38c-.23.66-1.32 1.22-1.82 1.3-.47.07-1.04.1-1.68-.11-.39-.13-.88-.3-1.52-.58-2.69-1.21-4.44-3.93-4.58-4.12-.13-.18-1.09-1.46-1.09-2.78s.68-1.97.93-2.24c.25-.27.54-.33.72-.33h.52c.17 0 .39-.06.61.47.23.54.79 1.93.86 2.07.07.14.12.3.02.47-.56 1.11-1.17 1.07-.86 1.6 1.13 1.93 2.23 2.58 3.92 3.38.28.13.44.11.6-.07.16-.18.68-.79.86-1.07.18-.27.37-.23.61-.14.25.1 1.6.76 1.87.89.28.14.46.21.52.33.08.11.08.69-.15 1.32z" />
  </svg>
);

const EmailSmtpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-10 7L2 7" />
  </svg>
);

const SectionTitle = styled.div`
  ${sectionIconSlot}
  font-size: 0.875rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.accent};
  padding-bottom: 4px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}40;
  margin-top: 4px;
`;

const SlidersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const Select = styled.select`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
`;

const Textarea = styled.textarea`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.875rem;
  outline: none;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: border-color 0.15s;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
`;

const DefaultBanner = styled.div`
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.accent}10;
  border: 1px dashed ${({ theme }) => theme.colors.accent}40;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/* ── Preview Card ── */

const PreviewCard = styled.div`
  border-radius: ${({ theme }) => theme.radii.card}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceMuted}30;
  overflow: hidden;
`;

const PreviewHeader = styled.div`
  padding: 10px 16px;
  background: ${({ theme }) => theme.colors.accent}12;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8125rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.accent};
  display: flex; align-items: center; gap: 6px;
`;

const PreviewBody = styled.div`
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 10px;
`;

const PreviewRow = styled.div`
  display: flex; gap: 12px; font-size: 0.8125rem;
  ${media.mobile} { flex-direction: column; gap: 2px; }
`;

const PreviewLabel = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  min-width: 100px; flex-shrink: 0;
`;

const PreviewValue = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  font-weight: 500;
`;

/* ── Dimension Row ── */

const DimRow = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}40;
  &:last-child { border-bottom: none; }
  ${media.mobile} { flex-wrap: wrap; gap: 6px; }
`;

const DimLabel = styled.span`
  font-size: 0.8125rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  min-width: 140px; flex-shrink: 0;
  ${media.mobile} { min-width: 100px; }
`;

const DimSlider = styled.input`
  flex: 1; min-width: 80px;
  accent-color: ${({ theme }) => theme.colors.accent};
`;

const DimWeight = styled.span<{ $warn?: boolean }>`
  font-size: 0.8125rem; font-weight: 600;
  min-width: 40px; text-align: right;
  color: ${({ $warn, theme }) => $warn ? theme.strong.mauve : theme.colors.textSecondary};
`;

const DimTotalRow = styled.div<{ $ok: boolean }>`
  display: flex; justify-content: flex-end; align-items: center; gap: 8px;
  padding-top: 6px;
  font-size: 0.8125rem; font-weight: 600;
  color: ${({ $ok, theme }) => $ok ? theme.strong.olive : theme.strong.mauve};
`;

/* ── Helpers ── */

function renderValue(val: unknown, t: (key: string) => string): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? t('common.yes') : t('common.no');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function humanKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

function extractSetting(data: unknown, key: string): string {
  if (!Array.isArray(data)) return '';
  const found = data.find((item: any) => item?.key === key);
  return found?.value != null ? String(found.value) : '';
}

/** extractSetting 會 String() 化，object 值要用呢個 */
function extractSettingRaw(data: unknown, key: string): unknown {
  if (!Array.isArray(data)) return undefined;
  return data.find((item: any) => item?.key === key)?.value;
}

const MANAGED_KEYS = new Set(['agent_ip_address', 'email_scoring_rules', 'agent_concurrency']);

function toDisplayEntries(data: unknown): [string, unknown][] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item: any) => item?.key && !MANAGED_KEYS.has(item.key))
    .map((item: any) => [item.key, item.value] as [string, unknown]);
}

/* ── Tabs config ── */

type SettingsTab = 'agent' | 'notifications' | 'follow-up' | 'auto-send' | 'email-scoring' | 'email-smtp' | 'other';

/**
 * AI Agent 並行度 —— per stage，同 cms/worker/leader.ts 嘅 sub-worker 一一對應。
 * 上下限同後端 sanitizeAgentConcurrency 保持一致。
 */
const CONCURRENCY_MIN = 1;
const CONCURRENCY_MAX = 10;
const AGENT_STAGES = [
  { key: 'S1', labelKey: 'settings.concurrencyStageS1', hintKey: 'settings.concurrencyStageS1Hint', fallback: 3 },
  { key: 'S2', labelKey: 'settings.concurrencyStageS2', hintKey: 'settings.concurrencyStageS2Hint', fallback: 3 },
  { key: 'S3', labelKey: 'settings.concurrencyStageS3', hintKey: 'settings.concurrencyStageS3Hint', fallback: 3 },
  { key: 'S4', labelKey: 'settings.concurrencyStageS4', hintKey: 'settings.concurrencyStageS4Hint', fallback: 2 },
] as const;

type ConcurrencyMap = Record<string, number>;

const DEFAULT_CONCURRENCY: ConcurrencyMap =
  Object.fromEntries(AGENT_STAGES.map(s => [s.key, s.fallback]));

/* ── Component ── */

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuth();
  // isAdmin reserved for the future when we add an admin-only settings page.
  // Email setup (per-user OAuth + .env shared fallback) is now handled
  // outside Settings — see EmailConnectionSection.tsx re-exports.
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const queryClient = useQueryClient();
  const { data, isLoading } = useSettings();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [tab, setTab] = useState<SettingsTab>(isAdmin ? 'agent' : 'notifications');

  // Agent IP local state
  const [agentIp, setAgentIp] = useState('');
  const [agentIpDraft, setAgentIpDraft] = useState('');

  // Agent concurrency local state
  const [concurrency, setConcurrency] = useState<ConcurrencyMap>(DEFAULT_CONCURRENCY);
  const [concurrencyDraft, setConcurrencyDraft] = useState<ConcurrencyMap>(DEFAULT_CONCURRENCY);
  const [concurrencyBusy, setConcurrencyBusy] = useState(false);
  const [concurrencyFeedback, setConcurrencyFeedback] = useState<string | null>(null);

  // Follow-up settings local state
  const [followUpDays, setFollowUpDays] = useState(7);
  const [followUpMaxAttempts, setFollowUpMaxAttempts] = useState(3);
  const [followUpEnabled, setFollowUpEnabled] = useState(true);

  // Auto-send rules local state
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [autoSendMinScore, setAutoSendMinScore] = useState(80);
  const [autoSendMaxPerDay, setAutoSendMaxPerDay] = useState(20);
  const [autoSendRequireVerified, setAutoSendRequireVerified] = useState(true);

  // Email scoring rules local state
  const DEFAULT_DIMS = [
    { key: 'tone_match', label: t('settings.dimensionToneMatch'), weight: 20 },
    { key: 'personalization', label: t('settings.dimensionPersonalization'), weight: 25 },
    { key: 'content_quality', label: t('settings.dimensionContentQuality'), weight: 25 },
    { key: 'cta_clarity', label: t('settings.dimensionCtaClarity'), weight: 15 },
    { key: 'length_compliance', label: t('settings.dimensionLengthCompliance'), weight: 15 },
  ];
  const [scoringTone, setScoringTone] = useState('professional');
  const [scoringMinLength, setScoringMinLength] = useState(50);
  const [scoringMaxLength, setScoringMaxLength] = useState(300);
  const [scoringRequiredPoints, setScoringRequiredPoints] = useState('');
  const [scoringCustomInstructions, setScoringCustomInstructions] = useState('');
  const [scoringDimensions, setScoringDimensions] = useState(DEFAULT_DIMS);
  const [scoringLoaded, setScoringLoaded] = useState(false);
  const [scoringBusy, setScoringBusy] = useState(false);
  const [scoringFeedback, setScoringFeedback] = useState<string | null>(null);
  const dimTotal = scoringDimensions.reduce((s, d) => s + d.weight, 0);
  const dimTotalOk = dimTotal === 100;
  const updateDimWeight = (key: string, weight: number) => {
    setScoringDimensions(prev => prev.map(d => d.key === key ? { ...d, weight } : d));
  };

  // Sync from server data
  useEffect(() => {
    if (data) {
      const ip = extractSetting(data, 'agent_ip_address');
      setAgentIp(ip);
      setAgentIpDraft(ip);

      const rawConcurrency = extractSettingRaw(data, 'agent_concurrency');
      const merged: ConcurrencyMap = { ...DEFAULT_CONCURRENCY };
      if (rawConcurrency && typeof rawConcurrency === 'object') {
        for (const stage of AGENT_STAGES) {
          const n = Number((rawConcurrency as any)[stage.key]);
          if (Number.isFinite(n)) merged[stage.key] = n;
        }
      }
      setConcurrency(merged);
      setConcurrencyDraft(merged);
      // Load scoring rules if present
      if (!scoringLoaded) {
        const raw = extractSetting(data, 'email_scoring_rules');
        if (raw) {
          try {
            const rules = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (rules.tone) setScoringTone(rules.tone);
            if (rules.minLength != null) setScoringMinLength(Number(rules.minLength));
            if (rules.maxLength != null) setScoringMaxLength(Number(rules.maxLength));
            if (rules.requiredPoints) setScoringRequiredPoints(rules.requiredPoints);
            if (rules.customInstructions) setScoringCustomInstructions(rules.customInstructions);
            if (Array.isArray(rules.dimensions) && rules.dimensions.length) {
              setScoringDimensions(rules.dimensions.map((d: any) => ({
                key: String(d.key),
                label: String(d.label),
                weight: Number(d.weight) || 0,
              })));
            }
          } catch { /* use defaults */ }
        }
        setScoringLoaded(true);
      }
    }
  }, [data, scoringLoaded]);

  const entries = toDisplayEntries(data);
  const hasOther = entries.length > 0;

  // Email SMTP/IMAP settings: removed from Settings page in favour of
  // (a) per-user Gmail OAuth via <EmailConnectionSection/> (re-exported for use
  //     in any prompt / chip / modal that surfaces the connect flow), and
  // (b) the .env shared SMTP fallback that backend reads at boot. Admins
  // who need to change SMTP/IMAP for system-wide emails edit .env and
  // restart the backend — no UI surface needed for a once-per-deploy
  // config.

  // WhatsApp templates (per-user)
  const { data: waTemplates, isLoading: waLoading } = useWhatsappTemplates();
  const updateWa = useUpdateWhatsappTemplates();
  const [waList, setWaList] = useState<{ id: string; name: string; body: string }[]>([]);
  const [waInit, setWaInit] = useState(false);
  const [waFeedback, setWaFeedback] = useState<string | null>(null);
  useEffect(() => {
    if (waTemplates && !waInit) {
      setWaList(waTemplates as any[] ?? []);
      setWaInit(true);
    }
  }, [waTemplates, waInit]);

  const handleAddWaTemplate = () => {
    setWaList(prev => [...prev, { id: Date.now().toString(36), name: '', body: '' }]);
  };
  const handleRemoveWaTemplate = (id: string) => {
    setWaList(prev => prev.filter(t => t.id !== id));
  };
  const handleWaChange = (id: string, field: 'name' | 'body', value: string) => {
    setWaList(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  const handleSaveWa = async () => {
    try {
      await updateWa.mutateAsync(waList);
      setWaFeedback(t('settings.whatsappSaved'));
    } catch {
      setWaFeedback(t('settings.whatsappSaveFailed'));
    }
    setTimeout(() => setWaFeedback(null), 3000);
  };

  // Email SMTP settings (per-user)
  const { data: smtpData, isLoading: smtpLoading } = useEmailSettings();
  const updateSmtp = useUpdateEmailSettings();
  const [smtpForm, setSmtpForm] = useState({
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpFrom: '',
    imapHost: '', imapPort: 993,
  });
  const [smtpInit, setSmtpInit] = useState(false);
  const [smtpFeedback, setSmtpFeedback] = useState<string | null>(null);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpHasPass, setSmtpHasPass] = useState(false);
  const [smtpEditing, setSmtpEditing] = useState(false);
  useEffect(() => {
    if (smtpData && !smtpInit) {
      setSmtpForm({
        smtpHost: (smtpData as any).smtpHost ?? '',
        smtpPort: (smtpData as any).smtpPort ?? 587,
        smtpUser: (smtpData as any).smtpUser ?? '',
        smtpPass: '',
        smtpFrom: (smtpData as any).smtpFrom ?? '',
        imapHost: (smtpData as any).imapHost ?? '',
        imapPort: (smtpData as any).imapPort ?? 993,
      });
      setSmtpHasPass(!!(smtpData as any).smtpHasPass);
      if (!(smtpData as any).smtpHost) setSmtpEditing(true);
      setSmtpInit(true);
    }
  }, [smtpData, smtpInit]);
  const handleSmtpChange = (field: string, value: string | number) => {
    setSmtpForm(prev => ({ ...prev, [field]: value }));
  };
  // SMTP form validation — per-field errors (same style as Register form)
  const [smtpErrors, setSmtpErrors] = useState<Record<string, string>>({});
  const validateSmtp = (): boolean => {
    const errs: Record<string, string> = {};
    if (!smtpForm.smtpHost.trim()) errs.smtpHost = t('settings.smtpHostRequired', 'SMTP Host is required');
    if (!smtpForm.smtpUser.trim()) errs.smtpUser = t('settings.smtpUserRequired', 'Username is required');
    if (!smtpForm.smtpPass.trim() && !smtpHasPass) errs.smtpPass = t('settings.smtpPassRequired', 'Password is required');
    if (!smtpForm.imapHost.trim()) errs.imapHost = t('settings.imapHostRequired', 'IMAP Host is required');
    setSmtpErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCancelSmtp = () => {
    if (smtpData) {
      setSmtpForm({
        smtpHost: (smtpData as any).smtpHost ?? '',
        smtpPort: (smtpData as any).smtpPort ?? 587,
        smtpUser: (smtpData as any).smtpUser ?? '',
        smtpPass: '',
        smtpFrom: (smtpData as any).smtpFrom ?? '',
        imapHost: (smtpData as any).imapHost ?? '',
        imapPort: (smtpData as any).imapPort ?? 993,
      });
    }
    setSmtpErrors({});
    setSmtpEditing(false);
    setShowSmtpPass(false);
  };

  const handleSaveSmtp = async () => {
    if (!validateSmtp()) return;
    try {
      await updateSmtp.mutateAsync(smtpForm);
      setSmtpFeedback(t('settings.smtpSaved'));
      setSmtpEditing(false);
      setShowSmtpPass(false);
      if (smtpForm.smtpPass) setSmtpHasPass(true);
    } catch {
      setSmtpFeedback(t('settings.smtpSaveFailed'));
    }
    setTimeout(() => setSmtpFeedback(null), 3000);
  };

  // SMTP / IMAP test connection
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);
  const [smtpTestColor, setSmtpTestColor] = useState<string>('inherit');
  const handleTestSmtp = async () => {
    if (!validateSmtp()) return;
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await emailSettingsApi.testConnection();
      const d = (res as any).data ?? res;
      const parts: string[] = [];
      parts.push(`SMTP: ${d.smtp === 'ok' ? '✓' : '✗ ' + (d.smtpError || 'fail')}`);
      if (d.imap !== 'skip') parts.push(`IMAP: ${d.imap === 'ok' ? '✓' : '✗ ' + (d.imapError || 'fail')}`);
      const allOk = d.smtp === 'ok' && (d.imap === 'ok' || d.imap === 'skip');
      setSmtpTestColor(allOk ? theme.strong.olive : theme.strong.mauve);
      setSmtpTestResult(allOk ? t('settings.smtpTestSuccess', 'Test passed') + ' — ' + parts.join(' / ') : t('settings.smtpTestFail', 'Test failed') + ' — ' + parts.join(' / '));
    } catch (e: any) {
      setSmtpTestColor(theme.strong.mauve);
      setSmtpTestResult(t('settings.smtpTestFail', 'Test failed') + ': ' + (e?.message || ''));
    }
    setSmtpTesting(false);
    setTimeout(() => setSmtpTestResult(null), 8000);
  };

  // Notification preferences (per-user)
  const { data: notifPrefs, isLoading: notifLoading } = useNotificationPrefs();
  const updateNotif = useUpdateNotificationPrefs();
  const [notifEmail, setNotifEmail] = useState('');
  const [notifEmailInit, setNotifEmailInit] = useState(false);
  useEffect(() => {
    if (notifPrefs && !notifEmailInit) {
      setNotifEmail(notifPrefs.notification_email || '');
      setNotifEmailInit(true);
    }
  }, [notifPrefs, notifEmailInit]);

  const ipDirty = agentIpDraft !== agentIp;

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await settingsApi.update({ settings: { agent_ip_address: agentIpDraft.trim() } });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setFeedback(t('settings.updated'));
    } catch {
      setFeedback(t('settings.updateFailed'));
    } finally {
      setBusy(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDiscard = () => setAgentIpDraft(agentIp);

  const concurrencyDirty = AGENT_STAGES.some(s => concurrencyDraft[s.key] !== concurrency[s.key]);
  const concurrencyValid = AGENT_STAGES.every(s => {
    const n = concurrencyDraft[s.key];
    return Number.isInteger(n) && n >= CONCURRENCY_MIN && n <= CONCURRENCY_MAX;
  });

  const handleSaveConcurrency = async () => {
    if (concurrencyBusy || !concurrencyValid) return;
    setConcurrencyBusy(true);
    setConcurrencyFeedback(null);
    try {
      await settingsApi.update({ settings: { agent_concurrency: concurrencyDraft } });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setConcurrencyFeedback(t('settings.updated'));
    } catch {
      setConcurrencyFeedback(t('settings.updateFailed'));
    } finally {
      setConcurrencyBusy(false);
      setTimeout(() => setConcurrencyFeedback(null), 3000);
    }
  };

  // Save scoring rules
  const handleSaveScoring = async () => {
    if (scoringBusy) return;
    setScoringBusy(true);
    setScoringFeedback(null);
    try {
      const rules = {
        tone: scoringTone,
        minLength: scoringMinLength,
        maxLength: scoringMaxLength,
        requiredPoints: scoringRequiredPoints.trim(),
        customInstructions: scoringCustomInstructions.trim(),
        dimensions: scoringDimensions,
      };
      await settingsApi.update({ settings: { email_scoring_rules: JSON.stringify(rules) } });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setScoringFeedback(t('settings.scoringSaved'));
    } catch {
      setScoringFeedback(t('settings.scoringSaveFailed'));
    } finally {
      setScoringBusy(false);
      setTimeout(() => setScoringFeedback(null), 3000);
    }
  };

  /* ── Build visible tabs ── */
  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [];
  if (isAdmin) {
    // Device IP 同並行度都係 admin-only 嘅 agent runtime 設定，合併成一個 tab
    tabs.push({ key: 'agent', label: t('settings.agentTab'), icon: <NetworkIcon /> });
  }
  tabs.push({ key: 'notifications', label: t('settings.notifications'), icon: <BellIcon /> });
  tabs.push({ key: 'follow-up', label: t('settings.followUpSettings'), icon: <RepeatIcon /> });
  tabs.push({ key: 'auto-send', label: t('settings.autoSendRules'), icon: <ZapIcon /> });
  tabs.push({ key: 'email-scoring', label: t('settings.emailScoringRules'), icon: <StarIcon /> });
  tabs.push({ key: 'email-smtp', label: t('settings.smtpTab'), icon: <EmailSmtpIcon /> });
  if (hasOther) {
    tabs.push({ key: 'other', label: t('settings.currentConfig'), icon: <SlidersIcon /> });
  }

  return (
    <Page>
      <PageCard>
      {/* ── Header ── */}
      <HeroBody>
        <HeroAvatar><SettingsGearIcon /></HeroAvatar>
        <HeroInfo>
          <HeroName>{t('settings.title')}</HeroName>
          {/* 頁面級副標題，唔應該綁死某一個 tab（原本寫死 agentIpHint） */}
          <HeroSub>{t('settings.subtitle')}</HeroSub>
        </HeroInfo>
      </HeroBody>

      {/* ── Left tabs + Right content ── */}
      <SettingsLayout>
        <TabNav>
          {tabs.map((tb) => (
            <TabItem key={tb.key} $active={tab === tb.key} onClick={() => setTab(tb.key)}>
              <TabIcon>{tb.icon}</TabIcon>
              {tb.label}
            </TabItem>
          ))}
        </TabNav>

        <ContentPanel>
          {/* ── Agent IP ── */}
          {tab === 'agent' && (
            <>
              <ContentHeader><h2>{t('settings.agentTab')}</h2></ContentHeader>
              <ContentBody>
                {isLoading ? (
                  <EmptyText>{t('settings.loadingSettings')}</EmptyText>
                ) : (
                  <>
                    <SectionTitle>{t('settings.agentIpAddress')}</SectionTitle>
                    <FormGroup>
                      <Label htmlFor="agent-ip">{t('settings.agentIpAddress')}</Label>
                      <Input
                        id="agent-ip"
                        type="text"
                        value={agentIpDraft}
                        onChange={(e) => setAgentIpDraft(e.target.value)}
                        placeholder={t('settings.agentIpPlaceholder')}
                        autoComplete="off"
                      />
                      <FormHint>{t('settings.agentIpHint')}</FormHint>
                    </FormGroup>

                    {feedback && <FormHint style={{ color: feedback === t('settings.updated') ? theme.strong.olive : theme.strong.mauve }}>{feedback}</FormHint>}

                    <BtnRow>
                      <SaveBtn onClick={handleSave} disabled={busy || isLoading || !ipDirty}>
                        {busy ? t('settings.updating') : t('settings.save')}
                      </SaveBtn>
                      {ipDirty && <DiscardBtn onClick={handleDiscard}>{t('userInfo.discard')}</DiscardBtn>}
                    </BtnRow>

                    <SectionTitle>{t('settings.concurrencyTab')}</SectionTitle>
                    <DefaultBanner>{t('settings.concurrencyDesc')}</DefaultBanner>

                    {AGENT_STAGES.map(stage => {
                      const value = concurrencyDraft[stage.key];
                      const invalid = !Number.isInteger(value) || value < CONCURRENCY_MIN || value > CONCURRENCY_MAX;
                      return (
                        <FormGroup key={stage.key}>
                          <Label htmlFor={`concurrency-${stage.key}`}>{t(stage.labelKey)}</Label>
                          <Input
                            id={`concurrency-${stage.key}`}
                            type="number"
                            min={CONCURRENCY_MIN}
                            max={CONCURRENCY_MAX}
                            step={1}
                            $error={invalid}
                            value={Number.isFinite(value) ? value : ''}
                            onChange={(e) => {
                              const n = e.target.value === '' ? NaN : Number(e.target.value);
                              setConcurrencyDraft(prev => ({ ...prev, [stage.key]: n }));
                            }}
                          />
                          <FormHint>{t(stage.hintKey)}</FormHint>
                        </FormGroup>
                      );
                    })}

                    {!concurrencyValid && (
                      <FormHint style={{ color: theme.strong.mauve }}>
                        {t('settings.concurrencyRange', { min: CONCURRENCY_MIN, max: CONCURRENCY_MAX })}
                      </FormHint>
                    )}
                    <FormHint>{t('settings.concurrencyApplyHint')}</FormHint>

                    {concurrencyFeedback && (
                      <FormHint style={{ color: concurrencyFeedback === t('settings.updated') ? theme.strong.olive : theme.strong.mauve }}>
                        {concurrencyFeedback}
                      </FormHint>
                    )}

                    <BtnRow>
                      <SaveBtn onClick={handleSaveConcurrency} disabled={concurrencyBusy || !concurrencyDirty || !concurrencyValid}>
                        {concurrencyBusy ? t('settings.updating') : t('settings.save')}
                      </SaveBtn>
                      {concurrencyDirty && (
                        <DiscardBtn onClick={() => setConcurrencyDraft(concurrency)}>{t('userInfo.discard')}</DiscardBtn>
                      )}
                    </BtnRow>
                  </>
                )}
              </ContentBody>
            </>
          )}

          {/* ── Notifications ── */}
          {tab === 'notifications' && (
            <>
              <ContentHeader><h2>{t('settings.notifications')}</h2></ContentHeader>
              <ContentBody>
                {notifLoading ? (
                  <EmptyText>{t('settings.loadingSettings')}</EmptyText>
                ) : (
                  <>
                    <SettingRow>
                      <div>
                        <SettingKey>{t('settings.emailOnComplete')}</SettingKey>
                        <FormHint style={{ display: 'block', marginTop: 2 }}>{t('settings.emailOnCompleteHint')}</FormHint>
                      </div>
                      <ToggleSwitch
                        on={notifPrefs?.email_on_complete ?? false}
                        onChange={(v) => updateNotif.mutate({ email_on_complete: v })}
                        disabled={updateNotif.isPending}
                      />
                    </SettingRow>
                    <SettingRow>
                      <div>
                        <SettingKey>{t('settings.browserNotification')}</SettingKey>
                        <FormHint style={{ display: 'block', marginTop: 2 }}>{t('settings.browserNotificationHint')}</FormHint>
                      </div>
                      <ToggleSwitch
                        on={notifPrefs?.browser_on_complete ?? false}
                        onChange={(v) => updateNotif.mutate({ browser_on_complete: v })}
                        disabled={updateNotif.isPending}
                      />
                    </SettingRow>
                    <SettingRow style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                      <div>
                        <SettingKey>{t('settings.notificationEmail')}</SettingKey>
                        <FormHint style={{ display: 'block', marginTop: 2 }}>{t('settings.notificationEmailHint')}</FormHint>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="email"
                          placeholder={t('settings.notificationEmailPlaceholder')}
                          value={notifEmail}
                          onChange={e => setNotifEmail(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: '0.875rem',
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.radii.badge,
                            background: theme.colors.surface,
                            color: theme.colors.textPrimary,
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={() => updateNotif.mutate({ notification_email: notifEmail.trim() })}
                          disabled={updateNotif.isPending || notifEmail === (notifPrefs?.notification_email || '')}
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: theme.radii.badge,
                            background: notifEmail !== (notifPrefs?.notification_email || '') ? theme.colors.accent : theme.colors.surfaceMuted,
                            color: notifEmail !== (notifPrefs?.notification_email || '') ? '#fff' : theme.colors.textTertiary,
                            cursor: notifEmail !== (notifPrefs?.notification_email || '') ? 'pointer' : 'default',
                          }}
                        >
                          {t('settings.save')}
                        </button>
                      </div>
                    </SettingRow>
                  </>
                )}
              </ContentBody>
            </>
          )}

          {/* ── Follow-up ── */}
          {tab === 'follow-up' && (
            <>
              <ContentHeader><h2>{t('settings.followUpSettings')}</h2></ContentHeader>
              <ContentBody>
                <SettingRow>
                  <div>
                    <SettingKey>{t('settings.followUpEnabled')}</SettingKey>
                    <FormHint style={{ display: 'block', marginTop: 2 }}>{t('settings.followUpEnabledHint')}</FormHint>
                  </div>
                  <ToggleSwitch on={followUpEnabled} onChange={setFollowUpEnabled} />
                </SettingRow>
                <FormGroup>
                  <Label>{t('settings.followUpDays')}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={followUpDays}
                    onChange={e => setFollowUpDays(Number(e.target.value))}
                    disabled={!followUpEnabled}
                  />
                  <FormHint>{t('settings.followUpDaysHint')}</FormHint>
                </FormGroup>
                <FormGroup>
                  <Label>{t('settings.followUpMaxAttempts')}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={followUpMaxAttempts}
                    onChange={e => setFollowUpMaxAttempts(Number(e.target.value))}
                    disabled={!followUpEnabled}
                  />
                  <FormHint>{t('settings.followUpMaxAttemptsHint')}</FormHint>
                </FormGroup>
                <BtnRow>
                  <SaveBtn disabled>{t('settings.save')}</SaveBtn>
                </BtnRow>
              </ContentBody>
            </>
          )}

          {/* ── Auto-send ── */}
          {tab === 'auto-send' && (
            <>
              <ContentHeader><h2>{t('settings.autoSendRules')}</h2></ContentHeader>
              <ContentBody>
                <SettingRow>
                  <div>
                    <SettingKey>{t('settings.autoSendEnabled')}</SettingKey>
                    <FormHint style={{ display: 'block', marginTop: 2 }}>{t('settings.autoSendEnabledHint')}</FormHint>
                  </div>
                  <ToggleSwitch on={autoSendEnabled} onChange={setAutoSendEnabled} />
                </SettingRow>
                <FormGroup>
                  <Label>{t('settings.autoSendMinScore')}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={autoSendMinScore}
                    onChange={e => setAutoSendMinScore(Number(e.target.value))}
                    disabled={!autoSendEnabled}
                  />
                  <FormHint>{t('settings.autoSendMinScoreHint')}</FormHint>
                </FormGroup>
                <FormGroup>
                  <Label>{t('settings.autoSendMaxPerDay')}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={autoSendMaxPerDay}
                    onChange={e => setAutoSendMaxPerDay(Number(e.target.value))}
                    disabled={!autoSendEnabled}
                  />
                  <FormHint>{t('settings.autoSendMaxPerDayHint')}</FormHint>
                </FormGroup>
                <SettingRow>
                  <div>
                    <SettingKey>{t('settings.autoSendRequireVerified')}</SettingKey>
                    <FormHint style={{ display: 'block', marginTop: 2 }}>{t('settings.autoSendRequireVerifiedHint')}</FormHint>
                  </div>
                  <ToggleSwitch
                    on={autoSendRequireVerified}
                    onChange={setAutoSendRequireVerified}
                    disabled={!autoSendEnabled}
                  />
                </SettingRow>
                <BtnRow>
                  <SaveBtn disabled>{t('settings.save')}</SaveBtn>
                </BtnRow>
              </ContentBody>
            </>
          )}

          {/* ── Email Scoring Rules ── */}
          {tab === 'email-scoring' && (
            <>
              <ContentHeader><h2>{t('settings.emailScoringRules')}</h2></ContentHeader>
              <ContentBody>
                {/* Preview Card */}
                <PreviewCard>
                  <PreviewHeader>
                    <StarIcon />
                    {t('settings.scoringPreviewTitle')}
                  </PreviewHeader>
                  <PreviewBody>
                    <PreviewRow>
                      <PreviewLabel>{t('settings.scoringPreviewTone')}</PreviewLabel>
                      <PreviewValue>{t(`settings.tone${scoringTone.charAt(0).toUpperCase() + scoringTone.slice(1)}`)}</PreviewValue>
                    </PreviewRow>
                    <PreviewRow>
                      <PreviewLabel>{t('settings.scoringPreviewWordRange')}</PreviewLabel>
                      <PreviewValue>{scoringMinLength} – {scoringMaxLength}</PreviewValue>
                    </PreviewRow>
                    <PreviewRow>
                      <PreviewLabel>{t('settings.scoringPreviewPoints')}</PreviewLabel>
                      <PreviewValue>{scoringRequiredPoints || t('settings.scoringPreviewNoPoints')}</PreviewValue>
                    </PreviewRow>
                    <PreviewRow>
                      <PreviewLabel>{t('settings.scoringPreviewCustom')}</PreviewLabel>
                      <PreviewValue style={{ fontSize: '0.75rem' }}>{scoringCustomInstructions || t('settings.scoringPreviewNoCustom')}</PreviewValue>
                    </PreviewRow>
                    <PreviewRow style={{ flexDirection: 'column', gap: 4 }}>
                      <PreviewLabel>{t('settings.scoringPreviewDimensions')}</PreviewLabel>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {scoringDimensions.map(d => (
                          <span key={d.key} style={{
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            background: `${theme.colors.accent}18`,
                            color: theme.colors.accent,
                          }}>
                            {d.label} {d.weight}%
                          </span>
                        ))}
                      </div>
                    </PreviewRow>
                  </PreviewBody>
                </PreviewCard>

                <DefaultBanner>{t('settings.emailScoringDesc')}</DefaultBanner>
                <FormGroup>
                  <Label>{t('settings.scoringTone')}</Label>
                  <Select value={scoringTone} onChange={e => setScoringTone(e.target.value)}>
                    <option value="professional">{t('settings.toneProfessional')}</option>
                    <option value="friendly">{t('settings.toneFriendly')}</option>
                    <option value="casual">{t('settings.toneCasual')}</option>
                    <option value="formal">{t('settings.toneFormal')}</option>
                  </Select>
                  <FormHint>{t('settings.scoringToneHint')}</FormHint>
                </FormGroup>
                <FormGroup>
                  <Label>{t('settings.scoringMinLength')}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={scoringMinLength}
                    onChange={e => setScoringMinLength(Number(e.target.value))}
                  />
                  <FormHint>{t('settings.scoringMinLengthHint')}</FormHint>
                </FormGroup>
                <FormGroup>
                  <Label>{t('settings.scoringMaxLength')}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={2000}
                    value={scoringMaxLength}
                    onChange={e => setScoringMaxLength(Number(e.target.value))}
                  />
                  <FormHint>{t('settings.scoringMaxLengthHint')}</FormHint>
                </FormGroup>
                <FormGroup>
                  <Label>{t('settings.scoringRequiredPoints')}</Label>
                  <Input
                    type="text"
                    value={scoringRequiredPoints}
                    onChange={e => setScoringRequiredPoints(e.target.value)}
                    placeholder={t('settings.scoringRequiredPointsPlaceholder')}
                  />
                  <FormHint>{t('settings.scoringRequiredPointsHint')}</FormHint>
                </FormGroup>
                <FormGroup>
                  <Label>{t('settings.scoringCustomInstructions')}</Label>
                  <Textarea
                    value={scoringCustomInstructions}
                    onChange={e => setScoringCustomInstructions(e.target.value)}
                    placeholder={t('settings.scoringCustomInstructionsPlaceholder')}
                  />
                  <FormHint>{t('settings.scoringCustomInstructionsHint')}</FormHint>
                </FormGroup>

                {/* Dimension Weights */}
                <FormGroup>
                  <Label>{t('settings.scoringDimensions')}</Label>
                  <FormHint>{t('settings.scoringDimensionsDesc')}</FormHint>
                  {scoringDimensions.map(d => (
                    <DimRow key={d.key}>
                      <DimLabel>{d.label}</DimLabel>
                      <DimSlider
                        type="range"
                        min={0}
                        max={50}
                        step={5}
                        value={d.weight}
                        onChange={e => updateDimWeight(d.key, Number(e.target.value))}
                      />
                      <DimWeight $warn={!dimTotalOk}>{d.weight}%</DimWeight>
                    </DimRow>
                  ))}
                  <DimTotalRow $ok={dimTotalOk}>
                    <span>{t('settings.dimensionWeightTotal')}: {dimTotal}%</span>
                    {!dimTotalOk && <span>⚠ {t('settings.dimensionWeightWarning')}</span>}
                  </DimTotalRow>
                </FormGroup>

                {scoringFeedback && (
                  <FormHint style={{ color: scoringFeedback === t('settings.scoringSaved') ? theme.strong.olive : theme.strong.mauve }}>
                    {scoringFeedback}
                  </FormHint>
                )}

                <BtnRow>
                  <SaveBtn onClick={handleSaveScoring} disabled={scoringBusy || !dimTotalOk}>
                    {scoringBusy ? t('settings.updating') : t('settings.save')}
                  </SaveBtn>
                </BtnRow>
              </ContentBody>
            </>
          )}

          {/* ── Email: see /docs/uat-deployment-runbook.md. Per-user Gmail OAuth
              is handled by <EmailConnectionSection/> (re-exported for use in
              prompts/chips/modals — see EmailConnectionSection.tsx). The
              shared .env SMTP fallback is configured at backend boot,
              not in the UI. ── */}

          {/* ── WhatsApp Templates ── */}
          {/* ── Email SMTP ── */}
          {tab === 'email-smtp' && (
            <>
              <ContentHeader><h2>{t('settings.smtpTitle')}</h2></ContentHeader>
              <ContentBody>
                {smtpLoading ? (
                  <EmptyText>{t('settings.loadingSettings')}</EmptyText>
                ) : (
                  <>
                    <DefaultBanner>{t('settings.smtpDesc')}</DefaultBanner>

                    <SectionTitle><IconSend />{t('settings.smtpSection')}</SectionTitle>
                    <FormGroup>
                      <Label>{t('settings.smtpHost')} *</Label>
                      <Input $error={!!smtpErrors.smtpHost} disabled={!smtpEditing} value={smtpForm.smtpHost} onChange={e => { handleSmtpChange('smtpHost', e.target.value); setSmtpErrors(prev => { const n = { ...prev }; delete n.smtpHost; return n; }); }} placeholder="smtp.gmail.com" />
                      {smtpErrors.smtpHost && <FieldErrorHint><InfoCircle /> {smtpErrors.smtpHost}</FieldErrorHint>}
                    </FormGroup>
                    <FormGroup>
                      <Label>{t('settings.smtpPort')}</Label>
                      <Input type="number" disabled={!smtpEditing} value={smtpForm.smtpPort} onChange={e => handleSmtpChange('smtpPort', Number(e.target.value))} placeholder="587" />
                    </FormGroup>
                    <FormGroup>
                      <Label>{t('settings.smtpUser')} *</Label>
                      <Input $error={!!smtpErrors.smtpUser} disabled={!smtpEditing} value={smtpForm.smtpUser} onChange={e => { handleSmtpChange('smtpUser', e.target.value); setSmtpErrors(prev => { const n = { ...prev }; delete n.smtpUser; return n; }); }} placeholder="you@gmail.com" />
                      {smtpErrors.smtpUser && <FieldErrorHint><InfoCircle /> {smtpErrors.smtpUser}</FieldErrorHint>}
                    </FormGroup>
                    <FormGroup>
                      <Label>{t('settings.smtpPass')} *</Label>
                      <PasswordWrap>
                        {showSmtpPass ? (
                          <Input $error={!!smtpErrors.smtpPass} disabled={!smtpEditing} type="text" autoComplete="off" value={smtpForm.smtpPass} onChange={e => { handleSmtpChange('smtpPass', e.target.value); setSmtpErrors(prev => { const n = { ...prev }; delete n.smtpPass; return n; }); }} placeholder={smtpHasPass && !smtpForm.smtpPass ? t('settings.smtpPassSet') : t('settings.smtpPassPlaceholder')} style={{ paddingRight: 40 }} />
                        ) : (
                          <Input $error={!!smtpErrors.smtpPass} disabled={!smtpEditing} type="password" autoComplete="new-password" value={smtpForm.smtpPass} onChange={e => { handleSmtpChange('smtpPass', e.target.value); setSmtpErrors(prev => { const n = { ...prev }; delete n.smtpPass; return n; }); }} placeholder={smtpHasPass && !smtpForm.smtpPass ? t('settings.smtpPassSet') : t('settings.smtpPassPlaceholder')} style={{ paddingRight: 40 }} />
                        )}
                        <PasswordToggle type="button" onClick={() => setShowSmtpPass(v => !v)} title={showSmtpPass ? 'Hide' : 'Show'}>
                          {showSmtpPass ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </PasswordToggle>
                      </PasswordWrap>
                      {smtpErrors.smtpPass && <FieldErrorHint><InfoCircle /> {smtpErrors.smtpPass}</FieldErrorHint>}
                    </FormGroup>
                    <FormGroup>
                      <Label>{t('settings.smtpFrom')}</Label>
                      <Input disabled={!smtpEditing} value={smtpForm.smtpFrom} onChange={e => handleSmtpChange('smtpFrom', e.target.value)} placeholder="Your Name <you@gmail.com>" />
                      <FormHint>{t('settings.smtpFromHint', 'Format: Your Name <email@example.com>. Leave empty to use SMTP username.')}</FormHint>
                    </FormGroup>

                    <SectionTitle style={{ marginTop: 16 }}><IconInbox />{t('settings.imapSection')}</SectionTitle>
                    <FormGroup>
                      <Label>{t('settings.imapHost')} *</Label>
                      <Input $error={!!smtpErrors.imapHost} disabled={!smtpEditing} value={smtpForm.imapHost} onChange={e => { handleSmtpChange('imapHost', e.target.value); setSmtpErrors(prev => { const n = { ...prev }; delete n.imapHost; return n; }); }} placeholder="imap.gmail.com" />
                      {smtpErrors.imapHost && <FieldErrorHint><InfoCircle /> {smtpErrors.imapHost}</FieldErrorHint>}
                    </FormGroup>
                    <FormGroup>
                      <Label>{t('settings.imapPort')}</Label>
                      <Input type="number" disabled={!smtpEditing} value={smtpForm.imapPort} onChange={e => handleSmtpChange('imapPort', Number(e.target.value))} placeholder="993" />
                    </FormGroup>

                    {smtpFeedback && (
                      <FormHint style={{ color: smtpFeedback === t('settings.smtpSaved') ? theme.strong.olive : theme.strong.mauve }}>
                        {smtpFeedback}
                      </FormHint>
                    )}

                    {smtpTestResult && (
                      <FormHint style={{ color: smtpTestColor }}>
                        {smtpTestResult}
                      </FormHint>
                    )}

                    <BtnRow>
                      {smtpEditing ? (
                        <>
                          <SaveBtn onClick={handleSaveSmtp} disabled={updateSmtp.isPending}>
                            {updateSmtp.isPending ? t('settings.updating') : t('settings.save')}
                          </SaveBtn>
                          <SaveBtn onClick={handleCancelSmtp} style={{ background: 'transparent', color: theme.colors.textSecondary, border: `1px solid ${theme.colors.border}` }}>
                            {t('settings.cancel')}
                          </SaveBtn>
                        </>
                      ) : (
                        <SaveBtn onClick={() => setSmtpEditing(true)}>
                          {t('settings.edit')}
                        </SaveBtn>
                      )}
                      <SaveBtn onClick={handleTestSmtp} disabled={smtpTesting} style={{ background: 'transparent', color: theme.colors.accent, border: `1px solid ${theme.colors.accent}` }}>
                        {smtpTesting ? t('settings.smtpTesting', 'Testing...') : t('settings.smtpTestBtn', 'Test Connection')}
                      </SaveBtn>
                    </BtnRow>
                  </>
                )}
              </ContentBody>
            </>
          )}

          {/* ── Other config ── */}
          {tab === 'other' && hasOther && (
            <>
              <ContentHeader><h2>{t('settings.currentConfig')}</h2></ContentHeader>
              <ContentBody>
                {entries.map(([key, val]) => (
                  <SettingRow key={key}>
                    <SettingKey>{humanKey(key)}</SettingKey>
                    {typeof val === 'boolean' ? (
                      <ToggleSwitch on={val} disabled />
                    ) : (
                      <SettingValue>{renderValue(val, t)}</SettingValue>
                    )}
                  </SettingRow>
                ))}
              </ContentBody>
            </>
          )}
        </ContentPanel>
      </SettingsLayout>
      </PageCard>
    </Page>
  );
};

export default Settings;
