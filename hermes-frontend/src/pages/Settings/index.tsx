import React, { useEffect, useState } from 'react';
import styled, { css, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { media } from '../../styles/media';
import { glassSurface } from '../../styles/glassSurface';
import { useSettings, useNotificationPrefs, useUpdateNotificationPrefs } from '../../api/hooks';
import { settingsApi } from '../../api/services';

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

const Input = styled.input`
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
`;

const FormHint = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
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

const MANAGED_KEYS = new Set(['agent_ip_address', 'email_scoring_rules']);

function toDisplayEntries(data: unknown): [string, unknown][] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item: any) => item?.key && !MANAGED_KEYS.has(item.key))
    .map((item: any) => [item.key, item.value] as [string, unknown]);
}

/* ── Tabs config ── */

type SettingsTab = 'agent-ip' | 'notifications' | 'follow-up' | 'auto-send' | 'email-scoring' | 'other';

/* ── Component ── */

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data, isLoading } = useSettings();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [tab, setTab] = useState<SettingsTab>('agent-ip');

  // Agent IP local state
  const [agentIp, setAgentIp] = useState('');
  const [agentIpDraft, setAgentIpDraft] = useState('');

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
  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'agent-ip', label: t('settings.agentIpAddress'), icon: <NetworkIcon /> },
    { key: 'notifications', label: t('settings.notifications'), icon: <BellIcon /> },
  ];
  tabs.push({ key: 'follow-up', label: t('settings.followUpSettings'), icon: <RepeatIcon /> });
  tabs.push({ key: 'auto-send', label: t('settings.autoSendRules'), icon: <ZapIcon /> });
  tabs.push({ key: 'email-scoring', label: t('settings.emailScoringRules'), icon: <StarIcon /> });
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
          <HeroSub>{t('settings.agentIpHint')}</HeroSub>
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
          {tab === 'agent-ip' && (
            <>
              <ContentHeader><h2>{t('settings.agentIpAddress')}</h2></ContentHeader>
              <ContentBody>
                {isLoading ? (
                  <EmptyText>{t('settings.loadingSettings')}</EmptyText>
                ) : (
                  <>
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
