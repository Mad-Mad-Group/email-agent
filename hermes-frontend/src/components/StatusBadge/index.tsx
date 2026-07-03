import React from 'react';
import styled from 'styled-components';

type Status = 'new' | 'pending' | 'contacted' | 'rejected' | 'qualified' | 'draft' | 'approved' | 'sent';

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
};

const Pill = styled.span<{ $fg: string }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.sm}px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: ${({ theme }) => theme.fonts.primary};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ $fg }) => $fg};
`;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const fg = statusFgMap[status] ?? '#2563eb';
  return (
    <Pill $fg={fg}>
      {status}
    </Pill>
  );
};

export default StatusBadge;
