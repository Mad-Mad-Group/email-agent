import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';

/* ══════════════════════════════════════
   EmailConnectionSection — Per-user email connection.

   Unified for all email providers (Gmail, Outlook, Office365, Yahoo,
   Custom SMTP/IMAP). Each user connects ONE provider and the system
   sends/replies as that user. The shared .env SMTP (set in the org-wide
   'email' tab) remains the fallback for users who haven't linked yet.

   Auth modes:
   - oauth:    Google/Microsoft OAuth2 consent screen, refresh token stored
              (encrypted-at-rest). User never types a password.
   - password: Username + App Password (for Yahoo / Office365 basic auth /
              custom SMTP server). Password encrypted-at-rest (AES-256-GCM).
   ══════════════════════════════════════ */

interface Provider {
  id: 'gmail' | 'outlook' | 'office365' | 'yahoo' | 'custom';
  label: string;
  oauthSupported: boolean;
  defaultSmtp: { host: string; port: number; secure: boolean };
  defaultImap: { host: string; port: number };
}
interface ConnectionStatus {
  linked: boolean;
  provider: Provider['id'] | null;
  auth_mode: 'oauth' | 'password' | null;
  email: string | null;
  lastRefreshedAt: string | null;
  scopes: string[];
  smtp: { host: string; port: number; secure: boolean } | null;
  imap: { host: string; port: number } | null;
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
  &:hover:not(:disabled) { filter: brightness(0.95); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const Field = styled.div`
  display: flex; flex-direction: column; gap: 4px;
`;
const Label = styled.label`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;
const Input = styled.input`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  font: inherit;
  font-size: 0.875rem;
`;
const Select = styled.select`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  font: inherit;
  font-size: 0.875rem;
`;
const Err = styled.div`
  background: rgba(198, 40, 40, 0.08);
  color: #b71c1c;
  border: 1px solid rgba(198, 40, 40, 0.3);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
`;
const FormGrid = styled.form`
  display: flex; flex-direction: column; gap: 10px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceMuted}10;
`;
const ScopeList = styled.ul`
  margin: 4px 0 0; padding-left: 18px;
  font-size: 0.82rem; color: ${({ theme }) => theme.colors.textSecondary};
  li { margin: 1px 0; }
`;

export const EmailConnectionSection: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  /* ── data fetching ──────────────────────────────────────────── */

  const statusQ = useQuery<ConnectionStatus>({
    queryKey: ['email-connection'],
    queryFn: async () => (await client.get('/auth/email/status')).data.data,
  });

  const providersQ = useQuery<{ data: Provider[] }>({
    queryKey: ['email-providers'],
    queryFn: async () => (await client.get('/auth/email/providers')).data,
  });

  const providers = providersQ.data?.data ?? [];

  /* ── local form state ──────────────────────────────────────── */

  const [provider, setProvider] = useState<Provider['id']>('gmail');
  const [authMode, setAuthMode] = useState<'oauth' | 'password'>(
    () => (provider === 'gmail' || provider === 'outlook' ? 'oauth' : 'password'),
  );
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);

  const providerMeta = useMemo(
    () => providers.find((p) => p.id === provider),
    [providers, provider],
  );

  /* ── mutations ──────────────────────────────────────────────── */

  const connectOAuth = useMutation({
    mutationFn: async () => {
      const returnTo = `${window.location.origin}/cms-settings?tab=myEmail`;
      const { data } = await client.post(`/auth/email/${provider}/start`, { returnTo });
      return data.data as { url: string; state: string };
    },
    onSuccess: ({ url }) => window.location.assign(url),
  });

  const connectPassword = useMutation({
    mutationFn: async () => {
      const body = {
        provider,
        email_address: emailAddress,
        smtp_host: smtpHost || providerMeta?.defaultSmtp.host || '',
        smtp_port: smtpPort,
        smtp_secure: smtpPort === 465,
        smtp_username: smtpUsername || emailAddress,
        smtp_password: password,
        imap_host: imapHost || providerMeta?.defaultImap.host || '',
        imap_port: imapPort,
      };
      const { data } = await client.post('/auth/email/connect-password', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-connection'] });
      setPassword('');
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => (await client.post('/auth/email/revoke')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-connection'] }),
  });

  const testEmail = useMutation({
    mutationFn: async () => {
      const to = statusQ.data?.email ?? emailAddress ?? '';
      const { data } = await client.post('/auth/email/test-email', { to });
      return data;
    },
  });

  if (statusQ.isLoading || providersQ.isLoading) return <Muted>{t('common.loading')}</Muted>;

  const status = statusQ.data;

  /* ── linked state ───────────────────────────────────────────── */

  if (status?.linked) {
    return (
      <Section>
        <StatusRow>
          <Indicator $color="green" />
          <strong>{t('settings.emailConnectedAs', { email: status.email })}</strong>
        </StatusRow>
        <Muted>
          {t('settings.emailProviderLabel')}: {status.provider}
          {' · '}
          {t('settings.emailAuthModeLabel')}: {status.auth_mode}
          {status.lastRefreshedAt
            ? ` · ${t('settings.emailLastRefreshed', { date: new Date(status.lastRefreshedAt).toLocaleString() })}`
            : ''}
        </Muted>
        {status.smtp && (
          <Muted>SMTP: {status.smtp.host}:{status.smtp.port} ({status.smtp.secure ? 'TLS' : 'STARTTLS'})</Muted>
        )}
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

  /* ── unlinked state ─────────────────────────────────────────── */

  const oauthAvailable = providerMeta?.oauthSupported ?? false;
  const canSubmitPassword =
    emailAddress.trim().length > 0 &&
    password.length > 0 &&
    (provider !== 'custom' || (smtpHost.trim().length > 0 && imapHost.trim().length > 0));

  return (
    <Section>
      <StatusRow>
        <Indicator $color="gray" />
        <strong>{t('settings.emailNotConnected')}</strong>
      </StatusRow>
      <Muted>{t('settings.emailConnectHint')}</Muted>

      <Field>
        <Label>{t('settings.emailProviderLabel')}</Label>
        <Select
          value={provider}
          onChange={(e) => {
            const v = e.target.value as Provider['id'];
            setProvider(v);
            const meta = providers.find((p) => p.id === v);
            if (meta) {
              if (meta.oauthSupported) setAuthMode('oauth');
              else setAuthMode('password');
              setSmtpHost(meta.defaultSmtp.host);
              setSmtpPort(meta.defaultSmtp.port);
              setImapHost(meta.defaultImap.host);
              setImapPort(meta.defaultImap.port);
            }
          }}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.label}{p.oauthSupported ? '' : ' (App Password)'}</option>
          ))}
        </Select>
      </Field>

      {oauthAvailable ? (
        <>
          <ButtonRow>
            <Btn onClick={() => connectOAuth.mutate()} disabled={connectOAuth.isPending}>
              {connectOAuth.isPending ? t('common.loading') : t('settings.emailConnectBtn')}
            </Btn>
            <Btn onClick={() => setAuthMode('password')}>
              {t('settings.emailUsePasswordInstead')}
            </Btn>
          </ButtonRow>
          {authMode === 'oauth' && connectOAuth.error && (
            <Err>{(connectOAuth.error as Error).message}</Err>
          )}
          <ScopeList>
            <li>{t('settings.emailScopeSend')}</li>
            <li>{t('settings.emailScopeRead')}</li>
            <li>{t('settings.emailScopeEmail')}</li>
          </ScopeList>
        </>
      ) : (
        authMode === 'password'
      ) && (
        <FormGrid
          onSubmit={(e) => {
            e.preventDefault();
            connectPassword.mutate();
          }}
        >
          <Field>
            <Label>{t('settings.emailAddressLabel')}</Label>
            <Input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="alice@madmad.com"
              required
            />
          </Field>
          <Field>
            <Label>{t('settings.emailSmtpHostLabel')}</Label>
            <Input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="auto-filled; change for custom provider"
              disabled={provider !== 'custom'}
            />
          </Field>
          <Field>
            <Label>{t('settings.emailSmtpPortLabel')}</Label>
            <Input
              type="number"
              value={smtpPort}
              onChange={(e) => setSmtpPort(Number(e.target.value))}
              min={1}
              max={65535}
            />
          </Field>
          <Field>
            <Label>{t('settings.emailSmtpUsernameLabel')}</Label>
            <Input
              type="text"
              value={smtpUsername || emailAddress}
              onChange={(e) => setSmtpUsername(e.target.value)}
              placeholder={t('settings.emailSmtpUsernamePlaceholder')}
            />
          </Field>
          <Field>
            <Label>{t('settings.emailSmtpPasswordLabel')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              maxLength={256}
            />
          </Field>
          <Field>
            <Label>{t('settings.emailImapHostLabel')}</Label>
            <Input
              type="text"
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
              disabled={provider !== 'custom'}
            />
          </Field>
          <Field>
            <Label>{t('settings.emailImapPortLabel')}</Label>
            <Input
              type="number"
              value={imapPort}
              onChange={(e) => setImapPort(Number(e.target.value))}
              min={1}
              max={65535}
            />
          </Field>
          <ButtonRow>
            <Btn type="submit" disabled={!canSubmitPassword || connectPassword.isPending}>
              {connectPassword.isPending ? t('common.loading') : t('settings.emailConnectBtn')}
            </Btn>
          </ButtonRow>
          {connectPassword.error && (
            <Err>{(connectPassword.error as Error).message}</Err>
          )}
        </FormGrid>
      )}
      {connectOAuth.error && authMode !== 'oauth' && (
        <Err>{(connectOAuth.error as Error).message}</Err>
      )}
    </Section>
  );
};
