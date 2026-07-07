import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { PageHeader, Button, FormField } from '../../components';
import { useSearchResults } from '../../api/hooks';
import { SearchResult } from '../../types';

const SearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SearchBox = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
  background: ${({ theme }) => theme.colors.surface};
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const SearchInputWrapper = styled.div`
  flex: 1;
`;

const SourceSelectWrapper = styled.div`
  width: 200px;
`;

const FilterTags = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Tag = styled.button<{ active?: boolean }>`
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid ${({ active, theme }) => active ? theme.colors.blue : theme.colors.border};
  background: ${({ active, theme }) => active ? theme.colors.blue : 'transparent'};
  color: ${({ active, theme }) => active ? '#fff' : theme.colors.textSecondary};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.blue};
  }
`;

const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ResultCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
`;

const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const ResultCompany = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
`;

const ResultSource = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.canvas};
  padding: 2px 8px;
  border-radius: 4px;
`;

const ResultSnippet = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 8px 0 16px;
  line-height: 1.5;
`;

const ResultMeta = styled.div`
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 12px;
`;

const ResultActions = styled.div`
  display: flex;
  gap: 8px;
`;

const FILTER_OPTIONS = ['all', 'linkedin', 'crunchbase', 'web', 'news'] as const;

const SearchPanel: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const { data } = useSearchResults();

  const results = data || [];

  const filteredResults = activeFilter === 'all'
    ? results
    : results.filter((r: SearchResult) => r.source === activeFilter);

  const handleSearch = () => {
    // Trigger search via hook reactivity
  };

  return (
    <SearchContainer>
      <PageHeader title={t('search.title')} subtitle={t('search.subtitle')} />

      <SearchBox>
        <SearchInputWrapper>
          <FormField
            label={t('search.queryLabel')}
            type="text"
            value={query}
            onChange={setQuery}
            placeholder={t('search.placeholder')}
          />
        </SearchInputWrapper>
        <SourceSelectWrapper>
          <FormField
            label={t('search.sourceLabel')}
            type="select"
            value={source}
            onChange={setSource}
            options={[
              { value: 'all', label: t('search.sources.all') },
              { value: 'linkedin', label: t('search.sources.linkedin') },
              { value: 'crunchbase', label: t('search.sources.crunchbase') },
              { value: 'web', label: t('search.sources.web') },
              { value: 'news', label: t('search.sources.news') },
            ]}
          />
        </SourceSelectWrapper>
        <Button variant="primary" onClick={handleSearch}>
          {t('search.searchButton')}
        </Button>
      </SearchBox>

      <FilterTags>
        {FILTER_OPTIONS.map((filter) => (
          <Tag
            key={filter}
            active={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
          >
            {t(`search.filters.${filter}`)}
          </Tag>
        ))}
      </FilterTags>

      <ResultsList>
        {filteredResults.map((result: SearchResult) => (
          <ResultCard key={result.id}>
            <ResultHeader>
              <ResultCompany>{result.company}</ResultCompany>
              <ResultSource>{result.source}</ResultSource>
            </ResultHeader>
            <ResultMeta>
              {result.location && <span>{result.location}</span>}
              {result.industry && <span>{result.industry}</span>}
              {result.employees && <span>{result.employees} {t('search.employees')}</span>}
            </ResultMeta>
            <ResultSnippet>{result.snippet}</ResultSnippet>
            <ResultActions>
              <Button variant="primary">{t('search.addToPipeline')}</Button>
              <Button variant="default">{t('search.deepScrape')}</Button>
              <Button variant="sm">{t('search.aiAnalyze')}</Button>
            </ResultActions>
          </ResultCard>
        ))}
      </ResultsList>
    </SearchContainer>
  );
};

export default SearchPanel;
