import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled, { useTheme, keyframes } from 'styled-components';
import { useLeads, useEmailQueue } from '../../api/hooks';
import { Lead } from '../../api/leads';
import { EmailItem } from '../../api/emailQueue';
import { media } from '../../styles/media';
import { glassSurface } from '../../styles/glassSurface';
import SpriteAvatar from '../../components/SpriteAvatar';
import { AGENTS, FARMER, ACTIVITY_AGENT } from '../../config/agents';

/* ══════════════════════════════════════
   Lead Scraper CMS Dashboard — v2
   ══════════════════════════════════════ */

/* ── Layout ── */

const Page = styled.div`
  display: flex; flex-direction: column; gap: 24px;
<<<<<<< HEAD
  padding: 32px 28px 40px; min-width: 0; overflow-x: hidden;
=======
  padding: 32px 28px 40px; min-width: 0;
>>>>>>> 16f91ddea1303fee7d0c8bed1808313400c7995b
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

/* ── Dashboard Grid: cards area + calendar sidebar ── */
const DashGrid = styled.div`
<<<<<<< HEAD
  display: flex; flex-direction: column; gap: 20px;
`;
const CardsArea = styled.div`
  display: flex; flex-direction: column; gap: 20px; min-width: 0;
`;
const CardRow = styled.div`
  display: flex; gap: 20px; align-items: stretch;
  ${media.tabletDown} { flex-direction: column; }
=======
  display: grid;
  grid-template-columns: 1fr minmax(300px, 340px);
  gap: 20px; align-items: stretch;
  ${media.tablet} { grid-template-columns: 1fr; gap: 14px; }
  ${media.mobile} { grid-template-columns: 1fr; }
`;
const CardsArea = styled.div`
  display: flex; flex-direction: column; gap: 20px;
  ${media.tablet} { gap: 12px; }
`;
const CardRow = styled.div`
  display: flex; gap: 20px; align-items: stretch;
  ${media.tablet} { gap: 12px; }
  ${media.mobile} { flex-direction: column; }
`;
const CalendarSidebar = styled.div`
  display: flex; flex-direction: column; gap: 16px;
  ${media.tablet} { flex-direction: row; gap: 12px; grid-column: 1 / -1; }
  ${media.mobile} { grid-column: 1 / -1; }
>>>>>>> 16f91ddea1303fee7d0c8bed1808313400c7995b
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

/* ── Intelly Pastel Stat Cards (now inside masonry) ── */
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
  display: flex; align-items: flex-end; gap: 4px; padding: 0; flex-shrink: 0;
`;
const VFunnelCol = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; width: 32px;
`;
const VFunnelBar = styled.div<{ $h: number; $opacity: number }>`
  width: 100%; max-width: 18px; border-radius: 5px 5px 3px 3px;
  height: ${({ $h }) => Math.max($h, 4)}px;
  background: ${({ theme, $opacity }) => theme.colors.textPrimary};
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
        // more = darker (1.0), less = lighter (0.25)
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
  background: ${({ theme }) => theme.colors.surfaceInverted}; color: ${({ theme }) => theme.colors.textInverted}; font-size: 0.6875rem; font-weight: 600;
  padding: 4px 10px; border-radius: 8px; pointer-events: none; white-space: nowrap;
  opacity: ${({ $visible }) => $visible ? 1 : 0}; transition: opacity 0.12s; z-index: 10; white-space: pre-line; text-align: center;
  &::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 4px solid transparent; border-top-color: ${({ theme }) => theme.colors.surfaceInverted}; }
`;
const BarChartWrap = styled.div`
  position: relative; padding: 8px; border-radius: 8px; min-width: 0; overflow: hidden;
`;

const EmptyBarSvg: React.FC<{ borderColor: string }> = ({ borderColor }) => (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="10" width="80" height="4" rx="2" fill={borderColor} opacity="0.4"/>
    <rect x="25" y="22" width="55" height="4" rx="2" fill={borderColor} opacity="0.3"/>
    <rect x="25" y="34" width="70" height="4" rx="2" fill={borderColor} opacity="0.25"/>
    <rect x="25" y="46" width="40" height="4" rx="2" fill={borderColor} opacity="0.2"/>
    <rect x="25" y="58" width="60" height="4" rx="2" fill={borderColor} opacity="0.15"/>
    <line x1="22" y1="5" x2="22" y2="68" stroke={borderColor} strokeWidth="1" opacity="0.3"/>
  </svg>
);

