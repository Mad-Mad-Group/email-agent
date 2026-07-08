import React, { useMemo, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled, { useTheme, keyframes } from 'styled-components';
import { useLeads, useEmailQueue } from '../../api/hooks';
import { Lead } from '../../api/leads';
import { EmailItem } from '../../api/emailQueue';
import { media } from '../../styles/media';

/* ══════════════════════════════════════
   Lead Scraper CMS Dashboard — v2
   ══════════════════════════════════════ */

/* ── Layout ── */

const Page = styled.div`display: flex; flex-direction: column; gap: 20px; padding-bottom: 32px; overflow: hidden; min-width: 0;`;

const HeaderRow = styled.div`
  display: flex; align-items: flex-end; justify-content: space-between;
  ${media.mobile} { flex-direction: column; align-items: flex-start; gap: 8px; }
`;
const PageTitle = styled.h1`font-size: 1.25rem; font-weight: 700; margin: 0; color: ${({ theme }) => theme.colors.textPrimary};`;
const PageSub = styled.p`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin: 2px 0 0;`;

/* ── Row grid ── */
const Row = styled.div<{ $cols?: string; $gap?: number }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || '1fr'};
  gap: ${({ $gap }) => $gap ?? 16}px;
  ${media.mobile} { grid-template-columns: 1fr; }
  ${media.tabletDown} { grid-template-columns: 1fr; }
`;

/* ── Card ── */
const Card = styled.div<{ $topAccent?: string }>`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  min-width: 0; overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: ${({ $topAccent }) => $topAccent ? `4px solid ${$topAccent}55` : undefined};
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
`;
const CardHeader = styled.div`
  padding: 16px 20px; font-size: 1rem; font-weight: 700; letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;
const CardHeaderRight = styled.span`
  margin-left: auto; font-size: 0.6875rem; font-weight: 400;
  color: ${({ theme }) => theme.colors.textTertiary}; text-transform: none;
`;
const CardBody = styled.div`padding: 16px 20px 20px;`;
const CardIcon = styled.span<{ $color: string }>`
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  background: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};
`;

/* ── Action Cards (LUNO-style: left bar + gradient + watermark) ── */
const ActionGrid = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
  ${media.tabletDown} { grid-template-columns: repeat(2, 1fr); }
  ${media.mobile} { grid-template-columns: 1fr; }
`;
const ActionCard = styled.div<{ $accent: string; $bg1: string; $bg2: string }>`
  position: relative; border-radius: 14px; padding: 22px 20px 18px;
  background: linear-gradient(135deg, ${({ $bg1 }) => $bg1}, ${({ $bg2 }) => $bg2});
  border-left: 4px solid ${({ $accent }) => $accent};
  cursor: pointer; overflow: hidden;
  transition: transform 0.18s, box-shadow 0.18s;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.10); }
`;
const ActionWatermark = styled.div<{ $fg: string }>`
  position: absolute; right: -6px; bottom: -8px;
  width: 64px; height: 64px; opacity: 0.10;
  color: ${({ $fg }) => $fg};
  svg { width: 100%; height: 100%; }
`;
const ActionArrow = styled.div<{ $fg: string }>`
  position: absolute; top: 14px; right: 14px; width: 22px; height: 22px;
  border-radius: 50%; background: rgba(255,255,255,0.45);
  display: flex; align-items: center; justify-content: center;
  color: ${({ $fg }) => $fg}; font-size: 0.65rem;
`;
const ActionTitle = styled.div<{ $fg: string }>`
  font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: ${({ $fg }) => $fg}; opacity: 0.55;
  margin-bottom: 6px;
`;
const ActionCount = styled.div<{ $fg: string }>`
  font-size: 2.25rem; font-weight: 800; color: ${({ $fg }) => $fg}; line-height: 1;
`;
const ActionLabel = styled.div<{ $fg: string }>`
  font-size: 0.75rem; font-weight: 500; color: ${({ $fg }) => $fg};
  margin-top: 10px; opacity: 0.75; line-height: 1.35;
