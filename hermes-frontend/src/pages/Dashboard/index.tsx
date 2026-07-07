import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useLeads, useEmailQueue } from '../../api/hooks';
import { Lead } from '../../api/leads';
import { EmailItem } from '../../api/emailQueue';
import client from '../../api/client';
import { media } from '../../styles/media';

/* ══════════════════════════════════════
   Lead Scraper CMS Dashboard
   ══════════════════════════════════════ */

/* ── Layout ── */

const Page = styled.div`display: flex; flex-direction: column; gap: 20px; padding-bottom: 32px; overflow: hidden; min-width: 0;`;

const PageTitle = styled.h1`
  font-size: 1.25rem; font-weight: 700; margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;
const PageSub = styled.p`
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin: 2px 0 0;
`;

const HeaderRow = styled.div`
  display: flex; align-items: flex-end; justify-content: space-between;
  ${media.mobile} { flex-direction: column; align-items: flex-start; gap: 8px; }
`;

/* ── Date Range Picker ── */

const DRWrap = styled.div`position: relative;`;
const DRTrigger = styled.button`
  display: flex; align-items: center; gap: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px; padding: 7px 14px; cursor: pointer;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textSecondary};
  font-family: inherit; transition: border-color 0.15s;
  &:hover { border-color: #93c5fd; }
`;
const DRDrop = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 50;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px; padding: 16px; gap: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.12);
`;
const DRMonth = styled.div`width: 224px;`;
const DRNav = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;`;
const DRNavBtn = styled.button`
  background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 4px;
  color: ${({ theme }) => theme.colors.textSecondary}; font-size: 1rem;
  &:hover { background: ${({ theme }) => theme.colors.border}; }
`;
const DRTitle = styled.span`font-size: 0.8125rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary};`;
const DRGrid = styled.div`display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center;`;
const DRDow = styled.div`font-size: 0.6875rem; font-weight: 500; color: ${({ theme }) => theme.colors.textTertiary}; padding: 4px 0;`;
const DRDay = styled.button<{ $sel?: boolean; $inRange?: boolean; $today?: boolean; $out?: boolean }>`
  border: none; background: ${({ $sel, $inRange }) => $sel ? '#3b82f6' : $inRange ? '#dbeafe' : 'transparent'};
  color: ${({ $sel, $out }) => $sel ? '#fff' : $out ? '#cbd5e1' : 'inherit'};
  font-size: 0.75rem; padding: 6px 0; border-radius: 6px; cursor: pointer;
  font-weight: ${({ $sel, $today }) => $sel || $today ? 600 : 400};
  ${({ $today, $sel }) => $today && !$sel && 'box-shadow: inset 0 0 0 1px #3b82f6;'}
  &:hover { background: ${({ $sel }) => $sel ? '#2563eb' : '#f1f5f9'}; }
`;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOWS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const fmtD = (d: Date) => `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const MonthGrid: React.FC<{
  year: number; month: number;
  start: Date; end: Date;
  onPick: (d: Date) => void;
}> = ({ year, month, start, end, onPick }) => {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const cells: React.ReactNode[] = [];
  // prev-month filler
  const prevDays = new Date(year, month, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--)
    cells.push(<DRDay key={`p${i}`} $out disabled>{prevDays - i}</DRDay>);
  // days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const sel = sameDay(date, start) || sameDay(date, end);
    const inRange = date > start && date < end;
    const isToday = sameDay(date, today);
    cells.push(<DRDay key={d} $sel={sel} $inRange={inRange} $today={isToday} onClick={() => onPick(date)}>{d}</DRDay>);
  }
  // next-month filler
  const rem = 42 - cells.length;
  for (let i = 1; i <= rem; i++)
    cells.push(<DRDay key={`n${i}`} $out disabled>{i}</DRDay>);
  return (
    <DRGrid>
      {DOWS.map(d => <DRDow key={d}>{d}</DRDow>)}
      {cells}
    </DRGrid>
  );
};

