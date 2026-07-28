import React from 'react';
import { useTranslation } from 'react-i18next';
import styled, { useTheme } from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

/* ══════════════════════════════════════
   EmailConnectionSection — Per-user Gmail OAuth2 connection panel.

   Lives under Settings → "Gmail Connection" tab. Lets each user connect
   their own Gmail so the system sends email *as* them, not from a
   single shared SMTP account.

   NO raw password is ever submitted to the backend. The whole flow is
   a Google OAuth consent screen; backend only ever sees an encrypted
   refresh token (AES-256-GCM, master key from REFRESH_TOKEN_KEY env).
   ══════════════════════════════════════ */

interface ConnectionStatus {
  linked: boolean;
  email: string | null;
  provider: string;
  lastRefreshedAt: string | null;
  scopes: string[];
}

const Section = styled.div`
  display: flex; flex-direction: column; gap: 14px;
  padding: 4px 0 16px;
`;
const StatusRow = styled.div`
  display: flex; align-items: center; gap: 10px;
  font-size: 0.92rem;
`;
const Indicator = styled.span<{ $color: 'green' | 'amber' | 'red' | 'gray' }>`
  width: 10px; height: 10px;
  border-radius: 50%;
  background: ${({ $color, theme }) =>
    $color === 'green' ? '#2e7d32' :
    $color === 'amber' ? '#f7b955' :
    $color === 'red'   ? '#c62828' :
    (theme.colors.surfaceMuted || '#888')};
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
  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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
  const query = useQuery<ConnectionStatus>({
    queryKey: ['email-connection'],
    queryFn: async () => (await client.get('/auth/google/status')).data.data,
  });

  const connect = useMutation({
    mutationFn: async () => {
      const returnTo = `${window.location.origin}/cms-settings?tab=gmail-connection`;
      const { data } = await client.post('/auth/google/start', { returnTo });
      return data.data as { url: string; state: string };
    },
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => (await client.post('/auth/google/revoke')).data,
    onSuccess: () => query.refetch(),
  });

  const testEmail = useMutation({
    mutationFn: async () => {
      const myEmail = (query.data?.email ?? window.location.href);
      const { data } = await client.post('/auth/google/test-email', { to: myEmail });
      return data;
    },
  });

  if (query.isLoading) return <Muted>{t('common.loading')}</Muted>;

  const status = query.data;

  if (!status || !status.linked) {
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
  }

  return (
    <Section>
      <StatusRow>
        <Indicator $color="green" />
        <strong>{t('settings.emailConnectedAs', { email: status.email })}</strong>
      </StatusRow>
      <Muted>
        {t('settings.emailProviderLabel')}: {status.provider}
        {status.lastRefreshedAt ? ` · ${t('settings.emailLastRefreshed', { date: new Date(status.lastRefreshedAt).toLocaleString() })}` : ''}
      </Muted>
      <ButtonRow>
        <Btn onClick={() => testEmail.mutate()} disabled={testEmail.isPending}>
          {testEmail.isPending ? t('common.loading') : t('settings.emailTestBtn')}
        </Btn>
        <Btn $variant="danger" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
          {disconnect.isPending ? t('common.loading') : t('settings.emailDisconnectBtn')}
        </Btn>
      </ButtonRow>
      {testEmail.isSuccess && (
        <Muted>✅ {t('settings.emailTestSent')}</Muted>
      )}
      {testEmail.error && (
        <Err>{t('settings.emailTestFailed', { error: (testEmail.error as Error).message })}</Err>
      )}
      {disconnect.isSuccess && (
        <Muted>{t('settings.emailRevokeSuccess')}</Muted>
      )}
      {disconnect.error && (
        <Err>{(disconnect.error as Error).message}</Err>
      )}
    </Section>
  );
};