`;

/* ── Bar Chart ── */
interface BarData { label: string; value: number; color: string; formula?: string }

const niceCeil = (v: number): number => {
  if (v <= 0) return 5;
  const steps = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 50000, 100000];
  const target = v * 3;
  return steps.find(s => s >= target) ?? Math.ceil(target);
};

const BarChartTooltip = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: absolute;
  left: ${({ $x }) => $x}px; top: ${({ $y }) => $y}px;
  transform: translate(-50%, -100%);
  background: #1e293b; color: #fff; font-size: 0.6875rem; font-weight: 600;
  padding: 4px 10px; border-radius: 8px; pointer-events: none; white-space: nowrap;
  opacity: ${({ $visible }) => $visible ? 1 : 0}; transition: opacity 0.12s; z-index: 10; white-space: pre-line; text-align: center;
  &::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 4px solid transparent; border-top-color: #1e293b; }
`;
const BarChartWrap = styled.div`
  position: relative; padding: 8px; border-radius: 8px;
  background-image:
    linear-gradient(${({ theme }) => theme.mode === 'dark' ? 'rgba(148,163,184,0.04)' : 'rgba(148,163,184,0.08)'} 1px, transparent 1px),
    linear-gradient(90deg, ${({ theme }) => theme.mode === 'dark' ? 'rgba(148,163,184,0.04)' : 'rgba(148,163,184,0.08)'} 1px, transparent 1px);
  background-size: 18px 18px;
`;

const BarChart: React.FC<{ bars: BarData[]; dark?: boolean }> = ({ bars, dark }) => {
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const w = 440, h = 180, pl = 80, pr = 12, pt = 6, pb = 22;
  const chartW = w - pl - pr, chartH = h - pt - pb;
  const rawMax = Math.max(...bars.map(b => b.value));
  const maxVal = niceCeil(rawMax);
  const barH = Math.min(20, (chartH / bars.length) * 0.55);
  const gap = chartH / bars.length;
  const tickCount = maxVal <= 5 ? maxVal : Math.min(5, maxVal);
  const tickStep = maxVal / tickCount;
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) ticks.push(Math.round(tickStep * i));

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>, idx: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setHover({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top - 6 });
  }, []);

  return (
    <BarChartWrap>
      {hover !== null && (
        <BarChartTooltip $x={hover.x} $y={hover.y} $visible>
          {bars[hover.idx].label}: {bars[hover.idx].value}
          {bars[hover.idx].formula && <><br/><span style={{ opacity: 0.7, fontSize: '0.625rem' }}>{bars[hover.idx].formula}</span></>}
        </BarChartTooltip>
      )}
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        <defs>
          {bars.map((b, i) => (
            <linearGradient key={i} id={`bar${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={b.color} stopOpacity="0.65" />
              <stop offset="100%" stopColor={b.color} stopOpacity="0.95" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((tick, i) => {
          const x = pl + (tick / maxVal) * chartW;
          return (
            <g key={`tick${i}`}>
              <line x1={x} y1={pt} x2={x} y2={pt + chartH} stroke={dark ? '#334155' : '#e2e8f0'} strokeWidth="0.5" strokeDasharray={i === 0 ? undefined : '3,3'} />
              <text x={x} y={pt + chartH + 14} textAnchor="middle" fill={dark ? '#64748b' : '#94a3b8'} fontSize="8" fontWeight="400">{tick}</text>
            </g>
          );
        })}
        {bars.map((b, i) => {
          const y = pt + gap * i + (gap - barH) / 2;
          const barW = maxVal > 0 ? Math.max((b.value / maxVal) * chartW, b.value > 0 ? 6 : 0) : 0;
          const r = 5;
          return (
            <g key={i} style={{ cursor: 'pointer' }}
               onMouseMove={(e) => handleMouseMove(e as unknown as React.MouseEvent<SVGSVGElement, MouseEvent>, i)}
               onMouseLeave={() => setHover(null)}>
              <rect x={0} y={pt + gap * i} width={w} height={gap} fill="transparent" />
              <rect x={pl} y={y} width={chartW} height={barH} rx={r} ry={r} fill={dark ? '#334155' : '#f1f5f9'} />
              <rect x={pl} y={y} width={barW} height={barH} rx={r} ry={r} fill={`url(#bar${i})`} />
              <text x={pl - 6} y={y + barH / 2} textAnchor="end" fill={dark ? '#94a3b8' : '#64748b'} fontSize="8" fontWeight="500" dominantBaseline="central">{b.label}</text>
            </g>
          );
        })}
      </svg>
    </BarChartWrap>
  );
};

