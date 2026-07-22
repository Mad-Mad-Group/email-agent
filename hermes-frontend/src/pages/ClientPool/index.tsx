import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import Leads from '../Leads';
import VerifiedEmailsPage from '../VerifiedEmails';

const Page = styled.div`
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  padding: 24px 24px 0;
`;

const Title = styled.h1`
  margin: 0 0 14px;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Tabs = styled.div`
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
`;

const Tab = styled.button<{ $active: boolean }>`
  border: 0;
  border-radius: ${({ theme }) => theme.radii.control}px;
  padding: 7px 14px;
  cursor: pointer;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ $active, theme }) => $active ? theme.colors.textInverted : theme.colors.textSecondary};
  background: ${({ $active, theme }) => $active ? theme.colors.accent : 'transparent'};
`;

const Pane = styled.div`
  & > div:first-child { padding-top: 16px; }
`;

const ClientPool: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<'clients' | 'verified'>(searchParams.get('view') === 'verified' ? 'verified' : 'clients');
  const selectTab = (next: 'clients' | 'verified') => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'verified') params.set('view', 'verified'); else params.delete('view');
    setSearchParams(params, { replace: true });
  };

  return (
    <Page>
      <Header>
        <Title>{t('clientPool.title')}</Title>
        <Tabs role="tablist" aria-label={t('clientPool.title')}>
          <Tab type="button" role="tab" aria-selected={tab === 'clients'} $active={tab === 'clients'} onClick={() => selectTab('clients')}>
            {t('clientPool.clientsTab')}
          </Tab>
          <Tab type="button" role="tab" aria-selected={tab === 'verified'} $active={tab === 'verified'} onClick={() => selectTab('verified')}>
            {t('clientPool.verifiedTab')}
          </Tab>
        </Tabs>
      </Header>
      <Pane style={{ display: tab === 'clients' ? 'block' : 'none' }}><Leads /></Pane>
      <Pane style={{ display: tab === 'verified' ? 'block' : 'none' }}><VerifiedEmailsPage /></Pane>
    </Page>
  );
};

export default ClientPool;
