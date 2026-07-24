import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled, { useTheme, keyframes, css } from 'styled-components';
import { useLeads, useEmailQueue, useTokenTimeseries, useTokenBalance } from '../../api/hooks';
import { Lead } from '../../api/leads';
import { EmailItem } from '../../api/emailQueue';
import { media } from '../../styles/media';
import { glassSurface } from '../../styles/glassSurface';
import SpriteAvatar from '../../components/SpriteAvatar';
import { AGENTS, FARMER, ACTIVITY_AGENT } from '../../config/agents';

/* ══════════════════════════════════════
   Lead Scraper CMS Dashboard — v3
   ══════════════════════════════════════ */

/* ── Layout ── */

const Page = styled.div`
  display: flex; flex-direction: column; gap: 24px;
  padding: 32px 28px 40px; min-width: 0; overflow-x: hidden;
  ${media.tablet} { padding: 20px 16px 28px; gap: 16px; }
  ${media.mobile} { padding: 20px 16px 32px; }
`;

/* ── Intelly Greeting ── */
const GreetingBlock = styled.div`display: flex; flex-direction: column; gap: 4px;`;
const GreetingHeading = styled.h1`
  font-size: 1.75rem; font-weight: 700; margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
  font-family: ${({ theme }) => theme.fonts.primary};
  ${media.tablet} { font-size: 1.35rem; }
`;
const GreetingDate = styled.p`
  font-size: 0.875rem; margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/* ── Dashboard Grid: full width, no calendar sidebar ── */
const DashGrid = styled.div`
  display: flex; flex-direction: column; gap: 20px;
`;
const CardsArea = styled.div`
  display: flex; flex-direction: column; gap: 20px; min-width: 0;
`;
const CardRow = styled.div`
  display: flex; gap: 20px; align-items: stretch;
  ${media.tablet} { gap: 12px; }
  ${media.mobile} { flex-direction: column; }
`;
/* Embedded section inside a board — no bg, dark text */
const EmbedTitle = styled.div`
  font-size: 0.8125rem; font-weight: 700; letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex; align-items: center; gap: 8px;
  padding: 4px 0;
`;
const EmbedSection = styled.div`
  padding: 0;
`;

/* ── Card ── */
const Card = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  min-width: 0; overflow: hidden;
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
`;
const CardHeader = styled.div`
  padding: 16px 20px; font-size: 1rem; font-weight: 700; letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  ${media.tablet} { padding: 10px 14px; font-size: 0.8125rem; }
`;
const CardHeaderRight = styled.span`
  margin-left: auto; font-size: 0.6875rem; font-weight: 400;
  color: ${({ theme }) => theme.colors.textTertiary}; text-transform: none;
`;
const CardBody = styled.div`
  padding: 16px 20px 20px;
  ${media.tablet} { padding: 10px 14px 14px; }
`;
const CardIcon = styled.span<{ $color: string }>`
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  background: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};
`;

/* ── Intelly Pastel Stat Cards ── */
const ActionCard = styled.div<{ $accent: string; $pastel: string }>`
  position: relative; border-radius: ${({ theme }) => theme.radii.card}px;
  padding: 24px 20px 20px;
  background: ${({ $pastel }) => $pastel};
  cursor: pointer; overflow: hidden;
  display: flex; flex-direction: column;
  min-width: 0;
  transition: transform ${({ theme }) => theme.motion.fast}, box-shadow ${({ theme }) => theme.motion.fast};
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.10); }
  ${media.tablet} { padding: 16px 14px 14px; }
`;
const ActionWatermark = styled.div<{ $fg: string; $rot?: number }>`
  position: absolute; right: -8px; top: -10px;
  width: 105px; height: 105px; opacity: 0.38;
  color: ${({ $fg }) => $fg}; z-index: 1; pointer-events: none;
  transform: rotate(${({ $rot }) => $rot ?? 14}deg);
  svg { width: 100%; height: 100%; }
  ${media.tablet} { width: 70px; height: 70px; right: -4px; top: -6px; }
`;
const ActionArrow = styled.div<{ $fg: string }>`
  position: absolute; top: 16px; right: 16px; width: 24px; height: 24px;
  border-radius: 50%; background: ${({ $fg }) => $fg}18;
  display: flex; align-items: center; justify-content: center;
  color: ${({ $fg }) => $fg}; font-size: 0.65rem;
`;
const ActionTitle = styled.div`
  font-size: 1.75rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.06em; color: ${({ theme }) => theme.colors.textPrimary};
  opacity: 0.7; margin-bottom: 8px;
  ${media.tablet} { font-size: 1.1rem; margin-bottom: 4px; }
`;
const ActionCountRow = styled.div`
  display: flex; align-items: baseline; gap: 10px;
`;
const ActionCount = styled.div`
  font-size: 2.5rem; font-weight: 800; color: ${({ theme }) => theme.colors.textPrimary}; line-height: 1;
  ${media.tablet} { font-size: 1.75rem; }
`;
const ActionLabel = styled.div`
  font-size: 0.8125rem; font-weight: 500; color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 10px; line-height: 1.35;
  ${media.tablet} { font-size: 0.75rem; margin-top: 6px; }
`;
const ActionTrend = styled.div<{ $up?: boolean }>`
  display: flex; align-items: center; gap: 10px;
  font-size: 1rem; font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  ${media.tablet} { font-size: 0.8rem; gap: 6px; }
`;
const MiniBar = styled.div<{ $color: string; $pct: number }>`
  height: 8px; border-radius: 4px; flex: 1; min-width: 80px; max-width: 200px;
  background: ${({ theme }) => `${theme.colors.textPrimary}18`};
  position: relative;
  &::after {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0;
    width: ${({ $pct }) => Math.min($pct, 100)}%;
    background: ${({ $pct, theme }) => {
      const a = 0.3 + (Math.min($pct, 100) / 100) * 0.7;
      return `${theme.colors.textPrimary}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
    }};
    border-radius: 4px;
    transition: width 0.4s ease;
  }
`;

/* ── Vertical Funnel (inside pastel card) ── */
interface VFunnelBar { label: string; value: number; pct: string }
const StatsRow = styled.div`
  display: flex; align-items: flex-start; gap: 16px; padding-right: 28px;
  flex-wrap: wrap;
`;
const StatsLeft = styled.div`
  flex: 1; min-width: 0;
`;
const VFunnelWrap = styled.div`
  display: flex; align-items: flex-end; gap: 8px; padding: 0; flex-shrink: 0; margin-top: 12px;