const DateRangePicker: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(() => new Date(Date.now() - 30 * 864e5));
  const [end, setEnd] = useState(() => new Date());
  const [picking, setPicking] = useState<'start'|'end'>('start');
  const [lYear, setLYear] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.getFullYear(); });
  const [lMonth, setLMonth] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.getMonth(); });
  const ref = useRef<HTMLDivElement>(null);

  const rYear = lMonth === 11 ? lYear + 1 : lYear;
  const rMonth = (lMonth + 1) % 12;

  const prev = () => { if (lMonth === 0) { setLMonth(11); setLYear(y => y - 1); } else setLMonth(m => m - 1); };
  const next = () => { if (lMonth === 11) { setLMonth(0); setLYear(y => y + 1); } else setLMonth(m => m + 1); };

  const pick = useCallback((d: Date) => {
    if (picking === 'start') { setStart(d); setEnd(d); setPicking('end'); }
    else { if (d < start) { setStart(d); setPicking('end'); } else { setEnd(d); setPicking('start'); setOpen(false); } }
  }, [picking, start]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <DRWrap ref={ref}>
      <DRTrigger onClick={() => setOpen(o => !o)}>
        <IconCalendar />
        {fmtD(start)} — {fmtD(end)}
      </DRTrigger>
      <DRDrop $open={open}>
        <DRMonth>
          <DRNav>
            <DRNavBtn onClick={prev}>‹</DRNavBtn>
            <DRTitle>{MONTHS[lMonth]} {lYear}</DRTitle>
            <span />
          </DRNav>
          <MonthGrid year={lYear} month={lMonth} start={start} end={end} onPick={pick} />
        </DRMonth>
        <DRMonth>
          <DRNav>
            <span />
            <DRTitle>{MONTHS[rMonth]} {rYear}</DRTitle>
            <DRNavBtn onClick={next}>›</DRNavBtn>
          </DRNav>
          <MonthGrid year={rYear} month={rMonth} start={start} end={end} onPick={pick} />
        </DRMonth>
      </DRDrop>
    </DRWrap>
  );
};

const Row = styled.div<{ $cols?: string; $gap?: number }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || 'repeat(4, 1fr)'};
  gap: ${({ $gap }) => $gap ?? 12}px;
  ${media.mobile} { grid-template-columns: 1fr; }
  ${media.tablet} { grid-template-columns: repeat(2, 1fr); }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  min-width: 0;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
`;

const CardHeader = styled.div`
  padding: 16px 20px;
  font-size: 0.875rem; font-weight: 600; letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  text-transform: uppercase;
`;

const CardBody = styled.div`padding: 16px 20px 20px;`;

/* ── KPI Card (LUNO style) ── */

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  ${media.tablet} { grid-template-columns: repeat(2, 1fr); }
  ${media.mobile} { grid-template-columns: 1fr; }
`;
const KpiCard = styled(Card)<{ $bg?: string }>`
  padding: 18px 20px; min-width: 0; text-transform: uppercase;
  ${({ $bg }) => $bg && `background: ${$bg}; border-color: transparent;`}
`;
const KpiRow = styled.div`display: flex; align-items: center; gap: 14px;`;
const KpiIcon = styled.div<{ $bg: string; $fg: string }>`
  width: 46px; height: 46px; border-radius: 50%;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
`;
const KpiLabel = styled.div`
  font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textSecondary}; margin-bottom: 4px; font-weight: 600;
`;
const KpiValue = styled.div`font-size: 1.35rem; font-weight: 800; color: ${({ theme }) => theme.colors.textPrimary}; line-height: 1.1;`;
const KpiChange = styled.small<{ $up: boolean }>`
  font-size: 0.6875rem; font-weight: 600;
  color: ${({ $up }) => $up ? '#16a34a' : '#dc2626'};
  margin-left: 6px;
`;
const KpiSub = styled.span`font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; font-weight: 400; margin-left: 4px;`;

/* ── Action Item ── */

const ActionList = styled.div`display: flex; flex-direction: column; gap: 0;`;
const ActionItem = styled.div`
  display: flex; align-items: center; gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
  transition: background 0.15s;
  margin: 0 -20px; padding-left: 20px; padding-right: 20px;
  &:hover { background: rgba(0,0,0,0.015); }
`;
const ActionDot = styled.div<{ $color: string }>`
  width: 10px; height: 10px; border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0; opacity: 0.85;
`;
const ActionText = styled.div`flex: 1; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textPrimary}; font-weight: 400;`;
const ActionCount = styled.span<{ $bg: string; $fg: string }>`
  padding: 3px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;
  background: ${({ $bg }) => $bg}; color: ${({ $fg }) => $fg};
  min-width: 24px; text-align: center;
`;

/* ── Bar Chart (LUNO style horizontal bars) ── */

interface BarData { label: string; value: number; color: string }

