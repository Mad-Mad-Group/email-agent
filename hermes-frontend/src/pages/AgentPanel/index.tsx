import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styled, { keyframes, css } from 'styled-components';
import { PageHeader, Button, StatusBadge, Table } from '../../components';
import { useAgents } from '../../api/hooks';
import { AgentStatus, FeedItem, TaskStep } from '../../types';
import { media } from '../../styles/media';
import IsometricWorld from './IsometricWorld';

/* ══════════════════════════════════════
   Agent Panel — Left/Right split layout
   ══════════════════════════════════════ */

const AgentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

/* ── Main split: Isometric left, content right ── */
const SplitLayout = styled.div`
  display: grid;
  grid-template-columns: 4fr 6fr;
  gap: 12px;
  align-items: start;

  ${media.tablet} {
    grid-template-columns: 280px 1fr;
    gap: 16px;
  }
  ${media.mobile} {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const LeftPane = styled.div`
  position: sticky;
  top: 80px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  ${media.mobile} {
    position: static;
  }
`;

const RightPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;

/* ── Agent mini-cards (compact horizontal) ── */
const AgentStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const AgentMiniCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 10px;
  padding: 8px 10px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const AgentCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const AgentName = styled.h4`
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const AgentMeta = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`;

/* ── Pipeline + Stats row ── */
const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const PanelCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 10px;
  padding: 10px;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const PanelTitle = styled.h4`
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const ProgressBarContainer = styled.div`
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 6px;
  height: 8px;
  overflow: hidden;
  margin-bottom: 12px;
`;

const ProgressBarFill = styled.div<{ width: number }>`
  height: 100%;
  width: ${({ width }) => width}%;
  background: ${({ theme }) => theme.colors.blue};
  border-radius: 6px;
  transition: width 0.5s ease;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 6px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 6px;
`;

const StatValue = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.blue};
`;

const StatLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 1px;
`;

/* ── Activity Feed (compact) ── */
const FeedList = styled.div`
  display: flex;
  flex-direction: column;
`;

const FeedItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
`;

const FeedDot = styled.div<{ $event: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $event, theme }) =>
    $event === 'scrape' ? theme.colors.green :
    $event === 'email' ? theme.colors.blue :
    theme.colors.amber};
`;

const FeedTime = styled.span`
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: ${({ theme }) => theme.colors.textTertiary};
  flex-shrink: 0;
  width: 38px;
`;

const FeedMessage = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.3;
`;

/* ── Left pane: quick stats beneath world ── */
const QuickStats = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 10px;
  padding: 14px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

/* ── Floating Timeline Panel (Nominee-status style) ── */

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 1200;
  animation: ${fadeIn} 0.15s ease;
`;