`;
const VFunnelCol = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; width: 44px;
`;
const VFunnelBar = styled.div<{ $h: number; $opacity: number }>`
  width: 100%; max-width: 18px; border-radius: 5px 5px 3px 3px;
  height: ${({ $h }) => Math.max($h, 4)}px;
  background: ${({ theme }) => theme.colors.textPrimary};
  opacity: ${({ $opacity }) => $opacity};
  transition: height 0.4s ease;
`;
const VFunnelVal = styled.div`
  font-size: 0.6875rem; font-weight: 800; color: ${({ theme }) => theme.colors.textPrimary}; line-height: 1;
`;
const VFunnelLabel = styled.div`
  font-size: 0.5rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary};
  opacity: 0.55; text-align: center; line-height: 1.15; word-break: break-word;
`;
const VFunnelPct = styled.div`
  font-size: 0.5rem; font-weight: 700; color: ${({ theme }) => theme.colors.textPrimary};
  opacity: 0.7;
`;
const VerticalFunnel: React.FC<{ bars: VFunnelBar[] }> = ({ bars }) => {
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const maxH = 56;
  return (
    <VFunnelWrap>
      {bars.map((b, i) => {
        const h = (b.value / maxVal) * maxH;
        const opacity = bars.length > 1
          ? 0.25 + 0.75 * (b.value / maxVal)
          : 0.8;
        return (
          <VFunnelCol key={i}>
            <VFunnelVal>{b.value}</VFunnelVal>
            <VFunnelPct>{b.pct}</VFunnelPct>
            <VFunnelBar $h={h} $opacity={opacity} />
            <VFunnelLabel>{b.label}</VFunnelLabel>
          </VFunnelCol>
        );
      })}
    </VFunnelWrap>
  );
};

/* ── Donut Chart ── */
const DonutWrap = styled.div`
  display: flex; align-items: center; gap: 20px; justify-content: center; padding: 8px;
  flex-wrap: wrap;
  ${media.tablet} {
    gap: 10px; padding: 2px;
    & > div:first-child svg { width: 165px; height: 165px; }
  }
`;
const LegendList = styled.div`
  display: flex; flex-direction: column; gap: 14px; flex: 1; min-width: 0;
  ${media.tablet} { gap: 10px; }
`;
const LegendRow = styled.div`display: flex; flex-direction: column; gap: 3px;`;
const LegendRowTop = styled.div`display: flex; align-items: center; gap: 6px;`;
const LegendDot = styled.div<{ $color: string }>`width: 8px; height: 8px; border-radius: 50%; background: ${({ $color }) => $color}; flex-shrink: 0;`;
const LegendLabel = styled.span`
  font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  ${media.tablet} { font-size: 0.675rem; }
`;
const LegendVal = styled.span`
  font-weight: 700; font-size: 0.72rem; margin-left: auto; white-space: nowrap; flex-shrink: 0;
  ${media.tablet} { font-size: 0.675rem; }
`;
const LegendBarTrack = styled.div`height: 8px; border-radius: 4px; background: ${({ theme }) => theme.colors.surfaceMuted}; overflow: hidden;`;
const LegendBarFill = styled.div<{ $color: string; $pct: number }>`height: 100%; border-radius: 4px; width: ${({ $pct }) => $pct}%; background: ${({ $color }) => $color}; transition: width 0.4s ease;`;

const DonutTooltip = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: absolute;
  left: ${({ $x }) => $x}px; top: ${({ $y }) => $y}px;
  transform: translate(-50%, -100%);
  background: ${({ theme }) => theme.colors.surfaceInverted}; color: ${({ theme }) => theme.colors.textInverted}; font-size: 0.6875rem; font-weight: 600;
  padding: 4px 10px; border-radius: 8px; pointer-events: none; white-space: nowrap;
  opacity: ${({ $visible }) => $visible ? 1 : 0}; transition: opacity 0.12s; z-index: 10;
  &::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 4px solid transparent; border-top-color: ${({ theme }) => theme.colors.surfaceInverted}; }
`;

const DonutChart: React.FC<{ slices: { value: number; color: string; label?: string }[]; size?: number }> = ({ slices, size = 200 }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  const strokeW = 28;
  const r = size / 2 - strokeW / 2 - 4;
  const c = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;

  if (total === 0) return (
    <svg width={size} height={size}><circle cx={cx} cy={cy} r={r} fill="none" stroke={theme.colors.border} strokeWidth={strokeW} /></svg>
  );

  let offset = 0;
  const arcs = slices.filter(s => s.value > 0).map((sl, i) => {
    const pct = sl.value / total;
    const dash = `${pct * c} ${c}`;
    const arc = { ...sl, pct, dash, offset, origIdx: i };
    offset += pct * c;
    return arc;
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>, idx: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setHover({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top - 8 });
  }, []);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {hover !== null && (
        <DonutTooltip $x={hover.x} $y={hover.y} $visible>
          {arcs[hover.idx].label}: {arcs[hover.idx].value} ({Math.round(arcs[hover.idx].pct * 100)}%)
        </DonutTooltip>
      )}
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', maxWidth: '100%', height: 'auto', flexShrink: 0 }}>
        <defs>
          {arcs.map((a, i) => (
            <linearGradient key={i} id={`donut${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={a.color} stopOpacity="0.7" />
              <stop offset="100%" stopColor={a.color} stopOpacity="1" />
            </linearGradient>
          ))}
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={strokeW} opacity={0.06} />
        <g style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
          {arcs.map((a, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={`url(#donut${i})`} strokeWidth={hover?.idx === i ? strokeW + 4 : strokeW}
              strokeDasharray={a.dash} strokeDashoffset={-a.offset} strokeLinecap="butt"
              style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease' }}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => setHover(null)} />
          ))}
        </g>
        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: '1.75rem', fontWeight: 700, fill: 'currentColor' }}>
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: '0.6rem', fontWeight: 500, fill: 'currentColor', opacity: 0.45 }}>
          {t('dashboard.replies')}
        </text>
      </svg>
    </div>
  );
};

/* ── Activity Feed ── */
const NotebookCard = styled(Card)`
  position: relative;
`;
const NotebookBody = styled.div`
  padding: 0 16px 16px 16px; position: relative;
  ${media.tablet} { padding: 0 10px 10px 10px; max-height: 140px !important; }
`;
const FeedList = styled.div`display: flex; flex-direction: column; gap: 0;`;
const FeedItem = styled.div`
  display: flex; gap: 10px; padding: 8px 0; align-items: center;
  border-bottom: 1px solid ${({ theme }) => `${theme.colors.border}80`};
  &:last-child { border-bottom: none; }
  ${media.tablet} { gap: 8px; padding: 6px 0; }
`;
const FeedIcon = styled.div<{ $bg: string; $fg: string }>`
  width: 32px; height: 32px; border-radius: 10px;
  background: ${({ $bg }) => $bg}; color: ${({ $fg }) => $fg};
  border: 1.5px solid ${({ $fg }) => $fg}25;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.875rem; flex-shrink: 0;
`;
const FeedBody = styled.div`flex: 1; min-width: 0;`;
const FeedText = styled.div`
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textPrimary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  ${media.tablet} { font-size: 0.75rem; }
`;
const FeedTime = styled.div`font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 2px; font-style: italic;`;
const FeedAgentName = styled.span<{ $color: string }>`font-weight: 600; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textSecondary};`;
const Empty = styled.div`text-align: center; padding: 32px 16px; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; display: flex; flex-direction: column; align-items: center; gap: 12px;`;

