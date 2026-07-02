import React from 'react';
import styled from 'styled-components';

type Status = 'new' | 'pending' | 'contacted' | 'rejected' | 'qualified' | 'draft' | 'approved' | 'sent';

interface StatusBadgeProps {
  status: Status;
}

const statusColorMap: Record<string, string> = {
  new: 'new',
  pending: 'pending',
  contacted: 'contacted',
  rejected: 'rejected',
  qualified: 'qualified',
  draft: 'pending',
  approved: 'contacted',
  sent: 'new',
};

const Pill = styled.span<{ $statusKey: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => theme.spacing.xs}px ${({ theme }) => theme.spacing.sm}px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: ${({ theme }) => theme.fonts.primary};
  background: ${({ theme, $statusKey }) => theme.status[$statusKey as keyof typeof theme.status].bg};
  color: ${({ theme, $statusKey }) => theme.status[$statusKey as keyof typeof theme.status].fg};
`;

const Dot = styled.span<{ $statusKey: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme, $statusKey }) => theme.status[$statusKey as keyof typeof theme.status].fg};
`;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const key = statusColorMap[status] ?? 'new';
  return (
    <Pill $statusKey={key}>
      <Dot $statusKey={key} />
      {status}
    </Pill>
  );
};

export default StatusBadge;
