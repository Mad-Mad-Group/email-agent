import React from 'react';
import styled from 'styled-components';

interface CardProps {
  title?: string;
  children: React.ReactNode;
}

const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
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
  border: 2px solid ${({ theme }) => theme.colors.blue};
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
