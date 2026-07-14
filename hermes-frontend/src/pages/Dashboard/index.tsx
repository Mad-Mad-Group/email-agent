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
  background: #14261a; color: #fff; font-size: 0.6875rem; font-weight: 600;
  padding: 4px 10px; border-radius: 8px; pointer-events: none; white-space: nowrap;
  opacity: ${({ $visible }) => $visible ? 1 : 0}; transition: opacity 0.12s; z-index: 10; white-space: pre-line; text-align: center;
  &::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 4px solid transparent; border-top-color: #14261a; }
`;
const BarChartWrap = styled.div`
  position: relative; padding: 8px; border-radius: 8px; min-width: 0; overflow: hidden;
`;

const EmptyBarSvg = () => (
  <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="10" width="80" height="4" rx="2" fill="#d4e2d4" opacity="0.4"/>
    <rect x="25" y="22" width="55" height="4" rx="2" fill="#d4e2d4" opacity="0.3"/>
    <rect x="25" y="34" width="70" height="4" rx="2" fill="#d4e2d4" opacity="0.25"/>
    <rect x="25" y="46" width="40" height="4" rx="2" fill="#d4e2d4" opacity="0.2"/>
    <rect x="25" y="58" width="60" height="4" rx="2" fill="#d4e2d4" opacity="0.15"/>
    <line x1="22" y1="5" x2="22" y2="68" stroke="#d4e2d4" strokeWidth="1" opacity="0.3"/>
  </svg>
);

const BarChart: React.FC<{ bars: BarData[]; dark?: boolean }> = ({ bars, dark }) => {
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

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>, idx: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setHover({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top - 6 });
  }, []);

  if (allZero) {
    return (
      <BarChartWrap style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 16px', color: dark ? '#4a6b52' : '#88a890', fontSize: '0.8125rem' }}>
        <EmptyBarSvg />
        尚無漏斗數據
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
              <line x1={x} y1={pt} x2={x} y2={pt + chartH} stroke={dark ? '#1e3a25' : '#d4e2d4'} strokeWidth="0.5" strokeDasharray={i === 0 ? undefined : '3,3'} />
              <text x={x} y={pt + chartH + 14} textAnchor="middle" fill={dark ? '#4a6b52' : '#88a890'} fontSize="8" fontWeight="400">{tick}</text>
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
              <rect x={pl} y={y} width={chartW} height={barH} rx={r} ry={r} fill={dark ? '#1e3a25' : '#ecf2ec'} />
              <rect x={pl} y={y} width={barW} height={barH} rx={r} ry={r} fill={`url(#bar${i})`} />
              <text x={pl - 6} y={y + barH / 2} textAnchor="end" fill={dark ? '#88a890' : '#4a6b52'} fontSize="8" fontWeight="500" dominantBaseline="central">{b.label}</text>
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
`;
const LegendList = styled.div`display: flex; flex-direction: column; gap: 14px; flex: 1; min-width: 0; max-width: 180px;`;
const LegendRow = styled.div`display: flex; flex-direction: column; gap: 3px;`;
const LegendRowTop = styled.div`display: flex; align-items: center; gap: 6px;`;
const LegendDot = styled.div<{ $color: string }>`width: 8px; height: 8px; border-radius: 50%; background: ${({ $color }) => $color}; flex-shrink: 0;`;
const LegendLabel = styled.span`font-size: 0.72rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
const LegendVal = styled.span`font-weight: 700; font-size: 0.72rem; margin-left: auto; white-space: nowrap; flex-shrink: 0;`;
const LegendBarTrack = styled.div`height: 5px; border-radius: 3px; background: ${({ theme }) => theme.mode === 'dark' ? '#1e3a25' : '#ecf2ec'}; overflow: hidden;`;
const LegendBarFill = styled.div<{ $color: string; $pct: number }>`height: 100%; border-radius: 3px; width: ${({ $pct }) => $pct}%; background: ${({ $color }) => $color}; transition: width 0.4s ease;`;

const DonutTooltip = styled.div<{ $x: number; $y: number; $visible: boolean }>`
  position: absolute;
  left: ${({ $x }) => $x}px; top: ${({ $y }) => $y}px;
  transform: translate(-50%, -100%);
  background: #14261a; color: #fff; font-size: 0.6875rem; font-weight: 600;
  padding: 4px 10px; border-radius: 8px; pointer-events: none; white-space: nowrap;
  opacity: ${({ $visible }) => $visible ? 1 : 0}; transition: opacity 0.12s; z-index: 10;
  &::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 4px solid transparent; border-top-color: #14261a; }
`;

const DonutChart: React.FC<{ slices: { value: number; color: string; label?: string }[]; size?: number }> = ({ slices, size = 200 }) => {
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  const strokeW = 28;
  const r = size / 2 - strokeW / 2 - 4;
  const c = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;

  if (total === 0) return (
    <svg width={size} height={size}><circle cx={cx} cy={cy} r={r} fill="none" stroke="#d4e2d4" strokeWidth={strokeW} /></svg>
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
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
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
          REPLIES
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
    background: ${({ theme }) => theme.mode === 'dark' ? '#0a140d' : '#ecf2ec'};
    border: 1.5px solid ${({ theme }) => theme.colors.border};
    box-shadow:
      0 34px 0 ${({ theme }) => theme.mode === 'dark' ? '#0a140d' : '#ecf2ec'},
      0 34px 0 0 ${({ theme }) => theme.colors.border},
      0 68px 0 ${({ theme }) => theme.mode === 'dark' ? '#0a140d' : '#ecf2ec'},
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
const Empty = styled.div`text-align: center; padding: 32px 16px; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; display: flex; flex-direction: column; align-items: center; gap: 12px;`;

const EmptyDonutSvg = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="30" stroke="#e2e8f0" strokeWidth="12"/>
    <path d="M40 10a30 30 0 0 1 21.2 8.8" stroke="#cbd5e1" strokeWidth="12" strokeLinecap="round"/>
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
  border: 3px solid ${({ theme }) => theme.mode === 'dark' ? '#1e3a25' : '#d4e2d4'};
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

/* ── Demo hint ── */
const DemoHint = styled.div`
  font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; font-style: italic;
`;

/* ══════════ DEMO MOCK DATA ══════════ */
const DEMO_COMPANIES = ['Stripe', 'Notion', 'Vercel', 'Figma', 'Linear', 'Retool', 'Supabase', 'Clerk', 'Resend', 'Neon',
  'PostHog', 'Cal.com', 'Dub.co', 'Trigger.dev', 'Inngest', 'Tiptap', 'Liveblocks', 'Prisma', 'PlanetScale', 'Turso'];

function generateDemoLeads(): Lead[] {
  const now = Date.now();
  const day = 86400000;
  return DEMO_COMPANIES.map((name, i) => {
    const status = i < 17 ? 'contacted' : 'new';
    const replied = i < 9;
    const cats = ['interested', 'meeting', 'question', 'not_interested', 'auto_reply'];
    const cat = replied ? cats[i % 5] : undefined;
    return {
      _id: `demo-lead-${i}`,
      company_name: name,
      email: `hello@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      status,
      _replied: replied,
      _reply_category: cat,
      _reply_at: replied ? new Date(now - (i + 1) * day * 0.5).toISOString() : undefined,
      _pending_meeting: cat === 'meeting',
      _followup_count: i < 5 ? 1 : 0,
      created_at: new Date(now - (20 - i) * day).toISOString(),
    } as any;
  });
}

function generateDemoEmails(): EmailItem[] {
  const now = Date.now();
  const day = 86400000;
  const statuses = ['sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'pending', 'pending', 'pending', 'approved', 'approved'];
  return statuses.map((status, i) => ({
    _id: `demo-email-${i}`,
    to_email: `hello@${DEMO_COMPANIES[i % DEMO_COMPANIES.length].toLowerCase().replace(/[^a-z]/g, '')}.com`,
    company_name: DEMO_COMPANIES[i % DEMO_COMPANIES.length],
    subject: `Partnership Opportunity — ${DEMO_COMPANIES[i % DEMO_COMPANIES.length]}`,
    status,
    _type: i < 6 ? 'outreach' : i < 8 ? 'followup' : i < 10 ? 'outreach' : 'reply',
    sent_at: status === 'sent' ? new Date(now - (i + 1) * day * 0.3).toISOString() : undefined,
    created_at: new Date(now - (i + 1) * day * 0.25).toISOString(),
  } as any));
}

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
  const demoMode = realLeads.length === 0 && realEmails.length === 0;
  const allLeads: Lead[] = demoMode ? demoLeads : realLeads;
  const allEmails: EmailItem[] = demoMode ? demoEmails : realEmails;

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

  const greetingKey = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'dashboard.greetingMorning';
    if (h < 18) return 'dashboard.greetingAfternoon';
    return 'dashboard.greetingEvening';
  })();

  return (
    <Page>
      {/* ── Demo hint (auto, no toggle) ── */}
      {demoMode && <DemoHint>Showing simulated data for demonstration</DemoHint>}

      {/* ── Greeting ── */}
      <div>
        <PageTitle>{t(greetingKey)}</PageTitle>
        <PageSub>{t('dashboard.greetingSub')}</PageSub>
      </div>

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
          $accent="#0ea5e9" $bg1={dark ? 'rgba(103,232,249,0.06)' : '#ecfeff'} $bg2={dark ? 'rgba(103,232,249,0.12)' : '#cffafe'}
          onClick={() => navigate('/cms-leads?tab=replied&sub=meeting')}
        >
          <ActionArrow $fg={dark ? '#67e8f9' : '#0ea5e9'}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </ActionArrow>
          <ActionWatermark $fg="#0ea5e9"><IconClock /></ActionWatermark>
          <ActionTitle $fg={dark ? '#67e8f9' : '#0369a1'}>{t('dashboard.cardTitleMeeting')}</ActionTitle>
          <ActionCount $fg={dark ? '#67e8f9' : '#0ea5e9'}>{actions.pendingMeetings}</ActionCount>
          <ActionLabel $fg={dark ? '#67e8f9' : '#0ea5e9'}>{t('dashboard.pendingMeetings')}</ActionLabel>
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

      {/* ── Funnel (50%) + Reply Distribution (50%) ── */}
      <Row $cols="minmax(0,1fr) minmax(0,1fr)">
        <Card $topAccent="#0ea5e9">
          <CardHeader>
            <CardIcon $color="#0ea5e9"><IconFunnel /></CardIcon>
            {t('dashboard.funnel')}
          </CardHeader>
          <CardBody>
            <BarChart dark={dark} bars={[
              { label: `${t('dashboard.newLeads')} (${funnel.total})`, value: funnel.total, color: '#67e8f9',
                formula: t('dashboard.tipTotalLeads', { count: funnel.total }) },
              { label: `${t('dashboard.contacted')} ${funnel.total > 0 ? Math.round((funnel.contacted / funnel.total) * 100) : 0}%`, value: funnel.contacted, color: '#fcd34d',
                formula: t('dashboard.tipContactRate', { contacted: funnel.contacted, total: funnel.total }) },
              { label: `${t('dashboard.replied')} ${funnel.contacted > 0 ? Math.round((funnel.replied / funnel.contacted) * 100) : 0}%`, value: funnel.replied, color: '#4ade80',
                formula: t('dashboard.tipReplyRate', { replied: funnel.replied, contacted: funnel.contacted }) },
              { label: `${t('dashboard.meetings')} ${funnel.replied > 0 ? Math.round((funnel.meetings / funnel.replied) * 100) : 0}%`, value: funnel.meetings, color: '#93c5fd',
                formula: t('dashboard.tipMeetingRate', { meetings: funnel.meetings, replied: funnel.replied }) },
              { label: `${t('dashboard.totalEmailsSent')} (${stats.sentEmails})`, value: stats.sentEmails, color: '#fda4af',
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
              <Empty><EmptyDonutSvg />{t('dashboard.noReplyData')}</Empty>
            ) : (
              <DonutWrap>
                <DonutChart slices={[
                  { value: replyCats.interested, color: '#4ade80', label: t('dashboard.interested') },
                  { value: replyCats.meeting, color: '#67e8f9', label: t('dashboard.meetingCat') },
                  { value: replyCats.question, color: '#fcd34d', label: t('dashboard.question') },
                  { value: replyCats.not_interested, color: '#fda4af', label: t('dashboard.notInterested') },
                  { value: replyCats.auto_reply, color: '#cbd5e1', label: t('dashboard.autoReply') },
                ]} />
                <LegendList>
                  {[
                    { color: '#4ade80', label: t('dashboard.interested'), value: replyCats.interested },
                    { color: '#67e8f9', label: t('dashboard.meetingCat'), value: replyCats.meeting },
                    { color: '#fcd34d', label: t('dashboard.question'), value: replyCats.question },
                    { color: '#fda4af', label: t('dashboard.notInterested'), value: replyCats.not_interested },
                    { color: '#cbd5e1', label: t('dashboard.autoReply'), value: replyCats.auto_reply },
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

        <NotebookCard $topAccent="#4a6b52">
          <CardHeader>
            <CardIcon $color="#4a6b52"><IconActivity /></CardIcon>
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
                      $bg={item.type === 'sent' ? (dark ? '#083344' : '#cffafe') : item.type === 'reply' ? (dark ? '#14532d' : '#dcfce7') : (dark ? '#422006' : '#fef3c7')}
                      $fg={item.type === 'sent' ? '#0ea5e9' : item.type === 'reply' ? '#22c55e' : '#f59e0b'}
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
