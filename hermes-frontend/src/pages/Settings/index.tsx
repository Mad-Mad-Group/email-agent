import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { media } from '../../styles/media';
import { useSettings } from '../../api/hooks';
import { settingsApi } from '../../api/services';

/* ══════════════════════════════════════
   CMS Settings — LUNO-style UI
   ══════════════════════════════════════ */

/* ── Layout primitives ── */

const Page = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.md}px;`;

const Breadcrumb = styled.ol`
  list-style: none; margin: 0; padding: 0; display: flex; gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before { content: '/'; margin-right: ${({ theme }) => theme.spacing.sm}px; }
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; }
`;

const ToolbarRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
`;

const PageTitle = styled.h1`
  font-size: 1.15rem; font-weight: 600; margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PageSub = styled.small`
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

/* ── Card ── */

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const CardHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  h2 { margin: 0; font-size: 1rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const CardBody = styled.div`
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  display: flex; flex-direction: column; gap: 0;
  ${media.mobile} { padding: ${({ theme }) => theme.spacing.md}px; }
`;

/* ── Settings rows ── */

const SettingRow = styled.div`
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md}px;
  padding: ${({ theme }) => theme.spacing.sm}px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
  ${media.mobile} { flex-direction: column; gap: ${({ theme }) => theme.spacing.xs}px; }
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

/* ── Form elements ── */

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px;
  padding: ${({ theme }) => theme.spacing.sm}px 0;
`;

const FormLabel = styled.label`
  font-size: 0.8125rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FormHint = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const FormInput = styled.input`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  outline: none;
  transition: border-color 0.2s;
  max-width: 360px;
  &:focus { border-color: ${({ theme }) => theme.colors.blue}; }
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
  ${media.mobile} { max-width: 100%; }
`;

/* ── States ── */

const EmptyText = styled.p`
  font-size: 0.875rem; color: ${({ theme }) => theme.colors.textTertiary};
  padding: ${({ theme }) => theme.spacing.xl}px 0; text-align: center; margin: 0;
`;

/* ── Card Footer ── */

const CardFooter = styled.div`
  display: flex; justify-content: flex-end; align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px ${({ theme }) => theme.spacing.lg}px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  ${media.mobile} { padding: ${({ theme }) => theme.spacing.md}px; }
`;

const FeedbackText = styled.span`
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
`;

const PrimaryBtn = styled.button`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.lg}px;
  border: none; border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.blue};
  color: #fff;
  font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.card};
  transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    opacity: 0.9;
  }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* ── Footer ── */

const Footer = styled.footer`
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; margin-left: ${({ theme }) => theme.spacing.md}px; }
  a:hover { text-decoration: underline; }
`;

/* ── Physical Toggle Switch ── */

const ToggleTrack = styled.label<{ $on: boolean }>`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  cursor: pointer;
  background: ${({ $on }) => $on
    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
    : 'linear-gradient(135deg, #cbd5e1, #94a3b8)'};
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
  background: linear-gradient(180deg, #fff 0%, #f1f5f9 100%);
  box-shadow:
    0 1px 3px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.8);
  transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  /* metallic highlight dot */
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

/** Extract a value from the settings array returned by GET /settings */
function extractSetting(data: unknown, key: string): string {
  if (!Array.isArray(data)) return '';
  const found = data.find((item: any) => item?.key === key);
  return found?.value != null ? String(found.value) : '';
}

/** Build display entries excluding managed keys (those with dedicated inputs) */
const MANAGED_KEYS = new Set(['agent_ip_address']);

function toDisplayEntries(data: unknown): [string, unknown][] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item: any) => item?.key && !MANAGED_KEYS.has(item.key))
    .map((item: any) => [item.key, item.value] as [string, unknown]);
}

/* ── Component ── */

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useSettings();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Agent IP local state
  const [agentIp, setAgentIp] = useState('');

  // Sync from server data
  useEffect(() => {
    if (data) setAgentIp(extractSetting(data, 'agent_ip_address'));
  }, [data]);

  const entries = toDisplayEntries(data);

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await settingsApi.update({ settings: { agent_ip_address: agentIp.trim() } });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setFeedback(t('settings.updated'));
    } catch {
      setFeedback(t('settings.updateFailed'));
    } finally {
      setBusy(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <Page>
      {/* Agent IP Card */}
      <Card>
        <CardHeader>
          <h2>{t('settings.agentIpAddress')}</h2>
        </CardHeader>

        <CardBody>
          {isLoading ? (
            <EmptyText>{t('settings.loadingSettings')}</EmptyText>
          ) : (
            <FormGroup>
              <FormLabel htmlFor="agent-ip">{t('settings.agentIpAddress')}</FormLabel>
              <FormInput
                id="agent-ip"
                type="text"
                value={agentIp}
                onChange={(e) => setAgentIp(e.target.value)}
                placeholder={t('settings.agentIpPlaceholder')}
              />
              <FormHint>{t('settings.agentIpHint')}</FormHint>
            </FormGroup>
          )}
        </CardBody>

        <CardFooter>
          {feedback && <FeedbackText>{feedback}</FeedbackText>}
          <PrimaryBtn onClick={handleSave} disabled={busy || isLoading}>
            {busy ? t('settings.updating') : t('settings.save')}
          </PrimaryBtn>
        </CardFooter>
      </Card>

      {/* Other Settings Card */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <h2>{t('settings.currentConfig')}</h2>
          </CardHeader>

          <CardBody>
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
          </CardBody>
        </Card>
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

export default Settings;
