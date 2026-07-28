import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

/* ══════════════════════════════════════
   EmailConnectionSection — simplified.

   One user action: click "Connect" → Google OAuth consent screen →
   callback returns here. No password is ever typed into the form
   (Phase 1 = Gmail OAuth only; Outlook ready but disabled until
   MICROSOFT_CLIENT_ID env is set).

   For users who have not linked yet, and admin announcement / fallback
   flows, the shared .env SMTP under the separate 'email' tab continues
   to work. Worker doSend/doReplyCheck migration is a follow-up.
   ══════════════════════════════════════ */

interface ConnectionStatus {
  linked: boolean;
  provider: 'gmail' | 'outlook' | null;
  email: string | null;
  lastRefreshedAt: string | null;
}

const Section = styled.div`
  display: flex; flex-direction: column; gap: 14px;
  padding: 4px 0 16px;
`;
const StatusRow = styled.div`
  display: flex; align-items: center; gap: 10px;
  font-size: 0.92rem;
`;
const Indicator = styled.span<{ $color: 'green' | 'red' | 'gray' }>`
  width: 10px; height: 10px;
  border-radius: 50%;
  background: ${({ $color }) =>
    $color === 'green' ? '#2e7d32' :
    $color === 'red'   ? '#c62828' : '#888'};
  flex-shrink: 0;
`;
const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: 0.82rem;
`;
const ButtonRow = styled.div`
  display: flex; gap: 10px; flex-wrap: wrap;
`;
const Btn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radii.control}px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $variant, theme }) =>
    $variant === 'danger' ? 'transparent' : theme.colors.surface};
  color: ${({ $variant, theme }) =>
    $variant === 'danger' ? theme.colors.textSecondary : theme.colors.textPrimary};
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  &:hover:not(:disabled) { filter: brightness(0.95); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Err = styled.div`
  background: rgba(198, 40, 40, 0.08);
  color: #b71c1c;
  border: 1px solid rgba(198, 40, 40, 0.3);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
`;
const ScopeList = styled.ul`
  margin: 4px 0 0; padding-left: 18px;
  font-size: 0.82rem; color: ${({ theme }) => theme.colors.textSecondary};
  li { margin: 1px 0; }
`;

export const EmailConnectionSection: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const statusQ = useQuery<ConnectionStatus>({
    queryKey: ['email-connection'],
    queryFn: async () => (await client.get('/auth/email/status')).data.data,
  });

  const connect = useMutation({
    mutationFn: async () => {
      const returnTo = `${window.location.origin}/cms-settings?tab=myEmail`;
      // Provider is hard-coded 'gmail' for Phase 1.
      const { data } = await client.post('/auth/email/gmail/start', { returnTo });
      return data.data as { url: string; state: string };
    },
    onSuccess: ({ url }) => window.location.assign(url),
  });

  const disconnect = useMutation({
    mutationFn: async () => (await client.post('/auth/email/revoke')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-connection'] }),
  });

  const testEmail = useMutation({
    mutationFn: async () => {
      const to = statusQ.data?.email ?? '';
      const { data } = await client.post('/auth/email/test-email', { to });
      return data;
    },
  });

  if (statusQ.isLoading) return <Muted>{t('common.loading')}</Muted>;

  const status = statusQ.data;

  if (status?.linked) {
    return (
      <Section>
        <StatusRow>
          <Indicator $color="green" />
          <strong>{t('settings.emailConnectedAs', { email: status.email })}</strong>
        </StatusRow>
        <Muted>
          {t('settings.emailProviderLabel')}: {status.provider}
          {status.lastRefreshedAt
            ? ` · ${t('settings.emailLastRefreshed', { date: new Date(status.lastRefreshedAt).toLocaleString() })}`
            : ''}
        </Muted>
        <ButtonRow>
          <Btn onClick={() => testEmail.mutate()} disabled={testEmail.isPending}>
            {testEmail.isPending ? t('common.loading') : t('settings.emailTestBtn')}
          </Btn>
          <Btn $variant="danger" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
            {disconnect.isPending ? t('common.loading') : t('settings.emailDisconnectBtn')}
          </Btn>
        </ButtonRow>
        {testEmail.isSuccess && <Muted>✅ {t('settings.emailTestSent')}</Muted>}
        {testEmail.error && (
          <Err>{t('settings.emailTestFailed', { error: (testEmail.error as Error).message })}</Err>
        )}
        {disconnect.isSuccess && <Muted>{t('settings.emailRevokeSuccess')}</Muted>}
        {disconnect.error && <Err>{(disconnect.error as Error).message}</Err>}
      </Section>
    );
  }

  return (
    <Section>
      <StatusRow>
        <Indicator $color="gray" />
        <strong>{t('settings.emailNotConnected')}</strong>
      </StatusRow>
      <Muted>{t('settings.emailConnectHint')}</Muted>
      <ButtonRow>
        <Btn onClick={() => connect.mutate()} disabled={connect.isPending}>
          {connect.isPending ? t('common.loading') : t('settings.emailConnectBtn')}
        </Btn>
      </ButtonRow>
      {connect.error && (
        <Err>{(connect.error as Error).message ?? t('settings.emailConnectFailed')}</Err>
      )}
      <ScopeList>
        <li>{t('settings.emailScopeSend')}</li>
        <li>{t('settings.emailScopeRead')}</li>
        <li>{t('settings.emailScopeEmail')}</li>
      </ScopeList>
    </Section>
  );
};
