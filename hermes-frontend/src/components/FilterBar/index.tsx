import React from 'react';
import styled from 'styled-components';

interface FilterBarProps {
  children: React.ReactNode;
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  margin-bottom: ${({ theme }) => theme.spacing.md}px;
  flex-wrap: wrap;
`;

export const FilterBar: React.FC<FilterBarProps> = ({ children }) => (
  <Wrapper>{children}</Wrapper>
);

export default FilterBar;
