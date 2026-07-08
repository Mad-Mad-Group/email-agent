import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styled, { keyframes, css, useTheme } from 'styled-components';
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

/* ── Agent color map ── */
const AGENT_COLORS: Record<string, { accent: string; bg1: string; bg2: string; fg: string; fgDark: string }> = {
  S1: { accent: '#3b82f6', bg1: '#eff6ff', bg2: '#dbeafe', fg: '#1e40af', fgDark: '#93c5fd' },
  S2: { accent: '#8b5cf6', bg1: '#faf5ff', bg2: '#ede9fe', fg: '#5b21b6', fgDark: '#c4b5fd' },
  S3: { accent: '#f59e0b', bg1: '#fffbeb', bg2: '#fef3c7', fg: '#92400e', fgDark: '#fbbf24' },
  S4: { accent: '#22c55e', bg1: '#f0fdf4', bg2: '#dcfce7', fg: '#14532d', fgDark: '#4ade80' },
};

/* ── Robot watermark SVG ── */
const IconRobot = () => (
  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/>
    <path d="M12 2v4"/><circle cx="12" cy="2" r="1"/><path d="M3 14H1m22 0h-2"/>
  </svg>
);

/* ── Segmented Ring Gauge (Image 1 style) ── */
const RingGauge: React.FC<{ pct: number; color: string; size?: number; label: string }> = ({ pct, color, size = 80, label }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const segments = 24;
  const gapRatio = 0.25;
  const segLen = circ / segments;
  const dash = segLen * (1 - gapRatio);
  const gap = segLen * gapRatio;
  const filled = circ * (pct / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="currentColor" strokeOpacity={0.1} strokeWidth={5}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      {/* filled */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={circ - filled}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      {/* center label */}
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="central"
        fontSize="10" fontWeight="600" fill={color}>{label}</text>
      <text x={size / 2} y={size / 2 + 11} textAnchor="middle"
        fontSize="9" fill="currentColor" opacity="0.5">{pct}%</text>
    </svg>
  );
};

/* ── Agent mini-cards (LUNO-style: left bar + gradient + watermark + ring gauge) ── */
const AgentStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const AgentMiniCard = styled.div<{ $accent: string; $bg1: string; $bg2: string }>`
  position: relative;
  background: linear-gradient(135deg, ${({ $bg1 }) => $bg1}, ${({ $bg2 }) => $bg2});
  border-left: 4px solid ${({ $accent }) => $accent};
  border-radius: 14px;
  padding: 14px 14px 12px;
  overflow: hidden;
  transition: transform 0.18s, box-shadow 0.18s;
  &:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.10); }
`;

const AgentWatermark = styled.div<{ $color: string }>`
  position: absolute; right: -4px; bottom: -6px;
  width: 52px; height: 52px; opacity: 0.08;
  color: ${({ $color }) => $color};
`;

const AgentCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const AgentName = styled.h4<{ $fg?: string }>`
  font-size: 13px;
  font-weight: 700;
  margin: 0;
  color: ${({ $fg, theme }) => $fg || theme.colors.textPrimary};
`;

const AgentMeta = styled.div<{ $fg?: string }>`
  font-size: 11px;
  color: ${({ $fg, theme }) => $fg || theme.colors.textSecondary};
  line-height: 1.6;
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
  border-radius: 14px;
  padding: 10px;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const PanelTitle = styled.h4`
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const waveAnim = keyframes`
  0%   { background-position-x: 0; }
  100% { background-position-x: 40px; }
`;

const ProgressBarContainer = styled.div`
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 8px;
  height: 10px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
`;

const ProgressBarFill = styled.div<{ width: number; $accent?: string }>`
  height: 100%;
  width: ${({ width }) => width}%;
  background: linear-gradient(90deg, ${({ $accent, theme }) => $accent || theme.colors.blue}, ${({ $accent, theme }) => $accent || theme.colors.blue}cc);
  border-radius: 8px;
  transition: width 0.5s ease;
  position: relative;
  /* wave top edge */
  background-image: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 8px,
    rgba(255,255,255,0.15) 8px,
    rgba(255,255,255,0.15) 12px,
    transparent 12px,
    transparent 20px
  );
  background-size: 40px 100%;
  animation: ${waveAnim} 1.5s linear infinite;
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
  border-radius: 8px;
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
/* ── Kanban / Masonry Activity Feed (Image 3 style) ── */

const FeedList = styled.div`
  columns: 2;
  column-gap: 10px;

  @media (max-width: 640px) {
    columns: 1;
  }
`;

const FEED_COLORS: Record<string, { accent: string; bg: string }> = {
  scrape: { accent: '#16a34a', bg: '#dcfce720' },
  email:  { accent: '#2563eb', bg: '#dbeafe20' },
  qualify: { accent: '#d97706', bg: '#fef3c720' },
};

const FeedCard = styled.div<{ $event: string }>`
  break-inside: avoid;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ $event, theme }) => {
    const c = FEED_COLORS[$event] || FEED_COLORS.qualify;
    return theme.mode === 'dark' ? `${c.accent}12` : c.bg;
  }};
  border-left: 3px solid ${({ $event }) => (FEED_COLORS[$event] || FEED_COLORS.qualify).accent};
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: transform 0.15s, box-shadow 0.15s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
`;

const FeedCardTime = styled.span`
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const FeedCardTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  line-height: 1.3;
`;

const FeedCardBody = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.4;
`;