const BarChart: React.FC<{ bars: BarData[] }> = ({ bars }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const allZero = bars.every(b => b.value === 0);
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

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>, idx: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setHover({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top - 6 });
  }, []);

  if (allZero) {
    return (
      <BarChartWrap style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 16px', color: theme.colors.textTertiary, fontSize: '0.8125rem' }}>
        <EmptyBarSvg borderColor={theme.colors.border} />
        {t('dashboard.noFunnelData')}
      </BarChartWrap>
    );
  }

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
              <line x1={x} y1={pt} x2={x} y2={pt + chartH} stroke={theme.colors.border} strokeWidth="0.5" strokeDasharray={i === 0 ? undefined : '3,3'} />
              <text x={x} y={pt + chartH + 14} textAnchor="middle" fill={theme.colors.textTertiary} fontSize="8" fontWeight="400">{tick}</text>
            </g>
          );
        })}
        {bars.map((b, i) => {
          const y = pt + gap * i + (gap - barH) / 2;
          const barW = maxVal > 0 ? Math.max((b.value / maxVal) * chartW, b.value > 0 ? 6 : 0) : 0;
          const r = 5;
          return (
            <g key={i} style={{ cursor: 'pointer' }}
               onMouseMove={(e) => handleMouseMove(e, i)}
               onMouseLeave={() => setHover(null)}>
              <rect x={0} y={pt + gap * i} width={w} height={gap} fill="transparent" />
              <rect x={pl} y={y} width={chartW} height={barH} rx={r} ry={r} fill={theme.colors.surfaceMuted} />
              <rect x={pl} y={y} width={barW} height={barH} rx={r} ry={r} fill={`url(#bar${i})`} />
              <text x={pl - 6} y={y + barH / 2} textAnchor="end" fill={theme.colors.textTertiary} fontSize="8" fontWeight="500" dominantBaseline="central">{b.label}</text>
            </g>
          );
        })}
      </svg>
    </BarChartWrap>
  );
};

/* ── Donut Chart (redesigned) ── */
const DonutWrap = styled.div`
  display: flex; align-items: center; gap: 20px; justify-content: center; padding: 8px;
<<<<<<< HEAD
  flex-wrap: wrap;
=======
>>>>>>> 16f91ddea1303fee7d0c8bed1808313400c7995b
  ${media.tablet} {
    gap: 10px; padding: 2px;
    & > div:first-child svg { width: 165px; height: 165px; }
  }
`;
const LegendList = styled.div`
  display: flex; flex-direction: column; gap: 14px; flex: 1; min-width: 0; max-width: 180px;
  ${media.tablet} { gap: 10px; max-width: 160px; }
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
const LegendBarTrack = styled.div`height: 5px; border-radius: 3px; background: ${({ theme }) => theme.colors.surfaceMuted}; overflow: hidden;`;
const LegendBarFill = styled.div<{ $color: string; $pct: number }>`height: 100%; border-radius: 3px; width: ${({ $pct }) => $pct}%; background: ${({ $color }) => $color}; transition: width 0.4s ease;`;

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
        {/* background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={strokeW} opacity={0.06} />
        {/* arcs */}
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
        {/* center text */}
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
/* ── Notebook-style Activity Feed ── */
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

/* ── Spiral-bound Calendar card ── */
const SpiralCard = styled(Card)`
  position: relative; overflow: visible;
  /* stacked-paper shadow */
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

<<<<<<< HEAD
=======
/* ── Mini Calendar ── */
const CalendarCard = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  padding: 16px;
  ${media.tablet} { flex: 1; padding: 12px; }
`;
const CalMonth = styled.div`
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
`;
const CalMonthTitle = styled.div`
  font-size: 0.875rem; font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;
