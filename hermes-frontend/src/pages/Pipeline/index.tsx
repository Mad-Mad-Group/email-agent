import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { PageHeader, Button, FilterBar, FormField, Table, Pagination, StatusBadge, Card } from '../../components';
import { useLeads } from '../../api/hooks';
import { Lead } from '../../api/leads';

const PipelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const KanbanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
`;

const KanbanColumn = styled.div`
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 10px;
  padding: 16px;
  min-height: 400px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ColumnTitle = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
`;

const ColumnCount = styled.span`
  background: ${({ theme }) => theme.colors.blue};
  color: ${({ theme }) => theme.colors.surface};
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 600;
`;

const LeadCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  cursor: pointer;

  &:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const LeadCardCompany = styled.div`
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
`;

const LeadCardContact = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const LeadCardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const LeadScore = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.blue};
`;

const ScoreBadge = styled.span<{ score: number }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: ${({ score }) =>
    score >= 80 ? '#22c55e' : score >= 50 ? '#c19862' : '#c47474'};
`;

const TableSection = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const KANBAN_STAGES = ['new', 'pending', 'contacted', 'qualified'] as const;

const Pipeline: React.FC = () => {
  const { t } = useTranslation();
  const { data } = useLeads();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const leads: Lead[] = (data as any)?.data ?? (Array.isArray(data) ? data : []);

  const filteredLeads = leads.filter((lead: Lead) => {
    const matchesSearch = !searchQuery ||
      lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getLeadsByStage = (stage: string) =>
    leads.filter((lead: Lead) => lead.status === stage);

  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns = [
    { key: 'company', label: t('common.company') },
    { key: 'contact', label: t('common.contact') },
    { key: 'email', label: t('common.email') },
    { key: 'stage', label: t('common.status') },
    { key: 'score', label: t('common.score') },
    { key: 'source', label: t('common.source') },
    { key: 'date', label: t('common.date') },
  ];

  return (
    <PipelineContainer>
      <PageHeader title={t('pipeline.title')} subtitle={t('pipeline.subtitle')}>
        <Button variant="primary">{t('pipeline.addLead')}</Button>
        <Button variant="default">{t('pipeline.export')}</Button>
      </PageHeader>

      <FilterBar>
        <FormField
          label=""
          type="text"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('pipeline.searchPlaceholder')}
        />
        <FormField
          label=""
          type="select"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: t('common.allStatuses') },
            { value: 'new', label: t('pipeline.stages.new') },
            { value: 'pending', label: t('pipeline.stages.pending') },
            { value: 'contacted', label: t('pipeline.stages.contacted') },
            { value: 'qualified', label: t('pipeline.stages.qualified') },
          ]}
        />
      </FilterBar>

      <KanbanGrid>
        {KANBAN_STAGES.map((stage) => {
          const stageLeads = getLeadsByStage(stage);
          return (
            <KanbanColumn key={stage}>
              <ColumnHeader>
                <ColumnTitle>{t(`pipeline.stages.${stage}`)}</ColumnTitle>
                <ColumnCount>{stageLeads.length}</ColumnCount>
              </ColumnHeader>
              {stageLeads.map((lead: Lead) => (
                <LeadCard key={lead._id}>
                  <LeadCardCompany>{lead.company_name}</LeadCardCompany>
                  <LeadCardContact>{lead.email || '—'}</LeadCardContact>
                  <LeadCardFooter>
                    <StatusBadge status={lead.status as any} />
                    <LeadScore>{lead.rating || '—'}</LeadScore>
                  </LeadCardFooter>
                </LeadCard>
              ))}
            </KanbanColumn>
          );
        })}
      </KanbanGrid>

      <TableSection>
        <Table
          columns={columns}
          data={paginatedLeads}
          renderCell={(key: string, value: any, row: Record<string, any>) => {
            if (key === 'stage') {
              return <StatusBadge status={row.stage} />;
            }
            if (key === 'score') {
              return <ScoreBadge score={Number(value)}>{value}</ScoreBadge>;
            }
            return value;
          }}
        />
        <Pagination
          current={currentPage}
          total={filteredLeads.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </TableSection>
    </PipelineContainer>
  );
};

export default Pipeline;
