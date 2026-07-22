import React from 'react';
import styled from 'styled-components';
import { media } from '../../styles/media';
import { glassSurface } from '../../styles/glassSurface';

interface Column {
  key: string;
  label: string;
  width?: string;
}

interface TableProps {
  columns: Column[];
  data: Record<string, any>[];
  renderCell?: (key: string, value: any, row: Record<string, any>) => React.ReactNode;
}

const Wrapper = styled.div`
  ${glassSurface};
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radii.card}px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.875rem;
  ${media.mobile} { font-size: 0.75rem; }
`;

const Th = styled.th<{ $width?: string }>`
  text-align: left;
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 500;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  ${({ $width }) => $width && `width: ${$width};`}
  ${media.mobile} {
    padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.sm}px;
    font-size: 0.625rem;
  }
`;

const Tr = styled.tr`
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
`;

const Td = styled.td`
  padding: ${({ theme }) => theme.spacing.sm}px ${({ theme }) => theme.spacing.md}px;
  color: ${({ theme }) => theme.colors.textPrimary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  ${media.mobile} {
    padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.sm}px;
  }
`;

export const Table: React.FC<TableProps> = ({ columns, data, renderCell }) => (
  <Wrapper>
    <StyledTable>
      <thead>
        <tr>
          {columns.map((col) => (
            <Th key={col.key} $width={col.width}>
              {col.label}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <Tr key={i}>
            {columns.map((col) => (
              <Td key={col.key}>
                {renderCell ? renderCell(col.key, row[col.key], row) : row[col.key]}
              </Td>
            ))}
          </Tr>
        ))}
      </tbody>
    </StyledTable>
  </Wrapper>
);

export default Table;
