import React from 'react';
import styled from 'styled-components';

interface FeedItem {
  time: string;
  event: string;
  message: string;
}

interface LiveFeedProps {
  items: FeedItem[];
}

const Wrapper = styled.div`
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const Item = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.sm}px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const Time = styled.span`
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  white-space: nowrap;
  min-width: 48px;
`;

const Event = styled.span`
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap;
`;

const Message = styled.span`
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const LiveFeed: React.FC<LiveFeedProps> = ({ items }) => (
  <Wrapper>
    {items.map((item, i) => (
      <Item key={i}>
        <Time>{item.time}</Time>
        <Event>{item.event}</Event>
        <Message>{item.message}</Message>
      </Item>
    ))}
  </Wrapper>
);

export default LiveFeed;