const CalMonthNav = styled.button`
  background: none; border: none; cursor: pointer; padding: 4px 6px;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: 0.75rem; line-height: 1;
  &:hover { color: ${({ theme }) => theme.colors.textPrimary}; }
`;
const CalDaysGrid = styled.div`
  display: grid; grid-template-columns: repeat(7, 1fr); text-align: center;
`;
const CalDayHeader = styled.div`
  font-size: 0.5625rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textTertiary}; padding: 4px 0;
`;
const CalDayCell = styled.div<{ $today?: boolean; $selected?: boolean; $muted?: boolean; $hasEvent?: boolean }>`
  font-size: 0.6875rem;
  font-weight: ${({ $today, $selected }) => ($today || $selected) ? 700 : 400};
  color: ${({ $today, $selected, $muted, theme }) =>
    $muted ? `${theme.colors.textTertiary}60`
    : ($today || $selected) ? '#fff'
    : theme.colors.textPrimary};
  background: ${({ $today, $selected, theme }) =>
    $today ? theme.strong.mauve
    : $selected ? `${theme.strong.mauve}cc`
    : 'transparent'};
  border-radius: 50%; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center; margin: 1px auto;
  position: relative; cursor: ${({ $muted }) => $muted ? 'default' : 'pointer'};
  transition: background 0.15s, transform 0.1s;
  &:hover { ${({ $muted, theme }) => !$muted ? `background: ${theme.pastel.mauve};` : ''} }
  ${({ $hasEvent, $today, $selected, theme }) => $hasEvent && !$today && !$selected ? `
    &::after {
      content: ''; position: absolute; bottom: 1px;
      width: 4px; height: 4px; border-radius: 50%;
      background: ${theme.strong.mauve};
    }
  ` : ''}
`;
const CalAddBtn = styled.button`
  background: ${({ theme }) => theme.colors.surfaceInverted};
  color: ${({ theme }) => theme.colors.textInverted};
  border: none; border-radius: 10px; padding: 9px 14px;
  font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; margin-top: 12px;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
`;

/* ── Day Timeline ── */
const TimelineCard = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  padding: 16px; flex: 1; min-height: 0;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.colors.border}; border-radius: 3px; }
  ${media.tablet} { padding: 12px; }
`;
const TimelineHeader = styled.div`
  font-size: 0.8125rem; font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
`;
const TlItem = styled.div<{ $past?: boolean }>`
  display: flex; gap: 10px; padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}20;
  opacity: ${({ $past }) => $past ? 0.3 : 1};
  &:last-child { border-bottom: none; }
`;
const TlTime = styled.div`
  font-size: 0.6875rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textTertiary};
  min-width: 44px; flex-shrink: 0;
`;
const TlDot = styled.div<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $color }) => $color}; margin-top: 4px;
`;
const TlBody = styled.div`flex: 1; min-width: 0;`;
const TlTitle = styled.div`
  font-size: 0.8125rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`;
const TlSub = styled.div`
  font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 2px;
`;
const EmptyTimeline = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 24px 8px; gap: 10px; color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

>>>>>>> 16f91ddea1303fee7d0c8bed1808313400c7995b
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
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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

/* ── Demo hint ── */
const DemoHint = styled.div`
  font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; font-style: italic;
`;

