import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.813rem;
`;

const Info = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Pages = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs}px;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme, $active }) => ($active ? theme.colors.accent : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.textPrimary)};
  font-size: 0.813rem;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

export const Pagination: React.FC<PaginationProps> = ({ current, total, pageSize, onPageChange }) => {
  const { t } = useTranslation();
  const totalPages = Math.ceil(total / pageSize);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  return (
    <Wrapper>
      <Info>
        {t('pagination.showing', { start, end, total })}
      </Info>
      <Pages>
        <PageBtn disabled={current <= 1} onClick={() => onPageChange(current - 1)}>
          ‹
        </PageBtn>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <PageBtn key={page} $active={page === current} onClick={() => onPageChange(page)}>
            {page}
          </PageBtn>
        ))}
        <PageBtn disabled={current >= totalPages} onClick={() => onPageChange(current + 1)}>
          ›
        </PageBtn>
      </Pages>
    </Wrapper>
  );
};

export default Pagination;