const FeedTag = styled.span<{ $event: string }>`
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
  color: ${({ $event }) => (FEED_COLORS[$event] || FEED_COLORS.qualify).accent};
  background: ${({ $event }) => (FEED_COLORS[$event] || FEED_COLORS.qualify).accent}18;
`;

/* ── Left pane: quick stats beneath world ── */
const QuickStats = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
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
  width: min(720px, 90vw);
  max-height: 80vh;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
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
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
`;

/* ── Horizontal Stepper Pipeline (Image 2 style) ── */

const StepperWrap = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 12px 0;
  min-width: max-content;
`;

const StepNode = styled.div<{ $status: 'done' | 'active' | 'pending' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 90px;
  max-width: 120px;
  position: relative;
  ${({ $status }) => $status === 'pending' && css`opacity: 0.45;`}
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.3); }
  50%      { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
`;

const StepCircle = styled.div<{ $status: 'done' | 'active' | 'pending'; $color?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  background: ${({ $status, $color, theme }) =>
    $status === 'done' ? ($color || theme.colors.green) :
    $status === 'active' ? ($color || theme.colors.blue) :
    theme.colors.surfaceMuted};
  color: ${({ $status }) => $status === 'pending' ? '#94a3b8' : '#fff'};
  box-shadow: ${({ $status }) => $status !== 'pending' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'};
  ${({ $status }) => $status === 'active' && css`animation: ${pulseGlow} 2s ease-in-out infinite;`}

  svg { width: 16px; height: 16px; }
`;

const StepConnector = styled.div<{ $done?: boolean; $color?: string }>`
  flex: 1;
  height: 3px;
  min-width: 28px;
  margin-top: 17px; /* center on the 36px circle */
  border-radius: 2px;
  background: ${({ $done, $color, theme }) =>
    $done
      ? `linear-gradient(90deg, ${$color || theme.colors.green}, ${$color || theme.colors.blue})`
      : theme.colors.border};
  transition: background 0.3s;
`;

const StepLabel = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
  line-height: 1.3;
  word-break: break-word;
`;

const StepDate = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-family: 'JetBrains Mono', monospace;
`;

/* step icons */
const StepIconCheck = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8.5l3.5 3.5L13 5"/></svg>
);
const StepIconPlay = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l8 5-8 5V3z"/></svg>
);
const StepIconCircle = () => (
  <svg viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3"/></svg>
);
const StepIconFail = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
);

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
  &:active { transform: translateY(0); }
`;

const AgentPanel: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const dark = theme.mode === 'dark';
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
            {agentCards.map((ag) => {
              const c = AGENT_COLORS[ag.skill] ?? AGENT_COLORS.S1;
              return (
                <ClickableCard
                  key={ag.skill}
                  onClick={() => setSelectedSkill(ag.skill)}
                  $accent={c.accent}
                  $bg1={dark ? 'rgba(30,41,59,0.85)' : c.bg1}
                  $bg2={dark ? 'rgba(30,41,59,0.65)' : c.bg2}
                >
                  <AgentCardTop>
                    <AgentName $fg={dark ? c.fgDark : c.fg}>{ag.name}</AgentName>
                    <StatusBadge status={ag.status as any} />
                  </AgentCardTop>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <RingGauge pct={ag.rate} color={c.accent} size={72} label={ag.skill} />
                    <AgentMeta $fg={dark ? c.fgDark : c.fg}>
                      {t('agents.tasksCompleted')}: {ag.completed}<br />
                      {t('agents.lastRun')}: {ag.lastRun}
                    </AgentMeta>
                  </div>
                  <AgentWatermark $color={c.accent}><IconRobot /></AgentWatermark>
                </ClickableCard>
              );
            })}
          </AgentStrip>

          {/* Activity Feed — real notifications */}
          <PanelCard>
            <PanelTitle>{t('agents.activityFeed')}</PanelTitle>
            <FeedList>
              {notifications.length === 0 && (
                <FeedCardBody style={{ padding: '12px 0', opacity: 0.5 }}>暫無活動記錄</FeedCardBody>
              )}
              {notifications.slice(0, 8).map((n) => {
                const ev = NOTIF_EVENT_MAP[n.type] || 'qualify';
                return (
                  <FeedCard key={n._id} $event={ev}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <FeedTag $event={ev}>{n.type || 'system'}</FeedTag>
                      <FeedCardTime>{formatTime(n.created_at)}</FeedCardTime>
                    </div>
                    <FeedCardTitle>{n.title}</FeedCardTitle>
                    {n.message && <FeedCardBody>{n.message}</FeedCardBody>}
                  </FeedCard>
                );
              })}
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
              <StepperWrap>
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
                  const stepColor = task.status === 'failed' ? '#ef4444' : undefined;
                  const StepIcon = task.status === 'completed' ? StepIconCheck
                    : task.status === 'failed' ? StepIconFail
                    : task.status === 'running' ? StepIconPlay
                    : StepIconCircle;
                  const isLast = i === selectedTasks.length - 1;
                  return (
                    <React.Fragment key={task.task_id || i}>
                      <StepNode $status={status}>
                        <StepCircle $status={task.status === 'failed' ? 'active' : status} $color={stepColor}>
                          <StepIcon />
                        </StepCircle>
                        <StepLabel>{task.title || task.task_id}</StepLabel>
                        <StepDate>{dateLabel}</StepDate>
                      </StepNode>
                      {!isLast && (
                        <StepConnector
                          $done={status === 'done'}
                          $color={stepColor}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </StepperWrap>
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