const EmptyDonutSvg: React.FC<{ borderColor: string; borderStrongColor: string }> = ({ borderColor, borderStrongColor }) => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="30" stroke={borderColor} strokeWidth="12"/>
    <path d="M40 10a30 30 0 0 1 21.2 8.8" stroke={borderStrongColor} strokeWidth="12" strokeLinecap="round"/>
  </svg>
);

/* ── Refresh button ── */
const spinOnce = keyframes`to { transform: rotate(720deg); }`;
const RefreshBtn = styled.button<{ $spinning?: boolean }>`
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 8px; border: none;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer; flex-shrink: 0; transition: background 0.15s, color 0.15s;
  &:hover { background: ${({ theme }) => theme.colors.border}; color: ${({ theme }) => theme.colors.textPrimary}; }
  ${({ $spinning }) => $spinning && css`svg { animation: ${spinOnce} 0.9s ease-in-out forwards; }`}
`;
const UpdatedAtText = styled.span`
  font-size: 0.8125rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── LUNO-style Spinner ── */
const spinAnim = keyframes`to { transform: rotate(360deg); }`;
const SpinnerWrap = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; padding: 80px 0;
`;
const Spinner = styled.div<{ $color?: string }>`
  width: 40px; height: 40px; border-radius: 50%;
  border: 3px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ $color, theme }) => $color || theme.colors.accent};
  animation: ${spinAnim} 0.75s linear infinite;
`;
const SpinnerText = styled.div`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};`;

/* ── Schedule card components ── */
const SpiralCard = styled(Card)`
  position: relative; overflow: visible;
  &::before, &::after {
    content: ''; position: absolute; border-radius: ${({ theme }) => theme.radii.card}px;
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
  a { font-size: 0.75rem; font-weight: 500; color: ${({ theme }) => theme.colors.accent};
    text-decoration: none; &:hover { text-decoration: underline; } }
`;

/* ── Embed white section inside pastel card ── */
const EmbedWhite = styled.div`
  margin-top: 32px; background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px; overflow: hidden;
  ${media.tablet} { margin-top: 14px; }
`;

/* ── Meeting list inside blue card ── */
const MtgList = styled.div`
  margin-top: 12px; display: flex; flex-direction: column; gap: 0;
`;
const MtgItem = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed ${({ theme }) => theme.colors.textPrimary}18;
  &:last-child { border-bottom: none; }
`;
const MtgDot = styled.div<{ $color: string }>`
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $color }) => $color};
`;
const MtgName = styled.div`
  font-size: 0.8125rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`;
const MtgTime = styled.div`
  font-size: 0.6875rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary}; flex-shrink: 0;
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
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
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
const IconPen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
  </svg>
);

/* ══════════════════════════════════════
   TOKEN USAGE CHART + GAUGE
   ══════════════════════════════════════ */

const TokenRow = styled.div`
  display: flex; gap: 20px; align-items: stretch;
  ${media.tablet} { gap: 12px; }
  ${media.mobile} { flex-direction: column; }
`;

const TokenChartCard = styled(Card)`
  min-width: 0;
`;

const TokenGaugeCard = styled(Card)`
  min-width: 0; display: flex; flex-direction: column;
`;

/* ── Granularity Pill Switcher ── */
const GranPillBar = styled.div`
  position: relative;
  display: flex;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  padding: 2px;
`;
const GranPillSlider = styled.div<{ $idx: number; $count: number }>`
  position: absolute;
  top: 2px; bottom: 2px;
  left: ${({ $idx, $count }) => `calc(2px + ${$idx} * (100% - 4px) / ${$count})`};
  width: ${({ $count }) => `calc((100% - 4px) / ${$count})`};
  background: ${({ theme }) => theme.colors.accent};
  border-radius: 18px;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;
const GranPillBtn = styled.button<{ $active?: boolean }>`
  position: relative; z-index: 1;
  padding: 5px 14px;
  border: none; border-radius: 18px;
  font-size: 0.75rem; font-weight: 600;
  cursor: pointer; background: transparent;
  color: ${({ $active, theme }) => $active ? theme.colors.textInverted : theme.colors.textSecondary};
  transition: color 0.25s;
  &:hover { opacity: 0.8; }
`;

const GRAN_OPTIONS = [
  { key: 'month' as const, labelKey: 'dashboard.granMonth' },
  { key: 'week' as const, labelKey: 'dashboard.granWeek' },
  { key: 'day' as const, labelKey: 'dashboard.granDay' },
  { key: 'hour' as const, labelKey: 'dashboard.granHour' },
];

/* ── Token Bar Chart (blue gradient bars) ── */
const TokenBarChartWrap = styled.div`
  position: relative; padding: 8px 16px 4px; min-width: 0;
`;

const TokenBarTooltip = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: absolute;
  left: ${({ $x }) => $x}px; top: ${({ $y }) => $y}px;
  transform: translate(-50%, -100%);
  background: ${({ theme }) => theme.colors.surfaceInverted};
  color: ${({ theme }) => theme.colors.textInverted};
  font-size: 0.6875rem; font-weight: 600;
  padding: 4px 10px; border-radius: 8px; pointer-events: none; white-space: nowrap;
  opacity: ${({ $visible }) => $visible ? 1 : 0}; transition: opacity 0.12s; z-index: 10;
  &::after {
    content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
    border: 4px solid transparent; border-top-color: ${({ theme }) => theme.colors.surfaceInverted};
  }
`;

