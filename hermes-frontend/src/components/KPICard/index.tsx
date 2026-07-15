import React from 'react';
import styled from 'styled-components';
import { glassSurface } from '../../styles/glassSurface';

interface KPICardProps {
  icon: string;
  label: string;
  value: string;
  trend: string;
  trendDirection?: 'up' | 'down' | 'neutral';
}

const Tile = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.tile}px;
  padding: ${({ theme }) => theme.spacing.lg}px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm}px;
`;

const IconRow = styled.div`
  font-size: 1.25rem;
`;

const Label = styled.span`
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const Value = styled.span`
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Trend = styled.span<{ $direction: string }>`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.75rem;
  color: ${({ theme, $direction }) =>
    $direction === 'up'
      ? theme.strong.olive
      : $direction === 'down'
      ? theme.strong.mauve
      : theme.colors.textTertiary};
`;

export const KPICard: React.FC<KPICardProps> = ({ icon, label, value, trend, trendDirection = 'neutral' }) => (
  <Tile>
    <IconRow>{icon}</IconRow>
    <Label>{label}</Label>
    <Value>{value}</Value>
    <Trend $direction={trendDirection}>{trend}</Trend>
  </Tile>
);

export default KPICard;