const FloatingPanel = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1201;
  width: 420px;
  max-height: 80vh;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  animation: ${fadeIn} 0.2s ease;

  ${media.mobile} {
    width: calc(100vw - 32px);
    max-height: 90vh;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const PanelHeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const PanelHeaderTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PanelHeaderSub = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`;

const CloseBtn = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.blue};
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)'};
  }
`;

const TimelineBody = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`;

const TimelineList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;

  /* vertical line */
  &::before {
    content: '';
    position: absolute;
    left: 56px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: ${({ theme }) => theme.colors.border};
  }
`;

const pulseGlow = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
`;

const TimelineItem = styled.li<{ $status: TaskStep['status'] }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  position: relative;

  ${({ $status }) => $status === 'pending' && css`opacity: 0.5;`}
`;

const TimelineDate = styled.span`
  width: 44px;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textTertiary};
  text-align: right;
  padding-top: 2px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`;

const TimelineDot = styled.div<{ $status: TaskStep['status'] }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  position: relative;
  z-index: 1;
  background: ${({ $status, theme }) =>
    $status === 'done' ? theme.colors.green :
    $status === 'active' ? theme.colors.blue :
    theme.colors.border};

  ${({ $status }) => $status === 'active' && css`animation: ${pulseGlow} 2s ease-in-out infinite;`}

  /* checkmark for done */
  ${({ $status }) => $status === 'done' && css`
    &::after {
      content: '';
      position: absolute;
      left: 3.5px;
      top: 2px;
      width: 3px;
      height: 6px;
      border: solid #fff;
      border-width: 0 1.5px 1.5px 0;
      transform: rotate(45deg);
    }
  `}
`;

const TimelineContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const TimelineLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  line-height: 1.3;
`;

const TimelineDetail = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 3px;
  line-height: 1.4;
  padding: 6px 8px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 6px;
  border-left: 2px solid ${({ theme }) => theme.colors.blue};
`;

const PanelFooter = styled.div`
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const FooterStat = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const ProgressMini = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProgressTrack = styled.div`
  width: 100px;
  height: 4px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.colors.green};
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const ProgressLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.green};
`;

/* ── Clickable card wrapper ── */
const ClickableCard = styled(AgentMiniCard)`
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.card}, 0 4px 12px rgba(0,0,0,0.08);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
`;

const AgentPanel: React.FC = () => {
  const { t } = useTranslation();
  const { data } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);

  const agents = data?.agents || [];
  const feed = data?.feed || [];

  const handleClose = useCallback(() => setSelectedAgent(null), []);

  const configColumns = [
    { key: 'setting', label: t('agents.configSetting') },
    { key: 'value', label: t('agents.configValue') },
    { key: 'status', label: t('common.status') },
  ];

  const configData = [
    { setting: t('agents.config.searchDepth'), value: '3', status: 'active' },
    { setting: t('agents.config.emailBatch'), value: '50', status: 'active' },
    { setting: t('agents.config.qualifyThreshold'), value: '0.7', status: 'active' },
    { setting: t('agents.config.scrapeInterval'), value: '30min', status: 'paused' },
  ];

  const pipelineProgress = 67;

  return (
    <AgentContainer>
      <div style={{ marginBottom: '-16px' }}>
      <PageHeader title={t('agents.title')} subtitle={t('agents.subtitle')}>
        <Button variant="default">{t('agents.pauseAll')}</Button>
        <Button variant="primary">{t('agents.runPipeline')}</Button>
      </PageHeader>
      </div>

      <SplitLayout>
        {/* ── Left: Isometric scene + quick stats ── */}
        <LeftPane>
          <IsometricWorld />
        </LeftPane>

        {/* ── Right: Agent cards, pipeline, config, feed ── */}
        <RightPane>
          {/* Agent cards — compact strip */}
          <AgentStrip>
            {agents.map((agent: AgentStatus) => (
              <ClickableCard key={agent.id} onClick={() => setSelectedAgent(agent)}>
                <AgentCardTop>
                  <AgentName>{agent.name}</AgentName>
                  <StatusBadge status={agent.status as any} />
                </AgentCardTop>
                <AgentMeta>
                  {t('agents.tasksCompleted')}: {agent.tasksCompleted}<br />
                  {t('agents.successRate')}: {agent.successRate}%<br />
                  {t('agents.lastRun')}: {agent.lastRun}
                </AgentMeta>
              </ClickableCard>
            ))}
          </AgentStrip>

          {/* Activity Feed */}
          <PanelCard>
            <PanelTitle>{t('agents.activityFeed')}</PanelTitle>
            <FeedList>
              {feed.slice(0, 5).map((item: FeedItem, i: number) => (
                <FeedItemRow key={i}>
                  <FeedDot $event={item.event} />
                  <FeedTime>{item.time}</FeedTime>
                  <FeedMessage>{item.message}</FeedMessage>
                </FeedItemRow>
              ))}
            </FeedList>
          </PanelCard>

          {/* Config table */}
          <PanelCard>
            <PanelTitle>{t('agents.configTitle')}</PanelTitle>
            <Table
              columns={configColumns}
              data={configData}
              renderCell={(key, value, row) => {
                if (key === 'status') {
                  return <StatusBadge status={row.status === 'active' ? 'approved' : 'pending'} />;
                }
                return value;
              }}
            />
          </PanelCard>
        </RightPane>
      </SplitLayout>

      {/* ── Floating Timeline Panel (portal to body to escape stacking context) ── */}
      {selectedAgent && createPortal(
        <>
          <Overlay onClick={handleClose} />
          <FloatingPanel>
            <PanelHeader>
              <PanelHeaderLeft>
                <PanelHeaderTitle>{selectedAgent.name}</PanelHeaderTitle>
                <PanelHeaderSub>{selectedAgent.type} · {selectedAgent.lastRun}</PanelHeaderSub>
              </PanelHeaderLeft>
              <CloseBtn onClick={handleClose} title="Close"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CloseBtn>
            </PanelHeader>

            <TimelineBody>
              <TimelineList>
                {(selectedAgent.taskSteps || []).map((step, i) => (
                  <TimelineItem key={i} $status={step.status}>
                    <TimelineDate>{step.date}</TimelineDate>
                    <TimelineDot $status={step.status} />
                    <TimelineContent>
                      <TimelineLabel>{step.label}</TimelineLabel>
                      {step.detail && <TimelineDetail>{step.detail}</TimelineDetail>}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </TimelineList>
            </TimelineBody>

            <PanelFooter>
              <FooterStat>
                {(selectedAgent.taskSteps || []).filter(s => s.status === 'done').length} / {(selectedAgent.taskSteps || []).length} steps
              </FooterStat>
              <ProgressMini>
                <ProgressTrack>
                  <ProgressFill $pct={
                    (selectedAgent.taskSteps || []).length > 0
                      ? Math.round(((selectedAgent.taskSteps || []).filter(s => s.status === 'done').length / (selectedAgent.taskSteps || []).length) * 100)
                      : 0
                  } />
                </ProgressTrack>
                <ProgressLabel>
                  {(selectedAgent.taskSteps || []).length > 0
                    ? Math.round(((selectedAgent.taskSteps || []).filter(s => s.status === 'done').length / (selectedAgent.taskSteps || []).length) * 100)
                    : 0}%
                </ProgressLabel>
              </ProgressMini>
            </PanelFooter>
          </FloatingPanel>
        </>,
        document.body
      )}
    </AgentContainer>
  );
};

export default AgentPanel;