const BarChart: React.FC<{ bars: BarData[] }> = ({ bars }) => {
  const w = 440;
  const h = 160;
  const pl = 52;   /* left for labels */
  const pr = 32;   /* right for value text */
  const pt = 6;
  const pb = 6;
  const chartW = w - pl - pr;
  const chartH = h - pt - pb;
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const barH = Math.min(22, (chartH / bars.length) * 0.58);
  const gap = chartH / bars.length;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      <defs>
        {bars.map((b, i) => (
          <linearGradient key={i} id={`bar${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={b.color} stopOpacity="0.65" />
            <stop offset="100%" stopColor={b.color} stopOpacity="0.95" />
          </linearGradient>
        ))}
      </defs>

      {bars.map((b, i) => {
        const y = pt + gap * i + (gap - barH) / 2;
        const barW = Math.max((b.value / maxVal) * chartW, 6);
        const r = 5;
        return (
          <g key={i}>
            {/* bg track */}
            <rect x={pl} y={y} width={chartW} height={barH} rx={r} ry={r} fill="#f1f5f9" />
            {/* bar */}
            <rect x={pl} y={y} width={barW} height={barH} rx={r} ry={r} fill={`url(#bar${i})`} />
            {/* label left */}
            <text x={pl - 8} y={y + barH / 2} textAnchor="end" fill="#64748b" fontSize="9" fontWeight="500" dominantBaseline="central">{b.label}</text>
            {/* value right */}
            <text x={pl + barW + 8} y={y + barH / 2} textAnchor="start" fill={b.color} fontSize="9.5" fontWeight="700" dominantBaseline="central">{b.value}</text>
          </g>
        );
      })}
    </svg>
  );
};

/* ── Donut Chart ── */

const DonutWrap = styled.div`display: flex; align-items: center; gap: 24px; justify-content: center;`;
const LegendList = styled.div`display: flex; flex-direction: column; gap: 8px;`;
const LegendItem = styled.div`display: flex; align-items: center; gap: 8px; font-size: 0.8125rem;`;
const LegendDot = styled.div<{ $color: string }>`width: 10px; height: 10px; border-radius: 50%; background: ${({ $color }) => $color}; flex-shrink: 0;`;
const LegendVal = styled.span`font-weight: 600; margin-left: auto; min-width: 20px; text-align: right;`;

/* ── Activity Feed ── */

const FeedList = styled.div`display: flex; flex-direction: column; gap: 0;`;
const FeedItem = styled.div`
  display: flex; gap: 14px; padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
`;
const FeedIcon = styled.div<{ $bg: string; $fg: string }>`
  width: 32px; height: 32px; border-radius: 8px;
  background: ${({ $bg }) => $bg}; color: ${({ $fg }) => $fg};
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; flex-shrink: 0;
`;
const FeedBody = styled.div`flex: 1; min-width: 0;`;
const FeedText = styled.div`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textPrimary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
const FeedTime = styled.div`font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 2px;`;

/* ── Empty State ── */

const Empty = styled.div`
  text-align: center; padding: 32px 16px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Schedule ── */

const SchedHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
`;
const SchedToday = styled.span`
  font-size: 0.75rem; font-weight: 600; color: #fff;
  background: #2563eb; border-radius: 6px; padding: 2px 10px;
`;
const SchedLink = styled.a`
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.blue};
  text-decoration: none; cursor: pointer;
  &:hover { text-decoration: underline; }
`;
const SchedList = styled.div`display: flex; flex-direction: column; gap: 0;`;
const SchedItem = styled.div<{ $isToday?: boolean }>`
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
  ${({ $isToday }) => $isToday && 'background: #eff6ff; margin: 0 -20px; padding: 10px 20px; border-radius: 6px;'}
`;
const SchedTime = styled.div`
  font-size: 0.75rem; font-weight: 600; color: ${({ theme }) => theme.colors.textSecondary};
  width: 56px; flex-shrink: 0;
`;
const SchedDot = styled.div<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 50%;
  background: ${({ $color }) => $color}; flex-shrink: 0;
`;
const SchedTitle = styled.div`
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textPrimary};
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;
const SchedDate = styled.div`
  font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary};
  flex-shrink: 0;
