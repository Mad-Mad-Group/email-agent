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

const TabBar = styled.div`
  display: flex;
  padding: 0 24px;
  gap: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const Tab = styled.button<{ $active: boolean }>`
  border: none;
  padding: 12px 20px;
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.textSecondary};
  background: transparent;
  border-bottom: 2px solid ${({ $active, theme }) => $active ? theme.colors.accent : 'transparent'};
  margin-bottom: -1px;

  &:hover {
    color: ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.textPrimary};
  }
`;

const Pane = styled.div`
  & > div:first-child { padding-top: 8px; }
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
      <TabBar role="tablist" aria-label={t('clientPool.title')}>
        <Tab type="button" role="tab" aria-selected={tab === 'clients'} $active={tab === 'clients'} onClick={() => selectTab('clients')}>
          {t('clientPool.clientsTab')}
        </Tab>
        <Tab type="button" role="tab" aria-selected={tab === 'verified'} $active={tab === 'verified'} onClick={() => selectTab('verified')}>
          {t('clientPool.verifiedTab')}
        </Tab>
      </TabBar>
      <Pane style={{ display: tab === 'clients' ? 'block' : 'none' }}><Leads /></Pane>
      <Pane style={{ display: tab === 'verified' ? 'block' : 'none' }}><VerifiedEmailsPage /></Pane>
    </Page>
  );
};

export default ClientPool;
