import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
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
  background: #ffffff;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
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
  background: #2563eb;
  color: #fff;
  font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  box-shadow: 0 1px 2px rgba(15,23,42,0.08);
  transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    background: #3b82f6;
    box-shadow: 0 2px 8px rgba(15,23,42,0.1);
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

/* ── Component ── */

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useSettings();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const entries: [string, unknown][] =
    data && typeof data === 'object' && !Array.isArray(data)
      ? Object.entries(data as Record<string, unknown>)
      : [];

  const handleUpdate = async () => {
    if (busy || !data) return;
    setBusy(true);
    setFeedback(null);
    try {
      await settingsApi.update(data);
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
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <h2>{t('settings.currentConfig')}</h2>
        </CardHeader>

        <CardBody>
          {isLoading && <EmptyText>{t('settings.loadingSettings')}</EmptyText>}

          {!isLoading && entries.length === 0 && (
            <EmptyText>{t('settings.noSettings')}</EmptyText>
          )}

          {!isLoading && entries.map(([key, val]) => (
            <SettingRow key={key}>
              <SettingKey>{humanKey(key)}</SettingKey>
              <SettingValue>{renderValue(val, t)}</SettingValue>
            </SettingRow>
          ))}
        </CardBody>

        <CardFooter>
          {feedback && <FeedbackText>{feedback}</FeedbackText>}
          <PrimaryBtn onClick={handleUpdate} disabled={busy || isLoading}>
            {busy ? t('settings.updating') : t('settings.update')}
          </PrimaryBtn>
        </CardFooter>
      </Card>

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