`;

/* ══════════ Donut SVG ══════════ */

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
        const el = (
          <circle
            key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={sl.color} strokeWidth="16"
            strokeDasharray={dash} strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        );
        offset += pct * c;
        return el;
      })}
      <text
        x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: '1.5rem', fontWeight: 700, fill: 'currentColor' }}
      >
        {total}
      </text>
    </svg>
  );
};

/* ── SVG Icons ── */

const IconLeads = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconDraft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const IconRocket = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
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

const IconNewLead = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
);

const IconPen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

/* ══════════ Helpers ══════════ */

const isNewLead = (l: Lead) => l.status === 'new' || l.status === null || l.status === undefined;
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

interface UpcomingEvent {
  title: string;
  start: string;
  all_day?: boolean;
  color?: string;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Fetch all leads (high limit for stats)
  const { data: leadsData, isLoading: leadsLoading } = useLeads({ page: 1, limit: 100 });
  const { data: emailData, isLoading: emailsLoading } = useEmailQueue({ page: 1, limit: 100 });

  // Fetch calendar events for current + next month (auto-refresh every 60s)
  const [calEvents, setCalEvents] = useState<UpcomingEvent[]>([]);
  useEffect(() => {
    const fetchEvents = () => {
      const now = new Date();
      const m1 = now.getMonth() + 1;
      const y1 = now.getFullYear();
      const m2 = m1 === 12 ? 1 : m1 + 1;
      const y2 = m1 === 12 ? y1 + 1 : y1;
      Promise.all([
        client.get('/calendar', { params: { month: m1, year: y1 } }).catch(() => ({ data: [] })),
        client.get('/calendar', { params: { month: m2, year: y2 } }).catch(() => ({ data: [] })),
      ]).then(([r1, r2]) => {
        const parse = (r: any) => {
          const items = r.data?.data ?? r.data ?? [];
          return Array.isArray(items) ? items : [];
        };
        const all = [...parse(r1), ...parse(r2)] as UpcomingEvent[];
        // Filter to upcoming events — hide events whose start time has already passed
        const nowIso = new Date().toISOString();
        const upcoming = all
          .filter(e => e.start && (e.all_day ? e.start.slice(0, 10) >= nowIso.slice(0, 10) : e.start >= nowIso))
          .sort((a, b) => a.start.localeCompare(b.start))
          .slice(0, 8);
        setCalEvents(upcoming);
      });
    };
    fetchEvents();
    const timer = setInterval(fetchEvents, 60_000); // 每 60 秒刷新
    return () => clearInterval(timer);
  }, []);

  const allLeads: Lead[] = leadsData?.data || [];
  const allEmails: EmailItem[] = emailData?.data || [];

  // ── KPI stats ──
  const stats = useMemo(() => {
    const total = allLeads.length;
    const contacted = allLeads.filter(l => l.status === 'contacted').length;
    const replied = allLeads.filter(l => l._replied).length;
    const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

    const pendingDrafts = allEmails.filter(e => e.status === 'pending').length;
    const sentEmails = allEmails.filter(e => e.status === 'sent').length;

    // 本週已發送
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const sentThisWeek = allEmails.filter(e => e.status === 'sent' && e.sent_at && e.sent_at >= weekAgo).length;

    const newLeads = allLeads.filter(l => l.status === 'new' || l.status === null || l.status === undefined).length;
    return { total, contacted, replied, replyRate, pendingDrafts, sentEmails, sentThisWeek, newLeads };
  }, [allLeads, allEmails]);

  // ── Action items ──
  const actions = useMemo(() => {
    const pendingDrafts = allEmails.filter(e => e.status === 'pending').length;
    const newReplies = allLeads.filter(l => l._replied && l._reply_category && l._reply_category !== 'auto_reply' && l._reply_category !== 'not_interested').length;
    const pendingMeetings = allLeads.filter(l => l._pending_meeting).length;
    const noReplyNoFollowup = allLeads.filter(l => l.status === 'contacted' && !l._replied && !l._followup_count).length;
    return { pendingDrafts, newReplies, pendingMeetings, noReplyNoFollowup };
  }, [allLeads, allEmails]);

  // ── Funnel ──
  const funnel = useMemo(() => {
    const total = allLeads.length;
    const contacted = allLeads.filter(l => l.status === 'contacted').length;
    const replied = allLeads.filter(l => l._replied).length;
    const meetings = allLeads.filter(l => l._reply_category === 'meeting').length;
    return { total, contacted, replied, meetings };
  }, [allLeads]);

  // ── Reply category distribution ──
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

  // ── Recent activity (merge recent emails + replies, sort by date) ──
  const recentActivity = useMemo(() => {
    const items: { type: 'sent' | 'reply' | 'draft'; text: string; time: string; date: string }[] = [];

    // Recent sent emails
    allEmails
      .filter(e => e.status === 'sent' && e.sent_at)
      .sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || ''))
      .slice(0, 5)
      .forEach(e => items.push({
        type: 'sent',
        text: t('dashboard.sentTo', { target: e.company_name || e.to_email }) + (e._type === 'followup' ? t('dashboard.followup') : e._type === 'reply' ? t('dashboard.reply') : ''),
        time: timeAgo(e.sent_at, t),
        date: e.sent_at || '',
      }));

    // Recent replies
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
          time: timeAgo(l._reply_at, t),
          date: l._reply_at || '',
        });
      });

    // Recent pending drafts
    allEmails
      .filter(e => e.status === 'pending')
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 3)
      .forEach(e => items.push({
        type: 'draft',
        text: t('dashboard.newDraft', { target: e.company_name || e.to_email }) + (e._type === 'followup' ? t('dashboard.followup') : e._type === 'reply' ? t('dashboard.reply') : t('dashboard.outreach')),
        time: timeAgo(e.created_at, t),
        date: e.created_at || '',
      }));

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [allLeads, allEmails, t]);

  const loading = leadsLoading || emailsLoading;

  if (loading) {
    return <Page><Empty>{t('dashboard.loading')}</Empty></Page>;
  }

  const funnelMax = Math.max(funnel.total, 1);

  return (
    <Page>
      {/* Header */}
      <HeaderRow>
        <div>
          <PageTitle>{t('dashboard.title')}</PageTitle>
          <PageSub>{t('dashboard.subtitle')}</PageSub>
        </div>
        <DateRangePicker />
      </HeaderRow>

      {/* KPI Row — LUNO style */}
      <KpiGrid>
        <KpiCard $bg="#eff6ff">
          <KpiRow>
            <KpiIcon $bg="#dbeafe" $fg="#2563eb"><IconLeads /></KpiIcon>
            <div>
              <KpiLabel>{t('dashboard.totalLeads')}</KpiLabel>
              <KpiValue>{stats.total}<KpiChange $up={stats.newLeads > 0}>{stats.newLeads > 0 ? `+${stats.newLeads}` : '0'}</KpiChange></KpiValue>
            </div>
          </KpiRow>
        </KpiCard>
        <KpiCard $bg="#fefce8">
          <KpiRow>
            <KpiIcon $bg="#fef9c4" $fg="#ca8a04"><IconDraft /></KpiIcon>
            <div>
              <KpiLabel>{t('dashboard.pendingDrafts')}</KpiLabel>
              <KpiValue>{stats.pendingDrafts}<KpiChange $up={stats.pendingDrafts === 0}>{stats.pendingDrafts > 0 ? t('dashboard.pending') : t('dashboard.clear')}</KpiChange></KpiValue>
            </div>
          </KpiRow>
        </KpiCard>
        <KpiCard $bg="#f0fdf4">
          <KpiRow>
            <KpiIcon $bg="#dcfce7" $fg="#16a34a"><IconChart /></KpiIcon>
            <div>
              <KpiLabel>{t('dashboard.replyRate')}</KpiLabel>
              <KpiValue>{stats.replyRate}%<KpiChange $up={stats.replyRate > 0}>{stats.replied}/{stats.contacted}</KpiChange></KpiValue>
            </div>
          </KpiRow>
        </KpiCard>
        <KpiCard $bg="#faf5ff">
          <KpiRow>
            <KpiIcon $bg="#f3e8ff" $fg="#8b5cf6"><IconRocket /></KpiIcon>
            <div>
              <KpiLabel>{t('dashboard.sentThisWeek')}</KpiLabel>
              <KpiValue>{stats.sentThisWeek}<KpiChange $up={stats.sentThisWeek > 0}>/{stats.sentEmails}</KpiChange></KpiValue>
            </div>
          </KpiRow>
        </KpiCard>
      </KpiGrid>

      {/* Action Items + Funnel */}
      <Row $cols="1fr 1fr" $gap={16}>
        {/* 待處理事項 */}
        <Card>
          <CardHeader>{t('dashboard.actionItems')}</CardHeader>
          <CardBody>
            <ActionList>
              <ActionItem>
                <ActionDot $color="#d97706" />
                <ActionText>{t('dashboard.draftsPendingApproval')}</ActionText>
                <ActionCount $bg="#fef3c7" $fg="#b45309">{actions.pendingDrafts}</ActionCount>
              </ActionItem>
              <ActionItem>
                <ActionDot $color="#16a34a" />
                <ActionText>{t('dashboard.newRepliesToHandle')}</ActionText>
                <ActionCount $bg="#dcfce7" $fg="#16a34a">{actions.newReplies}</ActionCount>
              </ActionItem>
              <ActionItem>
                <ActionDot $color="#8b5cf6" />
                <ActionText>{t('dashboard.pendingMeetings')}</ActionText>
                <ActionCount $bg="#f3e8ff" $fg="#8b5cf6">{actions.pendingMeetings}</ActionCount>
              </ActionItem>
              <ActionItem>
                <ActionDot $color="#dc2626" />
                <ActionText>{t('dashboard.contactedNoFollowup')}</ActionText>
                <ActionCount $bg="#fee2e2" $fg="#dc2626">{actions.noReplyNoFollowup}</ActionCount>
              </ActionItem>
            </ActionList>
          </CardBody>
        </Card>

        {/* 轉化漏斗 */}
        <Card>
          <CardHeader>{t('dashboard.funnel')}</CardHeader>
          <CardBody>
            <BarChart bars={[
              { label: t('dashboard.newLeads'), value: funnel.total, color: '#3b82f6' },
              { label: t('dashboard.contacted'), value: funnel.contacted, color: '#f59e0b' },
              { label: t('dashboard.replied'), value: funnel.replied, color: '#22c55e' },
              { label: t('dashboard.meetings'), value: funnel.meetings, color: '#8b5cf6' },
            ]} />
          </CardBody>
        </Card>
      </Row>

      {/* Reply Distribution + Schedule + Recent Activity */}
      <Row $cols="1fr 1fr 1fr" $gap={16}>
        {/* 回覆分類分佈 */}
        <Card>
          <CardHeader>{t('dashboard.replyDistribution')}</CardHeader>
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

        {/* 即將到來嘅日程 */}
        <Card>
          <CardHeader>
            <span>{t('dashboard.upcomingSchedule')}</span>
            <SchedLink onClick={() => navigate('/app-calendar')}>{t('dashboard.viewFullCalendar')}</SchedLink>
          </CardHeader>
          <CardBody>
            {calEvents.length === 0 ? (
              <Empty>{t('dashboard.noUpcomingSchedule')}</Empty>
            ) : (
              <SchedList>
                {(() => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const todayCount = calEvents.filter(e => e.start.slice(0, 10) === todayStr).length;
                  return todayCount > 0 ? (
                    <div style={{ marginBottom: 8 }}>
                      <SchedToday>{t('dashboard.todaySchedules', { count: todayCount })}</SchedToday>
                    </div>
                  ) : null;
                })()}
                {calEvents.map((ev, i) => {
                  const d = new Date(ev.start);
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const isToday = ev.start.slice(0, 10) === todayStr;
                  const h = d.getHours();
                  const m = d.getMinutes();
                  const timeStr = ev.all_day ? t('dashboard.allDay') : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  const dateStr = isToday ? t('dashboard.today') : `${d.getMonth() + 1}/${d.getDate()}`;
                  return (
                    <SchedItem key={i} $isToday={isToday}>
                      <SchedTime>{timeStr}</SchedTime>
                      <SchedDot $color={ev.color || '#2563eb'} />
                      <SchedTitle>{ev.title}</SchedTitle>
                      <SchedDate>{dateStr}</SchedDate>
                    </SchedItem>
                  );
                })}
              </SchedList>
            )}
          </CardBody>
        </Card>

        {/* 最近活動 */}
        <Card>
          <CardHeader>{t('dashboard.recentActivity')}</CardHeader>
          <CardBody>
            {recentActivity.length === 0 ? (
              <Empty>{t('dashboard.noActivity')}</Empty>
            ) : (
              <FeedList>
                {recentActivity.map((item, i) => (
                  <FeedItem key={i}>
                    <FeedIcon
                      $bg={item.type === 'sent' ? '#dbeafe' : item.type === 'reply' ? '#dcfce7' : '#fef3c7'}
                      $fg={item.type === 'sent' ? '#2563eb' : item.type === 'reply' ? '#16a34a' : '#d97706'}
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
          </CardBody>
        </Card>
      </Row>
    </Page>
  );
};

export default Dashboard;