const TokenBarChart: React.FC<{ data: { period: string; total_tokens: number }[] }> = ({ data }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);

  const items = data.length > 0 ? data : [];
  const maxVal = Math.max(...items.map(d => d.total_tokens), 1);
  const w = 700, h = 120, pl = 50, pr = 10, pt = 10, pb = 24;
  const chartW = w - pl - pr, chartH = h - pt - pb;
  const barCount = items.length || 1;
  const gap = Math.min(chartW / barCount, 64);
  const barW = gap * 0.35;

  const formatNum = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const tickCount = 5;
  const tickStep = maxVal / tickCount;
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) ticks.push(Math.round(tickStep * i));

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>, idx: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setHover({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top - 6 });
  }, []);

  if (items.length === 0) {
    return (
      <TokenBarChartWrap style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: theme.colors.textTertiary, fontSize: '0.8125rem' }}>
        {t('dashboard.noTokenData')}
      </TokenBarChartWrap>
    );
  }

  return (
    <TokenBarChartWrap>
      {hover !== null && (
        <TokenBarTooltip $x={hover.x} $y={hover.y} $visible>
          {items[hover.idx].period}: {items[hover.idx].total_tokens.toLocaleString()} tokens
        </TokenBarTooltip>
      )}
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        <defs>
        </defs>
        {/* Y-axis grid lines */}
        {ticks.map((tick, i) => {
          const y = pt + chartH - (tick / maxVal) * chartH;
          return (
            <g key={`tick${i}`}>
              <line x1={pl} y1={y} x2={pl + chartW} y2={y} stroke={theme.colors.border} strokeWidth="0.5" strokeDasharray={i === 0 ? undefined : '3,3'} />
              <text x={pl - 8} y={y} textAnchor="end" fill={theme.colors.textTertiary} fontSize="7" fontWeight="400" dominantBaseline="central">{formatNum(tick)}</text>
            </g>
          );
        })}
        {/* Bars */}
        {items.map((d, i) => {
          const x = pl + i * gap + (gap - barW) / 2;
          const barH = maxVal > 0 ? Math.max((d.total_tokens / maxVal) * chartH, d.total_tokens > 0 ? 4 : 0) : 0;
          const y = pt + chartH - barH;
          const isHovered = hover?.idx === i;
          // Short label
          const label = d.period.length > 7 ? d.period.slice(-5) : d.period;
          return (
            <g key={i} style={{ cursor: 'pointer' }}
               onMouseMove={(e) => handleMouseMove(e, i)}
               onMouseLeave={() => setHover(null)}>
              <rect x={pl + i * gap} y={pt} width={gap} height={chartH} fill="transparent" />
              <rect x={x} y={y} width={barW} height={barH} rx={4} ry={4}
                fill={theme.colors.accent} opacity={isHovered ? 1 : 0.3 + 0.7 * (d.total_tokens / maxVal)}
                style={{ transition: 'all 0.15s ease' }} />
              {/* Highlight effect on hover */}
              {isHovered && d.total_tokens > 0 && (
                <>
                  <circle cx={x + barW / 2} cy={y} r={4} fill={theme.colors.accent} />
                  <text x={x + barW / 2} y={y - 10} textAnchor="middle" fill={theme.colors.accent}
                    fontSize="7" fontWeight="700">{formatNum(d.total_tokens)}</text>
                </>
              )}
              <text x={pl + i * gap + gap / 2} y={pt + chartH + 16}
                textAnchor="middle" fill={theme.colors.textTertiary}
                fontSize="7" fontWeight="400">{label}</text>
            </g>
          );
        })}
      </svg>
    </TokenBarChartWrap>
  );
};

/* ── Token Gauge (half-circle) ── */
const GaugeWrap = styled.div`
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 8px 16px 16px; flex: 1;
`;
const GaugeLabel = styled.div`
  font-size: 0.75rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary}; margin-top: 8px;
`;
const GaugeValue = styled.div`
  font-size: 1.5rem; font-weight: 800;
  color: ${({ theme }) => theme.colors.textPrimary}; margin-top: 4px;
`;
const GaugeTarget = styled.div`
  font-size: 0.75rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 4px;
`;
const GaugeBar = styled.div`
  width: 100%; height: 6px; border-radius: 3px; margin-top: 12px;
  background: ${({ theme }) => theme.colors.surfaceMuted}; overflow: hidden;
`;
const GaugeBarFill = styled.div<{ $pct: number }>`
  height: 100%; border-radius: 3px;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: ${({ theme }) => theme.colors.accent};
  transition: width 0.6s ease;
`;

const TOKEN_QUOTA = 5000000; // 5M total token quota (configurable)

const TokenGauge: React.FC<{ used: number; quota?: number }> = ({ used, quota = TOKEN_QUOTA }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const pct = quota > 0 ? (used / quota) * 100 : 0;

  const formatNum = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const segCount = 14;
  const svgW = 340, svgH = 200;
  const cx = svgW / 2, cy = svgH * 0.76;
  const rInner = 90, rOuter = 140;
  const totalAngle = 180;
  const segGapDeg = 2.5;
  const segAngle = (totalAngle - segGapDeg * (segCount - 1)) / segCount;

  const polarToXY = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  /* progress bar width = gauge outer diameter */
  const barWidth = rOuter * 2;

  return (
    <GaugeWrap>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block', maxWidth: '100%', height: 'auto' }}>
        {Array.from({ length: segCount }).map((_, i) => {
          const startDeg = 180 + i * (segAngle + segGapDeg);
          const endDeg = startDeg + segAngle;
          const p1 = polarToXY(startDeg, rInner);
          const p2 = polarToXY(startDeg, rOuter);
          const p3 = polarToXY(endDeg, rOuter);
          const p4 = polarToXY(endDeg, rInner);
          const filled = (i + 1) / segCount <= pct / 100;
          const partial = i / segCount < pct / 100 && (i + 1) / segCount > pct / 100;
          const opacity = filled || partial
            ? 0.25 + 0.75 * ((i + 1) / segCount)
            : 0.12;
          return (
            <path key={i}
              d={[
                'M', p1.x, p1.y,
                'L', p2.x, p2.y,
                'A', rOuter, rOuter, 0, 0, 1, p3.x, p3.y,
                'L', p4.x, p4.y,
                'A', rInner, rInner, 0, 0, 0, p1.x, p1.y,
                'Z'
              ].join(' ')}
              fill={filled || partial ? theme.colors.accent : theme.colors.border}
              opacity={opacity}
            />
          );
        })}
        <text x={cx} y={cy - 18} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: '2.6rem', fontWeight: 800, fill: theme.colors.textPrimary }}>
          {pct.toFixed(1)}%
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: '0.85rem', fontWeight: 500, fill: theme.colors.textSecondary }}>
          {t('dashboard.tokenUsed')}
        </text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: barWidth, maxWidth: '100%', marginTop: 8 }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: theme.colors.textTertiary }}>{t('dashboard.tokenUsedLabel')}</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: theme.colors.textPrimary }}>{formatNum(used)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: theme.colors.textTertiary }}>{t('dashboard.tokenQuota')}</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: theme.colors.textPrimary }}>{formatNum(quota)}</div>
        </div>
      </div>
      <div style={{ width: barWidth, maxWidth: '100%', marginTop: 10 }}>
        <GaugeBar>
          <GaugeBarFill $pct={pct} />
        </GaugeBar>
      </div>
    </GaugeWrap>
  );
};

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

/* ── Demo hint ── */
const DemoHint = styled.div`
  font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; font-style: italic;
`;

