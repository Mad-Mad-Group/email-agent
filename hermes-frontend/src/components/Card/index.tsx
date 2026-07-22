import React from 'react';
import styled from 'styled-components';
import { glassSurface } from '../../styles/glassSurface';

interface CardProps {
  title?: string;
  children: React.ReactNode;
}

const Wrapper = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: 14px ${({ theme }) => theme.spacing.lg}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const DotIcon = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.colors.accent};
`;

const Title = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Body = styled.div`
  padding: ${({ theme }) => theme.spacing.lg}px;
`;

export const Card: React.FC<CardProps> = ({ title, children }) => (
  <Wrapper>
    {title && (
      <Header>
        <DotIcon />
        <Title>{title}</Title>
      </Header>
    )}
    <Body>{children}</Body>
  </Wrapper>
);

export default Card;