/* ══════════ DEMO MOCK DATA ══════════ */
const DEMO_COMPANIES = [
  /* 0–9   contacted + replied */
  'Stripe', 'Notion', 'Vercel', 'Figma', 'Linear',
  'Retool', 'Supabase', 'Clerk', 'Resend', 'Neon',
  /* 10–14  contacted + replied (more categories) */
  'PostHog', 'Cal.com', 'Dub.co', 'Trigger.dev', 'Inngest',
  /* 15–22  contacted, no reply yet */
  'Tiptap', 'Liveblocks', 'Prisma', 'PlanetScale', 'Turso',
  'Warp', 'Railway', 'Render',
  /* 23–28  pending (已驗證信箱，等待發信) */
  'Loops', 'Ashby', 'Attio', 'Folk', 'Instantly', 'Apollo',
  /* 29–34  new / null (潛在客戶) */
  'HubSpot', 'Salesforce', 'Zoho', 'Pipedrive', 'Close', 'Freshsales',
  /* 35–39  contacted + bounced / special */
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
      // 0–14: contacted + replied
      status = 'contacted';
      replied = true;
      cat = replyCats[i];
      pendingMeeting = cat === 'meeting';
      followupCount = i < 6 ? 2 : i < 10 ? 1 : 0;
      verification = 'verified';
      replyAt = new Date(now - (i + 1) * day * 0.4).toISOString();
    } else if (i < 23) {
      // 15–22: contacted, no reply
      status = 'contacted';
      followupCount = i < 18 ? 1 : 0;
      verification = i < 20 ? 'verified' : 'unverified';
    } else if (i < 29) {
      // 23–28: pending (驗證完等待發信)
      status = 'pending';
      verification = verifications[i % verifications.length];
    } else if (i < 35) {
      // 29–34: new / null (潛在客戶，剛匯入)
      status = i % 2 === 0 ? 'new' : null;
      verification = i < 32 ? undefined : 'unverified';
    } else {
      // 35–39: contacted but bounced / edge cases
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
    // sent — outreach
    { company: 'Stripe', status: 'sent', type: 'outreach', daysAgo: 8 },
    { company: 'Notion', status: 'sent', type: 'outreach', daysAgo: 7 },
    { company: 'Vercel', status: 'sent', type: 'outreach', daysAgo: 6 },
    { company: 'Figma', status: 'sent', type: 'outreach', daysAgo: 5 },
    { company: 'Linear', status: 'sent', type: 'outreach', daysAgo: 5 },
    { company: 'Retool', status: 'sent', type: 'outreach', daysAgo: 4 },
    // sent — followup
    { company: 'Tiptap', status: 'sent', type: 'followup', daysAgo: 3 },
    { company: 'Liveblocks', status: 'sent', type: 'followup', daysAgo: 3 },
    { company: 'Prisma', status: 'sent', type: 'followup', daysAgo: 2 },
    // sent — reply
    { company: 'PostHog', status: 'sent', type: 'reply', daysAgo: 1 },
    { company: 'Cal.com', status: 'sent', type: 'reply', daysAgo: 1 },
    // pending — awaiting approval
    { company: 'PlanetScale', status: 'pending', type: 'outreach', daysAgo: 0.5 },
    { company: 'Turso', status: 'pending', type: 'followup', daysAgo: 0.3 },
    { company: 'Warp', status: 'pending', type: 'outreach', daysAgo: 0.2 },
    { company: 'Railway', status: 'pending', type: 'followup', daysAgo: 0.1 },
    { company: 'Dub.co', status: 'pending', type: 'reply', daysAgo: 0.05 },
    // approved — queued to send
    { company: 'Loops', status: 'approved', type: 'outreach', daysAgo: 0.4 },
    { company: 'Ashby', status: 'approved', type: 'outreach', daysAgo: 0.3 },
    { company: 'Attio', status: 'approved', type: 'outreach', daysAgo: 0.2 },
    // rejected — human declined
    { company: 'Outreach', status: 'rejected', type: 'outreach', daysAgo: 2 },
    { company: 'Salesloft', status: 'rejected', type: 'followup', daysAgo: 1.5 },
    // failed — delivery error
    { company: 'Lemlist', status: 'failed', type: 'outreach', daysAgo: 4 },
    { company: 'Woodpecker', status: 'failed', type: 'followup', daysAgo: 3 },
    // more sent for volume
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
      sent_at: item.status === 'sent' ? new Date(now - item.daysAgo * day).toISOString() : undefined,
      created_at: new Date(now - item.daysAgo * day).toISOString(),
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

  /* ── Demo mode: auto-use mock data when real data is empty ── */
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

  // ── Today's timeline (for day timeline sidebar) ──
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

  // ── Calendar sidebar state ──
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-based
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

  const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];

  const calDays = useMemo(() => {
    const dim = new Date(calYear, calMonth + 1, 0).getDate(); // days in month
    const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
    const prevDim = new Date(calYear, calMonth, 0).getDate(); // prev month last day
    const cells: { day: number; muted: boolean; today: boolean }[] = [];
    // prev month tail
    for (let i = firstDow - 1; i >= 0; i--) {
      cells.push({ day: prevDim - i, muted: true, today: false });
    }
    // current month
    const todayDate = new Date();
    for (let d = 1; d <= dim; d++) {
      const isToday = d === todayDate.getDate() && calMonth === todayDate.getMonth() && calYear === todayDate.getFullYear();
      cells.push({ day: d, muted: false, today: isToday });
    }
    // next month head — fill to 42 cells (6 rows)
    const remainder = 42 - cells.length;
    for (let d = 1; d <= remainder; d++) {
      cells.push({ day: d, muted: true, today: false });
    }
    return cells;
  }, [calYear, calMonth]);

  const handlePrevMonth = useCallback(() => {
    setCalMonth(m => { if (m === 0) { setCalYear(y => y - 1); return 11; } return m - 1; });
    setSelectedDay(null);
  }, []);
  const handleNextMonth = useCallback(() => {
    setCalMonth(m => { if (m === 11) { setCalYear(y => y + 1); return 0; } return m + 1; });
    setSelectedDay(null);
  }, []);

  const loading = leadsLoading || emailsLoading;
  if (loading) return <Page><SpinnerWrap><Spinner /><SpinnerText>{t('dashboard.loading')}</SpinnerText></SpinnerWrap></Page>;

  return (
    <Page>
      {/* ── Demo hint (auto, no toggle) ── */}
      {sparse && <DemoHint>{t('dashboard.demoHint')}</DemoHint>}

      {/* ── Intelly Greeting ── */}
      <GreetingBlock>
        <GreetingHeading>{t(greetingKey)}</GreetingHeading>
        <GreetingDate>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</GreetingDate>
      </GreetingBlock>

      {/* ── Dashboard cards ── */}
      <DashGrid>
        <CardsArea>
          {/* ═══ Top row: 審核 (flex:1) + 回覆 (flex:1) ═══ */}
          <CardRow>
            {/* 審核 — gold card with funnel + embedded Schedule (truncated) */}
            <ActionCard
              $pastel={theme.pastel.gold}
              $accent={theme.strong.gold}
              style={{ flex: 1 }}
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

              {/* Queued to Send — compact, max 2 items */}
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

            {/* 回覆 — olive card with Donut (enlarged) */}
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

              {/* Donut — dark monochrome */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12 }} onClick={e => e.stopPropagation()}>
                {stats.replied === 0 ? (
                  <Empty><EmptyDonutSvg borderColor={theme.colors.border} borderStrongColor={theme.colors.borderStrong} />{t('dashboard.noReplyData')}</Empty>
                ) : (
                  <DonutWrap>
                    <DonutChart size={170} slices={[
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
          </CardRow>

          {/* ═══ Bottom row: 跟進 (flex:3, wider) + 會議 (flex:2, narrower) — equal height ═══ */}
          <CardRow>
            {/* 跟進 — mauve (wider) with embedded Activity (height-limited) */}
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

              {/* What Just Happened — embedded, white bg, height limited */}
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

            {/* 今日議程 — blue card (schedule + meetings combined) */}
            <ActionCard
              $pastel={theme.pastel.blue}
              $accent={theme.strong.blue}
              style={{ flex: 1 }}
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
          </CardRow>
        </CardsArea>

        {/* ═══ Calendar Sidebar ═══ */}
        <CalendarSidebar>
          {/* Mini Calendar */}
          <CalendarCard>
            <CalMonth>
              <CalMonthNav onClick={handlePrevMonth}>◀</CalMonthNav>
              <CalMonthTitle>
                {t(`calendar.${MONTH_KEYS[calMonth]}`)} {calYear}
              </CalMonthTitle>
              <CalMonthNav onClick={handleNextMonth}>▶</CalMonthNav>
            </CalMonth>
            <CalDaysGrid>
              {DAY_KEYS.map(dk => (
                <CalDayHeader key={dk}>{t(`calendar.${dk}`)}</CalDayHeader>
              ))}
              {calDays.map((cell, i) => (
                <CalDayCell
                  key={i}
                  $muted={cell.muted}
                  $today={cell.today}
                  $selected={!cell.muted && cell.day === selectedDay}
                  onClick={() => { if (!cell.muted) setSelectedDay(cell.day); }}
                >
                  {cell.day}
                </CalDayCell>
              ))}
            </CalDaysGrid>
            <CalAddBtn onClick={() => navigate('/cms-email')}>
              + {t('dashboard.addEvent')}
            </CalAddBtn>
          </CalendarCard>

          {/* Day Timeline */}
          <TimelineCard>
            <TimelineHeader>
              📅 {t('dashboard.todayScheduleTitle')}
            </TimelineHeader>
            {todayTimeline.length === 0 && meetingList.length === 0 ? (
              <EmptyTimeline>{t('dashboard.noScheduleToday')}</EmptyTimeline>
            ) : (
              <>
                {todayTimeline.map((item, i) => (
                  <TlItem key={`tl-${i}`}>
                    <TlTime>{item.displayTime}</TlTime>
                    <TlDot $color={item.status === 'approved' ? theme.strong.olive : theme.strong.gold} />
                    <TlBody>
                      <TlTitle>{item.to}</TlTitle>
                      <TlSub>{item.subject}</TlSub>
                    </TlBody>
                  </TlItem>
                ))}
                {meetingList.map((m, i) => (
                  <TlItem key={`mtg-tl-${i}`}>
                    <TlTime>{m.time}</TlTime>
                    <TlDot $color={theme.strong.blue} />
                    <TlBody>
                      <TlTitle>{m.company}</TlTitle>
                      <TlSub>{t('dashboard.meetingLabel')}</TlSub>
                    </TlBody>
                  </TlItem>
                ))}
              </>
            )}
          </TimelineCard>
        </CalendarSidebar>
      </DashGrid>
    </Page>
  );
};

export default Dashboard;