/* ══════════ DEMO MOCK DATA ══════════ */
const DEMO_COMPANIES = [
  'Stripe', 'Notion', 'Vercel', 'Figma', 'Linear',
  'Retool', 'Supabase', 'Clerk', 'Resend', 'Neon',
  'PostHog', 'Cal.com', 'Dub.co', 'Trigger.dev', 'Inngest',
  'Tiptap', 'Liveblocks', 'Prisma', 'PlanetScale', 'Turso',
  'Warp', 'Railway', 'Render',
  'Loops', 'Ashby', 'Attio', 'Folk', 'Instantly', 'Apollo',
  'HubSpot', 'Salesforce', 'Zoho', 'Pipedrive', 'Close', 'Freshsales',
  'Outreach', 'Salesloft', 'Lemlist', 'Woodpecker', 'Mailshake',
];

const DEMO_INDUSTRIES: Record<string, string[]> = {
  Stripe: ['Fintech', 'Payments'], Notion: ['Productivity', 'SaaS'], Vercel: ['DevTools', 'Cloud'],
  Figma: ['Design', 'Collaboration'], Linear: ['Project Management'], Retool: ['Internal Tools'],
  Supabase: ['Database', 'BaaS'], Clerk: ['Auth', 'Identity'], Resend: ['Email API'],
  Neon: ['Database', 'Serverless'], PostHog: ['Analytics'], 'Cal.com': ['Scheduling'],
  'Dub.co': ['Marketing', 'Links'], 'Trigger.dev': ['DevTools', 'Jobs'], Inngest: ['DevTools', 'Events'],
  HubSpot: ['CRM', 'Marketing'], Salesforce: ['CRM', 'Enterprise'], Zoho: ['CRM', 'SaaS'],
  Pipedrive: ['CRM', 'Sales'], Close: ['CRM', 'Sales'], Freshsales: ['CRM'],
  Loops: ['Email Marketing'], Ashby: ['HR', 'ATS'], Attio: ['CRM'], Folk: ['CRM', 'Contacts'],
  Instantly: ['Email Outreach'], Apollo: ['Sales Intelligence'],
  Outreach: ['Sales Engagement'], Salesloft: ['Sales Engagement'], Lemlist: ['Cold Email'],
  Woodpecker: ['Cold Email'], Mailshake: ['Sales Engagement'],
};

const DEMO_SOURCES = ['Google Maps', 'LinkedIn', 'Crunchbase', 'ProductHunt', 'Manual', 'Website', 'Referral', 'Conference'];

function generateDemoLeads(): Lead[] {
  const now = Date.now();
  const day = 86400000;
  const replyCats: (string | undefined)[] = [
    'interested', 'meeting', 'question', 'not_interested', 'auto_reply',
    'interested', 'meeting', 'interested', 'question', 'meeting',
    'not_interested', 'auto_reply', 'interested', 'meeting', 'question',
  ];
  const verifications = ['verified', 'verified', 'verified', 'unverified', 'bounced'];

  return DEMO_COMPANIES.map((name, i) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    let status: 'new' | 'pending' | 'contacted' | null;
    let replied = false;
    let cat: string | undefined;
    let pendingMeeting = false;
    let followupCount = 0;
    let verification: string | undefined;
    let replyAt: string | undefined;

    if (i < 15) {
      status = 'contacted';
      replied = true;
      cat = replyCats[i];
      pendingMeeting = cat === 'meeting';
      followupCount = i < 6 ? 2 : i < 10 ? 1 : 0;
      verification = 'verified';
      replyAt = new Date(now - (i + 1) * day * 0.4).toISOString();
    } else if (i < 23) {
      status = 'contacted';
      followupCount = i < 18 ? 1 : 0;
      verification = i < 20 ? 'verified' : 'unverified';
    } else if (i < 29) {
      status = 'pending';
      verification = verifications[i % verifications.length];
    } else if (i < 35) {
      status = i % 2 === 0 ? 'new' : null;
      verification = i < 32 ? undefined : 'unverified';
    } else {
      status = 'contacted';
      verification = i < 38 ? 'bounced' : 'verified';
      replied = i === 38;
      cat = replied ? 'auto_reply' : undefined;
      followupCount = i < 37 ? 1 : 0;
      replyAt = replied ? new Date(now - 2 * day).toISOString() : undefined;
    }

    return {
      _id: `demo-lead-${i}`,
      company_name: name,
      email: `hello@${slug}.com`,
      status,
      verification,
      industry_tags: DEMO_INDUSTRIES[name] || ['SaaS'],
      source: DEMO_SOURCES[i % DEMO_SOURCES.length],
      website: `https://${slug}.com`,
      _replied: replied,
      _reply_category: cat,
      _reply_at: replyAt,
      _reply_sentiment: replied ? (cat === 'interested' || cat === 'meeting' ? 'positive' : cat === 'not_interested' ? 'negative' : 'neutral') : undefined,
      _reply_summary: replied ? `${name} ${cat === 'interested' ? 'expressed interest in a demo' : cat === 'meeting' ? 'wants to schedule a call' : cat === 'question' ? 'asked about pricing' : cat === 'not_interested' ? 'politely declined' : 'auto-reply received'}` : undefined,
      _pending_meeting: pendingMeeting,
      _followup_count: followupCount,
      _has_email_draft: i >= 23 && i < 26,
      createdAt: new Date(now - (40 - i) * day).toISOString(),
      created_at: new Date(now - (40 - i) * day).toISOString(),
    } as any;
  });
}

function generateDemoEmails(): EmailItem[] {
  const now = Date.now();
  const day = 86400000;
  const items: { company: string; status: string; type: string; daysAgo: number }[] = [
    { company: 'Stripe', status: 'sent', type: 'outreach', daysAgo: 8 },
    { company: 'Notion', status: 'sent', type: 'outreach', daysAgo: 7 },
    { company: 'Vercel', status: 'sent', type: 'outreach', daysAgo: 6 },
    { company: 'Figma', status: 'sent', type: 'outreach', daysAgo: 5 },
    { company: 'Linear', status: 'sent', type: 'outreach', daysAgo: 5 },
    { company: 'Retool', status: 'sent', type: 'outreach', daysAgo: 4 },
    { company: 'Tiptap', status: 'sent', type: 'followup', daysAgo: 3 },
    { company: 'Liveblocks', status: 'sent', type: 'followup', daysAgo: 3 },
    { company: 'Prisma', status: 'sent', type: 'followup', daysAgo: 2 },
    { company: 'PostHog', status: 'sent', type: 'reply', daysAgo: 1 },
    { company: 'Cal.com', status: 'sent', type: 'reply', daysAgo: 1 },
    { company: 'PlanetScale', status: 'pending', type: 'outreach', daysAgo: 0.5 },
    { company: 'Turso', status: 'pending', type: 'followup', daysAgo: 0.3 },
    { company: 'Warp', status: 'pending', type: 'outreach', daysAgo: 0.2 },
    { company: 'Railway', status: 'pending', type: 'followup', daysAgo: 0.1 },
    { company: 'Dub.co', status: 'pending', type: 'reply', daysAgo: 0.05 },
    { company: 'Loops', status: 'approved', type: 'outreach', daysAgo: 0.4 },
    { company: 'Ashby', status: 'approved', type: 'outreach', daysAgo: 0.3 },
    { company: 'Attio', status: 'approved', type: 'outreach', daysAgo: 0.2 },
    { company: 'Outreach', status: 'rejected', type: 'outreach', daysAgo: 2 },
    { company: 'Salesloft', status: 'rejected', type: 'followup', daysAgo: 1.5 },
    { company: 'Lemlist', status: 'failed', type: 'outreach', daysAgo: 4 },
    { company: 'Woodpecker', status: 'failed', type: 'followup', daysAgo: 3 },
    { company: 'Supabase', status: 'sent', type: 'outreach', daysAgo: 6 },
    { company: 'Clerk', status: 'sent', type: 'outreach', daysAgo: 5.5 },
  ];

  return items.map((item, i) => {
    const slug = item.company.toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      _id: `demo-email-${i}`,
      to_email: `hello@${slug}.com`,
      company_name: item.company,
      subject: item.type === 'followup'
        ? `Following up — ${item.company}`
        : item.type === 'reply'
        ? `Re: ${item.company} Partnership`
        : `Partnership Opportunity — ${item.company}`,
      status: item.status,
      _type: item.type,
      error: item.status === 'failed' ? { rejected_reason: 'Mailbox not found (550)' } : null,
      sent_at: item.status === 'sent' ? new Date(Date.now() - item.daysAgo * 86400000).toISOString() : undefined,
      created_at: new Date(Date.now() - item.daysAgo * 86400000).toISOString(),
    } as any;
  });
}