/* ── Donut Chart ── */
const DonutWrap = styled.div`display: flex; align-items: center; gap: 24px; justify-content: center;`;
const LegendList = styled.div`display: flex; flex-direction: column; gap: 8px;`;
const LegendItem = styled.div`display: flex; align-items: center; gap: 8px; font-size: 0.8125rem;`;
const LegendDot = styled.div<{ $color: string }>`width: 10px; height: 10px; border-radius: 50%; background: ${({ $color }) => $color}; flex-shrink: 0;`;
const LegendVal = styled.span`font-weight: 600; margin-left: auto; min-width: 20px; text-align: right;`;

const DonutChart: React.FC<{ slices: { value: number; color: string }[]; size?: number }> = ({ slices, size = 130 }) => {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return <svg width={size} height={size}><circle cx={size/2} cy={size/2} r={size/2-8} fill="none" stroke="#e5e7eb" strokeWidth="16" /></svg>;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {slices.filter(s => s.value > 0).map((sl, i) => {
        const pct = sl.value / total;
        const dash = `${pct * c} ${c}`;
        const el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={sl.color} strokeWidth="16" strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="butt" />;
        offset += pct * c;
        return el;
      })}
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: '1.5rem', fontWeight: 700, fill: 'currentColor' }}>
        {total}
      </text>
    </svg>
  );
};

/* ── Activity Feed ── */
/* ── Notebook-style Activity Feed ── */
const NotebookCard = styled(Card)`
  position: relative;
`;
const NotebookBody = styled.div`
  padding: 0 20px 20px 48px; position: relative;
  /* red margin line */
  &::before {
    content: ''; position: absolute; top: 0; bottom: 0; left: 40px;
    width: 1.5px; background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.35)'};
  }
  /* hole punches */
  &::after {
    content: '';
    position: absolute; top: 16px; left: 12px;
    width: 10px; height: 10px; border-radius: 50%;
    background: ${({ theme }) => theme.mode === 'dark' ? '#0f172a' : '#f1f5f9'};
    border: 1.5px solid ${({ theme }) => theme.colors.border};
    box-shadow:
      0 34px 0 ${({ theme }) => theme.mode === 'dark' ? '#0f172a' : '#f1f5f9'},
      0 34px 0 0 ${({ theme }) => theme.colors.border},
      0 68px 0 ${({ theme }) => theme.mode === 'dark' ? '#0f172a' : '#f1f5f9'},
      0 68px 0 0 ${({ theme }) => theme.colors.border};
  }
`;
const FeedList = styled.div`display: flex; flex-direction: column; gap: 0;`;
const FeedItem = styled.div`
  display: flex; gap: 14px; padding: 11px 0;
  /* ruled lines */
  background-image: linear-gradient(${({ theme }) => theme.mode === 'dark' ? 'rgba(148,163,184,0.06)' : 'rgba(148,163,184,0.15)'} 1px, transparent 1px);
  background-size: 100% 100%;
  background-position: bottom;
`;
const FeedIcon = styled.div<{ $bg: string; $fg: string }>`
  width: 28px; height: 28px; border-radius: 8px;
  background: ${({ $bg }) => $bg}; color: ${({ $fg }) => $fg};
  border: 1.5px solid ${({ $fg }) => $fg}25;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; flex-shrink: 0;
`;
const FeedBody = styled.div`flex: 1; min-width: 0;`;
const FeedText = styled.div`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textPrimary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
const FeedTime = styled.div`font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 2px; font-style: italic;`;
const Empty = styled.div`text-align: center; padding: 32px 16px; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};`;

/* ── LUNO-style Spinner ── */
const spinAnim = keyframes`to { transform: rotate(360deg); }`;
const SpinnerWrap = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; padding: 80px 0;
`;
const Spinner = styled.div<{ $color?: string }>`
  width: 40px; height: 40px; border-radius: 50%;
  border: 3px solid ${({ theme }) => theme.mode === 'dark' ? '#334155' : '#e2e8f0'};
  border-top-color: ${({ $color, theme }) => $color || theme.colors.blue};
  animation: ${spinAnim} 0.75s linear infinite;
`;
const SpinnerText = styled.div`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};`;

