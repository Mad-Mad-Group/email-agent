import React from 'react';
import styled, { keyframes, css } from 'styled-components';

type Status = 'new' | 'pending' | 'contacted' | 'rejected' | 'qualified' | 'draft' | 'approved' | 'sent' | 'running' | 'idle' | 'active';

interface StatusBadgeProps {
  status: Status;
}

/* 3-color semantic mapping: blue (neutral/progress), green (positive), red (negative) */
const statusFgMap: Record<string, string> = {
  new: '#2563eb',
  pending: '#2563eb',
  contacted: '#10b981',
  rejected: '#ef4444',
  qualified: '#10b981',
  draft: '#2563eb',
  approved: '#10b981',
  sent: '#10b981',
  running: '#2563eb',
  idle: '#94a3b8',
  active: '#10b981',
};

const spinDots = keyframes`
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const ledPulse = keyframes`
  0%, 100% { box-shadow: 0 0 3px 1px currentColor; }
  50%      { box-shadow: 0 0 8px 3px currentColor; }
`;

const Pill = styled.span<{ $fg: string; $isRunning?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.sm}px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: ${({ theme }) => theme.fonts.primary};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ $fg }) => $fg};
`;

const LedDot = styled.span<{ $fg: string; $active?: boolean }>`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $fg }) => $fg};
  color: ${({ $fg }) => $fg};
  box-shadow: 0 0 3px 1px currentColor;
  animation: ${({ $active }) => $active ? css`${ledPulse} 2s ease-in-out infinite` : 'none'};
  flex-shrink: 0;
`;

const SpinnerWrap = styled.span`
  display: inline-flex;
  width: 14px;
  height: 14px;
  animation: ${spinDots} 1s linear infinite;
`;

const SpinnerSvg = () => (
  <SpinnerWrap>
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7"    cy="1"    r="2"   fill="currentColor" opacity="1" />
      <circle cx="2.5"  cy="3"    r="1.7" fill="currentColor" opacity="0.7" />
      <circle cx="1"    cy="7"    r="1.4" fill="currentColor" opacity="0.45" />
      <circle cx="3"    cy="11"   r="1.1" fill="currentColor" opacity="0.25" />
      <circle cx="7"    cy="13"   r="0.9" fill="currentColor" opacity="0.12" />
    </svg>
  </SpinnerWrap>
);

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const fg = statusFgMap[status] ?? '#2563eb';
  const isRunning = status === 'running';
  const isActive = isRunning || status === 'active';
  return (
    <Pill $fg={fg} $isRunning={isRunning}>
      {isRunning ? <SpinnerSvg /> : <LedDot $fg={fg} $active={isActive} />}
      {status}
    </Pill>
  );
};

export default StatusBadge;