/* ══════════ PIXEL TYPEWRITER ══════════ */

const GREETINGS_MORNING = [
  'dashboard.greetingMorning',
  'dashboard.pixelMorning1',
  'dashboard.pixelMorning2',
];
const GREETINGS_AFTERNOON = [
  'dashboard.greetingAfternoon',
  'dashboard.pixelAfternoon1',
  'dashboard.pixelAfternoon2',
];
const GREETINGS_EVENING = [
  'dashboard.greetingEvening',
  'dashboard.pixelEvening1',
  'dashboard.pixelEvening2',
];

const PixelTypewriter: React.FC<{ text: string }> = ({ text }) => {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(i);
      if (i >= text.length) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, [text]);
  return <>{text.slice(0, shown)}<span style={{ opacity: shown < text.length ? 1 : 0 }}>_</span></>;
};

/* ══════════ COMPONENT ══════════ */

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dark = theme.mode === 'dark';
  const navigate = useNavigate();

  const { data: leadsData, isLoading: leadsLoading } = useLeads({ page: 1, limit: 100 });
  const { data: emailData, isLoading: emailsLoading } = useEmailQueue({ page: 1, limit: 100 });

  /* ── Token usage state ── */
  const [granularity, setGranularity] = useState<'hour' | 'day' | 'week' | 'month'>('month');
  const { data: tokenTimeseriesData } = useTokenTimeseries(granularity);
  const { data: tokenBalanceData, dataUpdatedAt: tokenBalanceUpdatedAt, refetch: refetchTokenBalance } = useTokenBalance();
  const [refreshSpinning, setRefreshSpinning] = useState(false);

  /* ── Demo token timeseries (fallback when API returns nothing) ── */
  const demoTokenTimeseries = useMemo(() => {
    const now = new Date();
    const points: { period: string; total_tokens: number }[] = [];
    const rng = (min: number, max: number) => Math.round(min + Math.abs(Math.sin(points.length * 9301 + 49297) % 1) * (max - min));

    if (granularity === 'month') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        points.push({ period: d.toISOString().slice(0, 7), total_tokens: rng(8000, 32000) });
      }
    } else if (granularity === 'week') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        points.push({ period: `${mm}-${dd}`, total_tokens: rng(2000, 8000) });
      }
    } else if (granularity === 'day') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        points.push({ period: `${mm}-${dd}`, total_tokens: rng(300, 1200) });
      }
    } else {
      // hour
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(d.getHours() - i);
        const hh = String(d.getHours()).padStart(2, '0');
        points.push({ period: `${hh}:00`, total_tokens: rng(20, 200) });
      }
    }
    return points;
  }, [granularity]);

  /* ── Demo mode ── */
  const demoLeads = useMemo(() => generateDemoLeads(), []);
  const demoEmails = useMemo(() => generateDemoEmails(), []);

  const realLeads = leadsData?.data || [];
  const realEmails = emailData?.data || [];
  const sparseLeads = realLeads.length < 5;
  const sparseEmails = realEmails.length < 5;
  const sparse = sparseLeads || sparseEmails;
  const demoMode = realLeads.length === 0 && realEmails.length === 0;
  const allLeads: Lead[] = sparseLeads
    ? [...realLeads, ...demoLeads.filter(d => !realLeads.some(r => r._id === d._id))]
    : realLeads;
  const allEmails: EmailItem[] = sparseEmails
    ? [...realEmails, ...demoEmails.filter(d => !realEmails.some(r => r._id === d._id))]
    : realEmails;

  // ── Stats ──
  const stats = useMemo(() => {
    const total = allLeads.length || 40;
    const contacted = allLeads.filter(l => l.status === 'contacted').length || 25;
    const realReplied = allLeads.filter(l => l._replied).length;
    const replied = realReplied || 20;
    const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 60;
    const sentEmails = allEmails.filter(e => e.status === 'sent').length || 18;
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
    const total = cats.interested + cats.meeting + cats.question + cats.not_interested + cats.auto_reply;
    if (total === 0) {
      return { interested: 8, meeting: 5, question: 4, not_interested: 2, auto_reply: 1 };
    }
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

  // ── Upcoming schedule ──
  const upcomingSchedule = useMemo(() => {
    return allEmails
      .filter(e => e.status === 'pending' || e.status === 'approved')
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
      .slice(0, 3)
      .map(e => ({
        id: e._id,
        to: e.company_name || e.to_email || '',
        subject: e.subject || '',
        status: e.status as 'pending' | 'approved',
        type: (e._type || 'outreach') as string,
        time: timeAgo(e.created_at, t),
      }));
  }, [allEmails, t]);

  // ── Today's timeline ──
  const todayTimeline = useMemo(() => {
    const nowH = new Date().getHours();
    const times = ['09:00', '09:30', '10:30', '11:00', '13:00', '14:30', '15:30', '16:00'];
    return upcomingSchedule.slice(0, 6).map((s, i) => {
      const tm = times[i % times.length];
      const hour = parseInt(tm.split(':')[0], 10);
      return { ...s, displayTime: tm, isPast: hour < nowH };
    });
  }, [upcomingSchedule]);

  // ── Meeting list ──
  const meetingList = useMemo(() => {
    const mtgLeads = allLeads.filter(l => l._reply_category === 'meeting');
    const times = ['10:30 AM', '2:00 PM', '4:30 PM', 'Tomorrow', 'Thu'];
    return mtgLeads.slice(0, 5).map((l, i) => ({
      company: l.company_name || l.email || '',
      time: times[i % times.length],
    }));
  }, [allLeads]);

  const greetingKey = useMemo(() => {
    const h = new Date().getHours();
    const pool = h < 12 ? GREETINGS_MORNING : h < 18 ? GREETINGS_AFTERNOON : GREETINGS_EVENING;
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const loading = leadsLoading || emailsLoading;
  if (loading) return <Page><SpinnerWrap><Spinner /><SpinnerText>{t('dashboard.loading')}</SpinnerText></SpinnerWrap></Page>;

  return (
    <Page>
      {/* ── Demo hint ── */}
      {sparse && <DemoHint>{t('dashboard.demoHint')}</DemoHint>}

      {/* ── Intelly Greeting ── */}
      <GreetingBlock>
        <GreetingHeading>{t(greetingKey)}</GreetingHeading>
        <GreetingDate>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</GreetingDate>
      </GreetingBlock>

      {/* ── Dashboard ── */}
      <DashGrid>
          {/* ═══ Row 1: Token 柱狀圖（全寬） ═══ */}
          <TokenChartCard>
            <CardHeader>
              <CardIcon $color={theme.colors.accent}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="18" y="3" width="4" height="18" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="2" y="13" width="4" height="8" rx="1"/>
                </svg>
              </CardIcon>
              {t('dashboard.tokenConsumption')}
              <div style={{ marginLeft: 'auto' }}>
                <GranPillBar>
                  <GranPillSlider $idx={GRAN_OPTIONS.findIndex(g => g.key === granularity)} $count={GRAN_OPTIONS.length} />
                  {GRAN_OPTIONS.map(g => (
                    <GranPillBtn key={g.key} $active={granularity === g.key} onClick={() => setGranularity(g.key)}>
                      {t(g.labelKey)}
                    </GranPillBtn>
                  ))}
                </GranPillBar>
              </div>
            </CardHeader>
            <TokenBarChart data={(tokenTimeseriesData && tokenTimeseriesData.length > 0) ? tokenTimeseriesData : demoTokenTimeseries} />
          </TokenChartCard>

          {/* ═══ Row 2: Token 儀表盤 + 今日議程 + 審核 ═══ */}
          <CardRow>
            {/* Token 餘額儀表盤 */}
            <TokenGaugeCard style={{ flex: 1 }}>
              <CardHeader>
                <CardIcon $color={theme.colors.accent}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                </CardIcon>
                {t('dashboard.tokenBalance')}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {tokenBalanceUpdatedAt > 0 && (
                    <UpdatedAtText>
                      {t('dashboard.lastUpdated', {
                        time: new Date(tokenBalanceUpdatedAt).toLocaleString(
                          t('dashboard.locale') || undefined,
                          { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
                        ),
                      })}
                    </UpdatedAtText>
                  )}
                  <RefreshBtn
                    $spinning={refreshSpinning}
                    onClick={() => { setRefreshSpinning(false); requestAnimationFrame(() => { setRefreshSpinning(true); refetchTokenBalance(); }); }}
                    title={t('dashboard.refresh')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      onAnimationEnd={() => setRefreshSpinning(false)}>
                      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                  </RefreshBtn>
                </div>
              </CardHeader>
              <TokenGauge used={(tokenBalanceData && tokenBalanceData.total_tokens > 0) ? tokenBalanceData.total_tokens : 3200000} />
            </TokenGaugeCard>

            {/* 今日議程 — BLUE card */}
            <ActionCard
              $pastel={theme.pastel.blue}
              $accent={theme.strong.blue}
              style={{ flex: 0.7 }}
              onClick={() => navigate('/cms-leads?tab=replied&sub=meeting')}
            >
              <ActionWatermark $fg={theme.strong.blue} $rot={28}><IconClock /></ActionWatermark>
              <ActionArrow $fg={theme.strong.blue}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              </ActionArrow>
              <ActionTitle>{t('dashboard.todayScheduleTitle')}</ActionTitle>
              <ActionCount>{todayTimeline.length + meetingList.length}</ActionCount>

              {todayTimeline.length === 0 && meetingList.length === 0 ? (
                <ActionLabel>{t('dashboard.noScheduleToday')}</ActionLabel>
              ) : (
                <MtgList style={{ flex: 1 }}>
                  {todayTimeline.map((item, i) => (
                    <MtgItem key={`sched-${i}`} onClick={e => e.stopPropagation()}>
                      <MtgDot $color={item.status === 'approved' ? theme.strong.olive : theme.strong.gold} />
                      <MtgName>{item.to}</MtgName>
                      <MtgTime>{item.displayTime}</MtgTime>
                    </MtgItem>
                  ))}
                  {meetingList.map((m, i) => (
                    <MtgItem key={`mtg-${i}`}>
                      <MtgDot $color={theme.strong.blue} />
                      <MtgName>{m.company}</MtgName>
                      <MtgTime>{m.time}</MtgTime>
                    </MtgItem>
                  ))}
                </MtgList>
              )}
            </ActionCard>

            {/* 審核 — gold card */}
            <ActionCard
              $pastel={theme.pastel.gold}
              $accent={theme.strong.gold}
              style={{ flex: 1.3 }}
              onClick={() => navigate('/cms-email?status=pending')}
            >
              <ActionWatermark $fg={theme.strong.gold} $rot={-18}><IconDraft /></ActionWatermark>
              <ActionArrow $fg={theme.strong.gold}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              </ActionArrow>
              <StatsRow>
                <StatsLeft>
                  <ActionTitle>{t('dashboard.cardTitleDraft')}</ActionTitle>
                  <ActionCountRow>
                    <ActionCount>{actions.pendingDrafts}</ActionCount>
                    <ActionTrend>
                      {actions.pendingDrafts > 0 ? '↑' : '—'} {stats.sentEmails} {t('dashboard.totalEmailsSent')}
                    </ActionTrend>
                  </ActionCountRow>
                </StatsLeft>
                <VerticalFunnel bars={[
                  { label: t('dashboard.newLeads'), value: funnel.total, pct: '' },
                  { label: t('dashboard.contacted'), value: funnel.contacted, pct: funnel.total > 0 ? `${Math.round((funnel.contacted / funnel.total) * 100)}%` : '' },
                  { label: t('dashboard.replied'), value: funnel.replied, pct: funnel.contacted > 0 ? `${Math.round((funnel.replied / funnel.contacted) * 100)}%` : '' },
                  { label: t('dashboard.meetings'), value: funnel.meetings, pct: funnel.replied > 0 ? `${Math.round((funnel.meetings / funnel.replied) * 100)}%` : '' },
                ]} />
              </StatsRow>

              {/* Queued to Send */}
              <EmbedWhite onClick={e => e.stopPropagation()}>
                <CardHeader>
                  <CardIcon $color={theme.strong.gold}><IconCalendar /></CardIcon>
                  {t('dashboard.upcomingSchedule')}
                  <CardHeaderRight>{t('dashboard.todaySchedules', { count: upcomingSchedule.length })}</CardHeaderRight>
                </CardHeader>
                <CardBody>
                  {upcomingSchedule.length === 0 ? (
                    <Empty>{t('dashboard.noUpcomingSchedule')}</Empty>
                  ) : (
                    <SchedList>
                      {upcomingSchedule.slice(0, 2).map(s => (
                        <SchedItem key={s.id}>
                          <SchedDot $color={s.status === 'approved' ? theme.strong.olive : theme.strong.gold} />
                          <SchedBody>
                            <SchedTitle>{s.to}</SchedTitle>
                            <SchedSub>{s.subject}</SchedSub>
                          </SchedBody>
                          <SchedBadge
                            $bg={s.status === 'approved' ? `${theme.strong.olive}20` : `${theme.strong.gold}20`}
                            $fg={s.status === 'approved' ? theme.strong.olive : theme.strong.gold}
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
              </EmbedWhite>
            </ActionCard>
          </CardRow>

          {/* ═══ Row 3: 回覆 + 跟進 ═══ */}
          <CardRow>
            {/* 回覆 — olive card */}
            <ActionCard
              $pastel={theme.pastel.olive}
              $accent={theme.strong.olive}
              style={{ flex: 1 }}
              onClick={() => navigate('/cms-leads?tab=replied')}
            >
              <ActionWatermark $fg={theme.strong.olive} $rot={22}><IconReplyArrow /></ActionWatermark>
              <ActionArrow $fg={theme.strong.olive}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              </ActionArrow>
              <ActionTitle>{t('dashboard.cardTitleReply')}</ActionTitle>
              <ActionCountRow>
                <ActionCount>{actions.newReplies}</ActionCount>
                <ActionTrend>
                  {stats.replyRate}% {t('dashboard.replied')}
                  <MiniBar $color={theme.colors.textPrimary} $pct={stats.replyRate} />
                </ActionTrend>
              </ActionCountRow>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12 }} onClick={e => e.stopPropagation()}>
                {stats.replied === 0 ? (
                  <Empty><EmptyDonutSvg borderColor={theme.colors.border} borderStrongColor={theme.colors.borderStrong} />{t('dashboard.noReplyData')}</Empty>
                ) : (
                  <DonutWrap>
                    <DonutChart size={220} slices={[
                      { value: replyCats.interested, color: theme.colors.textPrimary, label: t('dashboard.interested') },
                      { value: replyCats.meeting, color: `${theme.colors.textPrimary}99`, label: t('dashboard.meetingCat') },
                      { value: replyCats.question, color: `${theme.colors.textPrimary}66`, label: t('dashboard.question') },
                      { value: replyCats.not_interested, color: `${theme.colors.textPrimary}44`, label: t('dashboard.notInterested') },
                      { value: replyCats.auto_reply, color: `${theme.colors.textPrimary}22`, label: t('dashboard.autoReply') },
                    ]} />
                    <LegendList>
                      {[
                        { color: theme.colors.textPrimary, label: t('dashboard.interested'), value: replyCats.interested },
                        { color: `${theme.colors.textPrimary}99`, label: t('dashboard.meetingCat'), value: replyCats.meeting },
                        { color: `${theme.colors.textPrimary}66`, label: t('dashboard.question'), value: replyCats.question },
                        { color: `${theme.colors.textPrimary}44`, label: t('dashboard.notInterested'), value: replyCats.not_interested },
                        { color: `${theme.colors.textPrimary}22`, label: t('dashboard.autoReply'), value: replyCats.auto_reply },
                      ].map((item, i) => (
                        <LegendRow key={i}>
                          <LegendRowTop>
                            <LegendDot $color={item.color} />
                            <LegendLabel>{item.label}</LegendLabel>
                            <LegendVal>{item.value} ({stats.replied > 0 ? Math.round((item.value / stats.replied) * 100) : 0}%)</LegendVal>
                          </LegendRowTop>
                          <LegendBarTrack>
                            <LegendBarFill $color={item.color} $pct={stats.replied > 0 ? (item.value / stats.replied) * 100 : 0} />
                          </LegendBarTrack>
                        </LegendRow>
                      ))}
                    </LegendList>
                  </DonutWrap>
                )}
              </div>
            </ActionCard>

            {/* 跟進 — mauve card */}
            <ActionCard
              $pastel={theme.pastel.mauve}
              $accent={theme.strong.mauve}
              style={{ flex: 1 }}
              onClick={() => navigate('/cms-leads?tab=awaiting&sub=no_followup')}
            >
              <ActionWatermark $fg={theme.strong.mauve} $rot={-12}><IconAlert /></ActionWatermark>
              <ActionArrow $fg={theme.strong.mauve}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
              </ActionArrow>
              <ActionTitle>{t('dashboard.cardTitleFollowup')}</ActionTitle>
              <ActionCount>{actions.noReplyNoFollowup}</ActionCount>

              <EmbedWhite onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <CardHeader>
                  <CardIcon $color={theme.colors.accent}><IconActivity /></CardIcon>
                  {t('dashboard.recentActivity')}
                </CardHeader>
                <NotebookBody style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {recentActivity.length === 0 ? (
                    <Empty>{t('dashboard.noActivity')}</Empty>
                  ) : (
                    <FeedList>
                      {recentActivity.slice(0, 4).map((item, i) => (
                        <FeedItem key={i}>
                          {(() => {
                            const agentId = ACTIVITY_AGENT[item.type];
                            const agent = agentId ? AGENTS[agentId] : null;
                            return agent ? (
                              <SpriteAvatar src={agent.sprite} frames={agent.frames} frameW={agent.frameW} frameH={agent.frameH} size={56} />
                            ) : (
                              <FeedIcon $bg={`${theme.strong.gold}20`} $fg={theme.strong.gold}><IconPen /></FeedIcon>
                            );
                          })()}
                          <FeedBody>
                            <FeedText>
                              <FeedAgentName $color={AGENTS[ACTIVITY_AGENT[item.type]]?.accent || theme.strong.gold}>
                                {t(AGENTS[ACTIVITY_AGENT[item.type]]?.nameKey || '')}
                              </FeedAgentName>
                              {' '}{item.text}
                            </FeedText>
                            <FeedTime>{item.time}</FeedTime>
                          </FeedBody>
                        </FeedItem>
                      ))}
                    </FeedList>
                  )}
                </NotebookBody>
              </EmbedWhite>
            </ActionCard>
          </CardRow>

      </DashGrid>
    </Page>
  );
};

export default Dashboard;