/* ── Spiral-bound Calendar card ── */
const SpiralCard = styled(Card)`
  position: relative; overflow: visible;
  /* stacked-paper shadow */
  &::before, &::after {
    content: ''; position: absolute; border-radius: 14px;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
  &::before { left: 4px; right: 4px; bottom: -4px; height: 6px; z-index: -1; opacity: 0.7; }
  &::after  { left: 8px; right: 8px; bottom: -8px; height: 6px; z-index: -2; opacity: 0.4; }
`;
const SchedList = styled.div`display: flex; flex-direction: column; gap: 0;`;
const SchedItem = styled.div`
  display: flex; align-items: center; gap: 14px;
  padding: 12px 0;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
`;
const SchedDot = styled.div<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $color }) => $color};
`;
const SchedBody = styled.div`flex: 1; min-width: 0;`;
const SchedTitle = styled.div`
  font-size: 0.8125rem; font-weight: 500; color: ${({ theme }) => theme.colors.textPrimary};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`;
const SchedSub = styled.div`
  font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 2px;
`;
const SchedBadge = styled.div<{ $bg: string; $fg: string }>`
  font-size: 0.625rem; font-weight: 600; padding: 2px 8px; border-radius: 10px;
  background: ${({ $bg }) => $bg}; color: ${({ $fg }) => $fg}; flex-shrink: 0;
  text-transform: uppercase;
`;
const CalendarLink = styled.div`
  padding: 10px 0 0; text-align: right;
  a { font-size: 0.75rem; font-weight: 500; color: ${({ theme }) => theme.colors.blue};
    text-decoration: none; &:hover { text-decoration: underline; } }
