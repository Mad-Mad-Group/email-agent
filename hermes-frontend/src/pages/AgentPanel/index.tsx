import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styled, { keyframes, css } from 'styled-components';
import { PageHeader, Button, StatusBadge, Table } from '../../components';
import { useAgentStats, useNotifications, useSettings, useTasks } from '../../api/hooks';
import type { AgentSkillStats } from '../../api/services';
import type { NotificationItem } from '../../api/notifications';
import { media } from '../../styles/media';
import IsometricWorld from './IsometricWorld';

/* ── Skill → Agent name mapping ── */
const SKILL_META: Record<string, { name: string; type: string }> = {
  S1: { name: 'Lead Scraper', type: '搜尋引擎' },
  S2: { name: 'Lead Analyzer', type: '分析 & Enrich' },
  S3: { name: 'Email Drafter', type: '草稿生成' },
  S4: { name: 'Email Sender', type: '郵件發送' },
};

const NOTIF_EVENT_MAP: Record<string, string> = {
  lead: 'scrape',
  email: 'email',
  task: 'qualify',
  campaign: 'qualify',
  system: 'qualify',
};

/** 安全解析時間字串（worker 用 toISOString() 儲存 UTC，去咗 Z，要加返） */
function safeParseDate(s: string): Date {
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  // 冇時區標記 → 當 UTC（因為 worker 用 toISOString 產生）
  return new Date(normalized.endsWith('Z') ? normalized : normalized + 'Z');
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - safeParseDate(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(iso: string): string {
  const d = safeParseDate(iso);
  if (isNaN(d.getTime())) return '--:--';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (isToday) return `${hh}:${mm}`;
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${MM}/${dd} ${hh}:${mm}`;
}

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

const TimelineItem = styled.li<{ $status: 'done' | 'active' | 'pending' }>`
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

const TimelineDot = styled.div<{ $status: 'done' | 'active' | 'pending' }>`
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
  const { data: statsRaw } = useAgentStats();
  const { data: notifsRaw } = useNotifications({ limit: 10 });
  const { data: settingsRaw } = useSettings();
  const { data: tasksRaw } = useTasks();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  /* ── Agent cards from task stats ── */
  const statsArr: AgentSkillStats[] = Array.isArray(statsRaw) ? statsRaw : [];
  const agentCards = ['S1', 'S2', 'S3', 'S4'].map((skill) => {
    const s = statsArr.find((x) => x._id === skill);
    const completed = s?.completed ?? 0;
    const failed = s?.failed ?? 0;
    const total = completed + failed;
    const rate = total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0;
    const running = s?.running ?? 0;
    const status = running > 0 ? 'running' : completed > 0 ? 'idle' : 'idle';
    return {
      skill,
      name: SKILL_META[skill]?.name ?? skill,
      type: SKILL_META[skill]?.type ?? '',
      completed,
      rate,
      status,
      lastRun: s?.last_run ? formatTimeAgo(s.last_run) : '—',
    };
  });

  /* ── Activity feed from notifications ── */
  const notifications: NotificationItem[] = (notifsRaw as any)?.data ?? [];

  /* ── Config from settings ── */
  const settingsMap: Record<string, any> = {};
  if (Array.isArray(settingsRaw)) {
    for (const s of settingsRaw as any[]) settingsMap[s.key] = s.value;
  } else if (settingsRaw && typeof settingsRaw === 'object') {
    Object.assign(settingsMap, settingsRaw);
  }

  const configColumns = [
    { key: 'setting', label: t('agents.configSetting') },
    { key: 'value', label: t('agents.configValue') },
    { key: 'status', label: t('common.status') },
  ];

  const configData = [
    { setting: t('agents.config.searchDepth'), value: settingsMap['search_depth'] ?? '3', status: 'active' },
    { setting: t('agents.config.emailBatch'), value: settingsMap['email_batch'] ?? '50', status: 'active' },
    { setting: t('agents.config.qualifyThreshold'), value: settingsMap['qualify_threshold'] ?? '0.7', status: 'active' },
    { setting: t('agents.config.scrapeInterval'), value: settingsMap['scrape_interval'] ?? '30min', status: settingsMap['scrape_interval'] ? 'active' : 'paused' },
  ];

  /* ── Recent tasks for timeline (filtered by selected skill) ── */
  const allTasks: any[] = (tasksRaw as any)?.items ?? [];
  const selectedTasks = selectedSkill
    ? allTasks.filter((t: any) => t.skill_id === selectedSkill).slice(0, 15)
    : [];

  const handleClose = useCallback(() => setSelectedSkill(null), []);

  return (
    <AgentContainer>
      <div style={{ marginBottom: '-16px' }}>
      <PageHeader title={t('agents.title')} subtitle={t('agents.subtitle')}>
        <Button variant="default">{t('agents.pauseAll')}</Button>
        <Button variant="primary">{t('agents.runPipeline')}</Button>
      </PageHeader>
      </div>

      <SplitLayout>
        <LeftPane>
          <IsometricWorld />
        </LeftPane>

        <RightPane>
          {/* Agent cards — real stats */}
          <AgentStrip>
            {agentCards.map((ag) => (
              <ClickableCard key={ag.skill} onClick={() => setSelectedSkill(ag.skill)}>
                <AgentCardTop>
                  <AgentName>{ag.name}</AgentName>
                  <StatusBadge status={ag.status as any} />
                </AgentCardTop>
                <AgentMeta>
                  {t('agents.tasksCompleted')}: {ag.completed}<br />
                  {t('agents.successRate')}: {ag.rate}%<br />
                  {t('agents.lastRun')}: {ag.lastRun}
                </AgentMeta>
              </ClickableCard>
            ))}
          </AgentStrip>

          {/* Activity Feed — real notifications */}
          <PanelCard>
            <PanelTitle>{t('agents.activityFeed')}</PanelTitle>
            <FeedList>
              {notifications.length === 0 && (
                <FeedMessage style={{ padding: '12px 0', opacity: 0.5 }}>暫無活動記錄</FeedMessage>
              )}
              {notifications.slice(0, 8).map((n) => (
                <FeedItemRow key={n._id}>
                  <FeedDot $event={NOTIF_EVENT_MAP[n.type] || 'qualify'} />
                  <FeedTime>{formatTime(n.created_at)}</FeedTime>
                  <FeedMessage>{n.title}{n.message ? ` — ${n.message}` : ''}</FeedMessage>
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

      {/* ── Floating Timeline: recent tasks for this skill ── */}
      {selectedSkill && createPortal(
        <>
          <Overlay onClick={handleClose} />
          <FloatingPanel>
            <PanelHeader>
              <PanelHeaderLeft>
                <PanelHeaderTitle>{SKILL_META[selectedSkill]?.name ?? selectedSkill}</PanelHeaderTitle>
                <PanelHeaderSub>{SKILL_META[selectedSkill]?.type ?? ''} · {selectedSkill}</PanelHeaderSub>
              </PanelHeaderLeft>
              <CloseBtn onClick={handleClose} title="Close"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CloseBtn>
            </PanelHeader>

            <TimelineBody>
              {selectedTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5, fontSize: 13 }}>
                  暫無任務記錄
                </div>
              )}
              <TimelineList>
                {selectedTasks.map((task: any, i: number) => {
                  const status = task.status === 'completed' ? 'done' as const
                    : task.status === 'running' ? 'active' as const
                    : task.status === 'failed' ? 'done' as const
                    : 'pending' as const;
                  const dateStr = task._updated_at || task._created_at || '';
                  const d = dateStr ? new Date(dateStr) : null;
                  const dateLabel = d
                    ? `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
                    : '';
                  return (
                    <TimelineItem key={task.task_id || i} $status={status}>
                      <TimelineDate>{dateLabel}</TimelineDate>
                      <TimelineDot $status={task.status === 'failed' ? 'active' : status} />
                      <TimelineContent>
                        <TimelineLabel>
                          {task.title || task.task_id}
                          {task.status === 'failed' && ' ✗'}
                        </TimelineLabel>
                        {task.status === 'failed' && task.error?.message && (
                          <TimelineDetail style={{ borderLeftColor: '#ef4444' }}>
                            {task.error.message}
                          </TimelineDetail>
                        )}
                        {task.status === 'completed' && task.result && (
                          <TimelineDetail>
                            {JSON.stringify(task.result).slice(0, 120)}
                          </TimelineDetail>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  );
                })}
              </TimelineList>
            </TimelineBody>

            <PanelFooter>
              <FooterStat>
                {selectedTasks.filter((t: any) => t.status === 'completed').length} / {selectedTasks.length} completed
              </FooterStat>
              <ProgressMini>
                <ProgressTrack>
                  <ProgressFill $pct={
                    selectedTasks.length > 0
                      ? Math.round((selectedTasks.filter((t: any) => t.status === 'completed').length / selectedTasks.length) * 100)
                      : 0
                  } />
                </ProgressTrack>
                <ProgressLabel>
                  {selectedTasks.length > 0
                    ? Math.round((selectedTasks.filter((t: any) => t.status === 'completed').length / selectedTasks.length) * 100)
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
