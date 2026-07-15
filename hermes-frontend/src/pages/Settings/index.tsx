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

const Page = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.md}px;`;

const PageCard = styled.div`
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: ${({ theme }) => theme.radii.card}px;
  padding: 24px;
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
  margin: 0; font-size: 1.25rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const HeroSub = styled.div`
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 2px;
`;

/* ── Settings Layout (LUNO: left tabs + right content) ── */

const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 0;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const TabNav = styled.div`
  border-radius: ${({ theme }) => theme.radii.card}px;
  overflow: hidden;
  align-self: start;
  border: 1px solid ${({ theme }) => theme.colors.border};
  ${media.mobile} {
    display: flex; flex-direction: row;
    border-radius: ${({ theme }) => theme.radii.card}px;
    margin-bottom: ${({ theme }) => theme.spacing.md}px;
  }
`;

const TabItem = styled.button<{ $active?: boolean }>`
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 14px 20px;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  color: ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.textSecondary};
  transition: color 0.15s, background 0.15s;
  text-align: left;
  position: relative;

  ${({ $active, theme }) => $active && css`
    background: ${theme.colors.accent}12;
    font-weight: 600;
    &::before {
      content: '';
      position: absolute;
      left: 0; top: 8px; bottom: 8px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: ${theme.colors.accent};
    }
  `}

  &:hover {
    color: ${({ theme }) => theme.colors.accent};
    background: ${({ theme }) => `${theme.colors.accent}0a`};
  }

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }

  ${media.mobile} {
    flex: 1;
    text-align: center;
    justify-content: center;
    padding: 12px 10px;
    & + & { border-top: none; border-left: 1px solid ${({ theme }) => theme.colors.border}; }
    ${({ $active }) => $active && css`
      &::before {
        left: 8px; right: 8px; top: auto; bottom: 0;
        width: auto; height: 3px;
        border-radius: 3px 3px 0 0;
      }
    `}
  }
`;

const TabIcon = styled.span`
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; flex-shrink: 0;
  ${media.mobile} { display: none; }
`;

const ContentPanel = styled.div`
  margin-left: ${({ theme }) => theme.spacing.md}px;
  min-width: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  ${media.mobile} { margin-left: 0; }
`;

const ContentHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  h2 { margin: 0; font-size: 1rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const ContentBody = styled.div`
  padding: ${({ theme }) => theme.spacing.lg}px;
  display: flex; flex-direction: column; gap: 20px;
  max-width: 640px;
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

const MANAGED_KEYS = new Set(['agent_ip_address']);

function toDisplayEntries(data: unknown): [string, unknown][] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item: any) => item?.key && !MANAGED_KEYS.has(item.key))
    .map((item: any) => [item.key, item.value] as [string, unknown]);
}

/* ── Tabs config ── */

type SettingsTab = 'agent-ip' | 'notifications' | 'other';

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

  // Sync from server data
  useEffect(() => {
    if (data) {
      const ip = extractSetting(data, 'agent_ip_address');
      setAgentIp(ip);
      setAgentIpDraft(ip);
    }
  }, [data]);

  const entries = toDisplayEntries(data);
  const hasOther = entries.length > 0;

  // Notification preferences (per-user)
  const { data: notifPrefs, isLoading: notifLoading } = useNotificationPrefs();
  const updateNotif = useUpdateNotificationPrefs();

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

  /* ── Build visible tabs ── */
  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'agent-ip', label: t('settings.agentIpAddress'), icon: <NetworkIcon /> },
    { key: 'notifications', label: t('settings.notifications'), icon: <BellIcon /> },
  ];
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