`;

/* ── SVG Icons ── */
const IconDraft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconReplyArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
/* Card header icons (for chart modules) */
const IconFunnel = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);
const IconPieChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconSent = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IconReply = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
  </svg>
);
const IconPen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
  </svg>
);

/* ══════════ Helpers ══════════ */

const timeAgo = (dateStr: string | undefined, t: (key: string, opts?: Record<string, unknown>) => string) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('dashboard.justNow');
  if (mins < 60) return t('dashboard.minutesAgo', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('dashboard.hoursAgo', { count: hrs });
  const days = Math.floor(hrs / 24);
  return t('dashboard.daysAgo', { count: days });
};

/* ══════════ COMPONENT ══════════ */

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dark = theme.mode === 'dark';
  const navigate = useNavigate();

  const { data: leadsData, isLoading: leadsLoading } = useLeads({ page: 1, limit: 100 });
  const { data: emailData, isLoading: emailsLoading } = useEmailQueue({ page: 1, limit: 100 });

  const allLeads: Lead[] = leadsData?.data || [];
  const allEmails: EmailItem[] = emailData?.data || [];

  // ── Stats (header pills) ──
  const stats = useMemo(() => {
    const total = allLeads.length;
    const contacted = allLeads.filter(l => l.status === 'contacted').length;
    const replied = allLeads.filter(l => l._replied).length;
    const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;
    const sentEmails = allEmails.filter(e => e.status === 'sent').length;
    return { total, contacted, replied, replyRate, sentEmails };
  }, [allLeads, allEmails]);

  // ── Action queue ──
  const actions = useMemo(() => {
    const pendingDrafts = allEmails.filter(e => e.status === 'pending').length;
    const newReplies = allLeads.filter(l => l._replied && l._reply_category && l._reply_category !== 'auto_reply' && l._reply_category !== 'not_interested').length;
    const pendingMeetings = allLeads.filter(l => l._pending_meeting).length;
    const noReplyNoFollowup = allLeads.filter(l => l.status === 'contacted' && !l._replied && !l._followup_count).length;
    const totalUrgent = pendingDrafts + newReplies + pendingMeetings + noReplyNoFollowup;
    return { pendingDrafts, newReplies, pendingMeetings, noReplyNoFollowup, totalUrgent };
  }, [allLeads, allEmails]);

  // ── Funnel ──
  const funnel = useMemo(() => {
    const total = allLeads.length;
    const contacted = allLeads.filter(l => l.status === 'contacted').length;
    const replied = allLeads.filter(l => l._replied).length;
    const meetings = allLeads.filter(l => l._reply_category === 'meeting').length;
    return { total, contacted, replied, meetings };
  }, [allLeads]);

  // ── Reply categories ──
  const replyCats = useMemo(() => {
    const cats = { interested: 0, meeting: 0, question: 0, not_interested: 0, auto_reply: 0 };
    allLeads.forEach(l => {
      if (l._replied && l._reply_category) {
        const key = l._reply_category as keyof typeof cats;
        if (key in cats) cats[key]++;
      }
    });
    return cats;
  }, [allLeads]);

  // ── Recent activity ──
  const recentActivity = useMemo(() => {
    const items: { type: 'sent' | 'reply' | 'draft'; text: string; time: string; date: string }[] = [];

    allEmails
      .filter(e => e.status === 'sent' && e.sent_at)
      .sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || ''))
      .slice(0, 5)
      .forEach(e => items.push({
        type: 'sent',
        text: t('dashboard.sentTo', { target: e.company_name || e.to_email }) + (e._type === 'followup' ? t('dashboard.followup') : e._type === 'reply' ? t('dashboard.reply') : ''),
        time: timeAgo(e.sent_at, t), date: e.sent_at || '',
      }));

    allLeads
      .filter(l => l._replied && l._reply_at)
      .sort((a, b) => (b._reply_at || '').localeCompare(a._reply_at || ''))
      .slice(0, 5)
      .forEach(l => {
        const catLabel: Record<string, string> = {
          interested: t('dashboard.interestedCat'), meeting: t('dashboard.meetingLabel'), question: t('dashboard.questionCat'),
          not_interested: t('dashboard.notInterestedCat'), auto_reply: t('dashboard.autoReplyCat'),
        };
        items.push({
          type: 'reply',
          text: t('dashboard.repliedWith', { company: l.company_name, category: catLabel[l._reply_category || ''] || l._reply_category || '' }),
          time: timeAgo(l._reply_at, t), date: l._reply_at || '',
        });
      });

    allEmails
      .filter(e => e.status === 'pending')
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 3)
      .forEach(e => items.push({
        type: 'draft',
        text: t('dashboard.newDraft', { target: e.company_name || e.to_email }) + (e._type === 'followup' ? t('dashboard.followup') : e._type === 'reply' ? t('dashboard.reply') : t('dashboard.outreach')),
        time: timeAgo(e.created_at, t), date: e.created_at || '',
      }));

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [allLeads, allEmails, t]);

  // ── Upcoming schedule (pending + approved emails) ──
  const upcomingSchedule = useMemo(() => {
    return allEmails
      .filter(e => e.status === 'pending' || e.status === 'approved')
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
      .slice(0, 6)
      .map(e => ({
        id: e._id,
        to: e.company_name || e.to_email || '',
        subject: e.subject || '',
        status: e.status as 'pending' | 'approved',
        type: (e._type || 'outreach') as string,
        time: timeAgo(e.created_at, t),
      }));
  }, [allEmails, t]);

  const loading = leadsLoading || emailsLoading;
  if (loading) return <Page><SpinnerWrap><Spinner /><SpinnerText>{t('dashboard.loading')}</SpinnerText></SpinnerWrap></Page>;

  return (
    <Page>
      {/* ── Header ── */}
      <HeaderRow>
        <div>
          <PageTitle>{t('dashboard.title')}</PageTitle>
          <PageSub>{t('dashboard.subtitle')}</PageSub>
        </div>
      </HeaderRow>

      {/* ── Action Cards (LUNO-style) ── */}
      <ActionGrid>
        <ActionCard
          $accent="#d97706" $bg1={dark ? 'rgba(251,191,36,0.06)' : '#fffbeb'} $bg2={dark ? 'rgba(251,191,36,0.12)' : '#fef3c7'}
          onClick={() => navigate('/cms-email?status=pending')}
        >
          <ActionArrow $fg={dark ? '#fbbf24' : '#b45309'}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </ActionArrow>
          <ActionWatermark $fg="#d97706"><IconDraft /></ActionWatermark>
          <ActionTitle $fg={dark ? '#fbbf24' : '#92400e'}>{t('dashboard.cardTitleDraft')}</ActionTitle>
          <ActionCount $fg={dark ? '#fbbf24' : '#b45309'}>{actions.pendingDrafts}</ActionCount>
          <ActionLabel $fg={dark ? '#fbbf24' : '#b45309'}>{t('dashboard.draftsPendingApproval')}</ActionLabel>
        </ActionCard>

        <ActionCard
          $accent="#16a34a" $bg1={dark ? 'rgba(74,222,128,0.06)' : '#f0fdf4'} $bg2={dark ? 'rgba(74,222,128,0.12)' : '#dcfce7'}
          onClick={() => navigate('/cms-leads?tab=replied')}
        >
          <ActionArrow $fg={dark ? '#4ade80' : '#15803d'}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </ActionArrow>
          <ActionWatermark $fg="#16a34a"><IconReplyArrow /></ActionWatermark>
          <ActionTitle $fg={dark ? '#4ade80' : '#14532d'}>{t('dashboard.cardTitleReply')}</ActionTitle>
          <ActionCount $fg={dark ? '#4ade80' : '#15803d'}>{actions.newReplies}</ActionCount>
          <ActionLabel $fg={dark ? '#4ade80' : '#15803d'}>{t('dashboard.newRepliesToHandle')}</ActionLabel>
        </ActionCard>

        <ActionCard
          $accent="#7c3aed" $bg1={dark ? 'rgba(196,181,253,0.06)' : '#faf5ff'} $bg2={dark ? 'rgba(196,181,253,0.12)' : '#ede9fe'}
          onClick={() => navigate('/cms-leads?tab=replied&sub=meeting')}
        >
          <ActionArrow $fg={dark ? '#c4b5fd' : '#7c3aed'}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </ActionArrow>
          <ActionWatermark $fg="#7c3aed"><IconClock /></ActionWatermark>
          <ActionTitle $fg={dark ? '#c4b5fd' : '#5b21b6'}>{t('dashboard.cardTitleMeeting')}</ActionTitle>
          <ActionCount $fg={dark ? '#c4b5fd' : '#7c3aed'}>{actions.pendingMeetings}</ActionCount>
          <ActionLabel $fg={dark ? '#c4b5fd' : '#7c3aed'}>{t('dashboard.pendingMeetings')}</ActionLabel>
        </ActionCard>

        <ActionCard
          $accent="#dc2626" $bg1={dark ? 'rgba(252,165,165,0.06)' : '#fef2f2'} $bg2={dark ? 'rgba(252,165,165,0.12)' : '#fee2e2'}
          onClick={() => navigate('/cms-leads?tab=awaiting&sub=no_followup')}
        >
          <ActionArrow $fg={dark ? '#fca5a5' : '#b91c1c'}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </ActionArrow>
          <ActionWatermark $fg="#dc2626"><IconAlert /></ActionWatermark>
          <ActionTitle $fg={dark ? '#fca5a5' : '#991b1b'}>{t('dashboard.cardTitleFollowup')}</ActionTitle>
          <ActionCount $fg={dark ? '#fca5a5' : '#b91c1c'}>{actions.noReplyNoFollowup}</ActionCount>
          <ActionLabel $fg={dark ? '#fca5a5' : '#b91c1c'}>{t('dashboard.contactedNoFollowup')}</ActionLabel>
        </ActionCard>
      </ActionGrid>

      {/* ── Funnel (60%) + Reply Distribution (40%) ── */}
      <Row $cols="3fr 2fr">
        <Card $topAccent="#3b82f6">
          <CardHeader>
            <CardIcon $color="#3b82f6"><IconFunnel /></CardIcon>
            {t('dashboard.funnel')}
          </CardHeader>
          <CardBody>
            <BarChart dark={dark} bars={[
              { label: `${t('dashboard.newLeads')} (${funnel.total})`, value: funnel.total, color: '#3b82f6',
                formula: t('dashboard.tipTotalLeads', { count: funnel.total }) },
              { label: `${t('dashboard.contacted')} ${funnel.total > 0 ? Math.round((funnel.contacted / funnel.total) * 100) : 0}%`, value: funnel.contacted, color: '#f59e0b',
                formula: t('dashboard.tipContactRate', { contacted: funnel.contacted, total: funnel.total }) },
              { label: `${t('dashboard.replied')} ${funnel.contacted > 0 ? Math.round((funnel.replied / funnel.contacted) * 100) : 0}%`, value: funnel.replied, color: '#22c55e',
                formula: t('dashboard.tipReplyRate', { replied: funnel.replied, contacted: funnel.contacted }) },
              { label: `${t('dashboard.meetings')} ${funnel.replied > 0 ? Math.round((funnel.meetings / funnel.replied) * 100) : 0}%`, value: funnel.meetings, color: '#8b5cf6',
                formula: t('dashboard.tipMeetingRate', { meetings: funnel.meetings, replied: funnel.replied }) },
              { label: `${t('dashboard.totalEmailsSent')} (${stats.sentEmails})`, value: stats.sentEmails, color: '#ec4899',
                formula: t('dashboard.tipEmailsSent', { sent: stats.sentEmails, total: allEmails.length }) },
            ]} />
          </CardBody>
        </Card>

        <Card $topAccent="#22c55e">
          <CardHeader>
            <CardIcon $color="#22c55e"><IconPieChart /></CardIcon>
            {t('dashboard.replyDistribution')}
          </CardHeader>
          <CardBody>
            {stats.replied === 0 ? (
              <Empty>{t('dashboard.noReplyData')}</Empty>
            ) : (
              <DonutWrap>
                <DonutChart slices={[
                  { value: replyCats.interested, color: '#16a34a' },
                  { value: replyCats.meeting, color: '#8b5cf6' },
                  { value: replyCats.question, color: '#2563eb' },
                  { value: replyCats.not_interested, color: '#dc2626' },
                  { value: replyCats.auto_reply, color: '#94a3b8' },
                ]} />
                <LegendList>
                  <LegendItem><LegendDot $color="#16a34a" /> {t('dashboard.interested')} <LegendVal>{replyCats.interested}</LegendVal></LegendItem>
                  <LegendItem><LegendDot $color="#8b5cf6" /> {t('dashboard.meetingCat')} <LegendVal>{replyCats.meeting}</LegendVal></LegendItem>
                  <LegendItem><LegendDot $color="#2563eb" /> {t('dashboard.question')} <LegendVal>{replyCats.question}</LegendVal></LegendItem>
                  <LegendItem><LegendDot $color="#dc2626" /> {t('dashboard.notInterested')} <LegendVal>{replyCats.not_interested}</LegendVal></LegendItem>
                  <LegendItem><LegendDot $color="#94a3b8" /> {t('dashboard.autoReply')} <LegendVal>{replyCats.auto_reply}</LegendVal></LegendItem>
                </LegendList>
              </DonutWrap>
            )}
          </CardBody>
        </Card>
      </Row>

      {/* ── Upcoming Schedule (40%) + Recent Activity (60%) ── */}
      <Row $cols="2fr 3fr">
        <SpiralCard $topAccent="#f59e0b">
          <CardHeader>
            <CardIcon $color="#f59e0b"><IconCalendar /></CardIcon>
            {t('dashboard.upcomingSchedule')}
            <CardHeaderRight>{t('dashboard.todaySchedules', { count: upcomingSchedule.length })}</CardHeaderRight>
          </CardHeader>
          <CardBody>
            {upcomingSchedule.length === 0 ? (
              <Empty>{t('dashboard.noUpcomingSchedule')}</Empty>
            ) : (
              <SchedList>
                {upcomingSchedule.map(s => (
                  <SchedItem key={s.id}>
                    <SchedDot $color={s.status === 'approved' ? '#22c55e' : '#f59e0b'} />
                    <SchedBody>
                      <SchedTitle>{s.to}</SchedTitle>
                      <SchedSub>{s.subject}</SchedSub>
                    </SchedBody>
                    <SchedBadge
                      $bg={s.status === 'approved' ? (dark ? 'rgba(34,197,94,0.15)' : '#dcfce7') : (dark ? 'rgba(245,158,11,0.15)' : '#fef3c7')}
                      $fg={s.status === 'approved' ? '#16a34a' : '#d97706'}
                    >
                      {t(`dashboard.${s.status}`)}
                    </SchedBadge>
                  </SchedItem>
                ))}
              </SchedList>
            )}
            <CalendarLink>
              <a href="/cms-email" onClick={e => { e.preventDefault(); navigate('/cms-email'); }}>
                {t('dashboard.viewFullCalendar')}
              </a>
            </CalendarLink>
          </CardBody>
        </SpiralCard>

        <NotebookCard $topAccent="#64748b">
          <CardHeader>
            <CardIcon $color="#64748b"><IconActivity /></CardIcon>
            {t('dashboard.recentActivity')}
          </CardHeader>
          <NotebookBody>
            {recentActivity.length === 0 ? (
              <Empty>{t('dashboard.noActivity')}</Empty>
            ) : (
              <FeedList>
                {recentActivity.map((item, i) => (
                  <FeedItem key={i}>
                    <FeedIcon
                      $bg={item.type === 'sent' ? (dark ? '#1e3a5f' : '#dbeafe') : item.type === 'reply' ? (dark ? '#14532d' : '#dcfce7') : (dark ? '#422006' : '#fef3c7')}
                      $fg={item.type === 'sent' ? '#3b82f6' : item.type === 'reply' ? '#22c55e' : '#f59e0b'}
                    >
                      {item.type === 'sent' ? <IconSent /> : item.type === 'reply' ? <IconReply /> : <IconPen />}
                    </FeedIcon>
                    <FeedBody>
                      <FeedText>{item.text}</FeedText>
                      <FeedTime>{item.time}</FeedTime>
                    </FeedBody>
                  </FeedItem>
                ))}
              </FeedList>
            )}
          </NotebookBody>
        </NotebookCard>
      </Row>
    </Page>
  );
};

export default Dashboard;
