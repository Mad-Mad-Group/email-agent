import React, { useState, useEffect, useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';
import { glassSurface, glassSurfaceLight } from '../../styles/glassSurface';
import client from '../../api/client';

/* ══════════════════════════════════════
   LUNO Calendar — Month + Week views
   ══════════════════════════════════════ */

/* ── Layout ── */

const Page = styled.div`
  display: flex; flex-direction: column; gap: 20px;
  padding: 36px 32px 44px;
  animation: fadeSlideUp 0.5s var(--ease-out) both;
  ${media.tablet} { padding: 24px 18px 32px; }
  ${media.mobile} { padding: 20px 16px 32px; }
`;

const CalLayout = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;
  ${media.tabletDown} {
    flex-direction: column;
  }
`;

const Sidebar = styled.div`
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  ${media.mobile} {
    width: 100%;
  }
`;

const MainArea = styled.div`
  flex: 1;
  min-width: 0;
  position: relative;
`;

const AgendaPanel = styled.div`
  ${glassSurface}
  width: 280px;
  flex-shrink: 0;
  padding: 16px 20px;
  align-self: flex-start;
  position: sticky;
  top: 16px;
  border-radius: 14px;
  ${media.tabletDown} {
    width: 100%;
    position: static;
  }
`;

const Card = styled.div`
  ${glassSurface}
  border-radius: 14px;
`;

const SpiralCalCard = styled(Card)`
  position: relative;
  padding: 16px;
  overflow: visible;
  &::before, &::after {
    content: '';
    position: absolute;
    left: 4px; right: 4px;
    border-radius: 14px;
    z-index: -1;
    ${glassSurfaceLight}
  }
  &::before { bottom: -5px; height: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }
  &::after  { bottom: -9px; left: 8px; right: 8px; height: 8px; box-shadow: 0 3px 6px rgba(0,0,0,0.04); }
  ${media.tablet} { padding: 10px; }
  ${media.mobile} { padding: 8px; overflow-x: auto; }
`;

/* ── Header / Toolbar ── */

const CalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  flex-wrap: wrap; gap: 10px;
  ${media.tablet} { margin-bottom: 10px; }
`;

const CalTitle = styled.h2`font-size: 1.1rem; font-weight: 600; margin: 0;`;

const CalNav = styled.div`display: flex; gap: 4px; align-items: center;`;
const CalBtn = styled.button<{ $primary?: boolean; $disabled?: boolean }>`
  padding: 6px 14px; border-radius: 999px; border: 1px solid ${({ $primary, theme }) => $primary ? 'transparent' : theme.colors.border};
  font-size: 0.8125rem; cursor: pointer;
  background: ${({ $primary, theme }) => $primary ? theme.colors.accent : 'transparent'};
  color: ${({ $primary, $disabled, theme }) => $disabled ? theme.colors.textTertiary : $primary ? theme.colors.textInverted : theme.colors.textPrimary};
  opacity: ${({ $disabled }) => $disabled ? 0.6 : 1};
  transition: background 0.15s, opacity 0.15s;
  &:hover { opacity: 0.85; }
`;

/* ── Pill Toggle ── */

const PillWrap = styled.div`
  display: inline-flex;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border-radius: 20px;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const PillBtn = styled.button<{ $active: boolean }>`
  padding: 5px 16px;
  border-radius: 17px;
  border: none;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s var(--ease-out), color 0.2s var(--ease-out);
  background: ${({ $active, theme }) => $active ? theme.colors.accent : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.textInverted : theme.colors.textSecondary};
  &:hover { opacity: 0.85; }
`;

/* ── Month Grid ── */

const CalGrid = styled.div`
  display: grid; grid-template-columns: repeat(7, 1fr);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  overflow: hidden;
`;

const CalDayHeader = styled.div`
  padding: 8px 4px; text-align: center; font-size: 0.6875rem; font-weight: 600;
  text-transform: uppercase; color: ${({ theme }) => theme.colors.textTertiary};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CalCell = styled.div<{ $today?: boolean; $other?: boolean; $selected?: boolean }>`
  ${glassSurfaceLight}
  min-height: 90px; padding: 4px 6px; font-size: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  ${({ $selected, theme }) => $selected && `background: ${theme.colors.accent}15;`}
  ${({ $today, $selected, theme }) => !$selected && $today && `background: ${theme.strong.gold}15;`}
  color: ${({ $other, theme }) => $other ? theme.colors.textTertiary : theme.colors.textPrimary};
  cursor: pointer;
  transition: background 0.12s;
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
  &:nth-child(7n) { border-right: none; }
  ${media.tablet} { min-height: 56px; padding: 3px 4px; font-size: 0.7rem; }
  ${media.mobile} { min-height: 60px; font-size: 0.65rem; }
`;

const CellDay = styled.div<{ $today?: boolean }>`
  font-weight: ${({ $today }) => $today ? 700 : 400};
  margin-bottom: 2px;
  ${({ $today, theme }) => $today && css`
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%;
    background: ${theme.colors.accent}; color: ${theme.colors.textInverted};
  `}
`;

const EventBlock = styled.div<{ $color?: string; $past?: boolean }>`
  padding: 2px 6px; margin: 1px 0; border-radius: 6px; font-size: 0.65rem;
  background: ${({ $past, $color, theme }) => $past ? `${theme.colors.textTertiary}20` : `${$color || theme.colors.accent}18`};
  color: ${({ $past, $color, theme }) => $past ? theme.colors.textTertiary : ($color || theme.colors.accent)};
  font-weight: 500;
  text-decoration: ${({ $past }) => $past ? 'line-through' : 'none'};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  cursor: pointer;
  ${media.mobile} { font-size: 0.55rem; }
`;

const EventDot = styled.div<{ $past?: boolean }>`
  display: flex; align-items: center; gap: 4px; font-size: 0.65rem;
  color: ${({ $past, theme }) => $past ? theme.colors.textTertiary : 'inherit'};
  text-decoration: ${({ $past }) => $past ? 'line-through' : 'none'};
  padding: 1px 0;
  &::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: ${({ $past, theme }) => $past ? theme.colors.textTertiary : theme.colors.accent}; flex-shrink: 0;
  }
  ${media.mobile} { font-size: 0.55rem; }
`;

/* ── Week View ── */

const WeekGrid = styled.div`
  display: grid;
  grid-template-columns: 56px repeat(7, 1fr);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  overflow: hidden;
`;

const WeekDayHeader = styled.div<{ $today?: boolean }>`
  padding: 10px 4px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-right: none; }
  color: ${({ $today, theme }) => $today ? theme.colors.accent : theme.colors.textPrimary};
`;

const WeekDayNum = styled.div<{ $today?: boolean }>`
  font-size: 1.1rem;
  font-weight: 700;
  ${({ $today, theme }) => $today && css`
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 50%;
    background: ${theme.colors.accent}; color: ${theme.colors.textInverted};
  `}
`;

const WeekDayName = styled.div`
  font-size: 0.65rem;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-top: 2px;
`;

const TimeLabel = styled.div`
  padding: 0 6px;
  font-size: 0.65rem;
  font-family: 'JetBrains Mono', monospace;
  color: ${({ theme }) => theme.colors.textTertiary};
  text-align: right;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-top: 2px;
  min-height: 60px;
  ${media.tablet} { min-height: 44px; padding: 0 4px; font-size: 0.6rem; }
`;

const TimeCorner = styled.div`
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
`;

const WeekCell = styled.div<{ $today?: boolean }>`
  position: relative;
  min-height: 60px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  &:nth-child(8n) { border-right: none; } /* last col in 8-col grid */
  background: ${({ $today, theme }) => $today ? `${theme.colors.accent}08` : 'transparent'};
  ${media.tablet} { min-height: 44px; }
`;

/* ── Week Event Card ── */

const getTypeColor = (theme: any, type: string) => {
  const map: Record<string, string> = {
    meeting: theme.colors.accent,
    follow_up: theme.strong.olive,
    deadline: theme.strong.mauve,
    other: theme.colors.accent,
  };
  return map[type] || map.other;
};

const WeekEventCard = styled.div<{ $type: string; $top: number; $height: number }>`
  position: absolute;
  left: 3px; right: 3px;
  top: ${({ $top }) => $top}px;
  height: ${({ $height }) => Math.max($height, 28)}px;
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 0.7rem;
  overflow: hidden;
  cursor: pointer;
  z-index: 1;
  transition: transform 0.12s, box-shadow 0.12s;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: ${({ $type, theme }) => `${getTypeColor(theme, $type)}15`};
  border-left: 3px solid ${({ $type, theme }) => getTypeColor(theme, $type)};
  color: ${({ $type, theme }) => getTypeColor(theme, $type)};

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    z-index: 2;
  }
`;

const WeekEvTitle = styled.div`
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const WeekEvTime = styled.div`
  font-size: 0.6rem;
  opacity: 0.8;
`;

const WeekEvActions = styled.div`
  display: flex;
  gap: 4px;
  margin-top: auto;
`;

const WeekEvBtn = styled.button<{ $type: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid ${({ $type, theme }) => getTypeColor(theme, $type)};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: inherit;
  font-size: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { opacity: 0.75; }
`;

/* ── Now Indicator ── */

const NowLine = styled.div`
  position: absolute;
  left: 0; right: 0;
  height: 2px;
  background: ${({ theme }) => theme.strong.mauve};
  z-index: 3;
  &::before {
    content: '';
    position: absolute;
    left: -4px; top: -3px;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.strong.mauve};
  }
`;

const NowBadge = styled.div`
  position: absolute;
  left: 2px; right: 2px;
  height: 2px;
  background: ${({ theme }) => theme.strong.mauve};
  z-index: 3;
`;

/* ── Sidebar: Mini Calendar ── */

const SideCard = styled(Card)`
  padding: 14px;
`;

const SideTitle = styled.h4`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0 0 10px;
`;

const MiniCalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  text-align: center;
`;

const MiniCalHead = styled.div`
  font-size: 0.6rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textTertiary};
  padding: 2px;
`;

const MiniCalDay = styled.button<{ $today?: boolean; $other?: boolean; $inWeek?: boolean }>`
  border: none;
  background: ${({ $today, $inWeek, theme }) =>
    $today ? theme.colors.accent :
    $inWeek ? `${theme.colors.accent}15` :
    'transparent'};
  color: ${({ $today, $other, theme }) =>
    $today ? theme.colors.textInverted :
    $other ? theme.colors.textTertiary :
    theme.colors.textPrimary};
  font-size: 0.7rem;
  font-weight: ${({ $today }) => $today ? 700 : 400};
  border-radius: 50%;
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  margin: 0 auto;
  transition: background 0.12s;
  &:hover {
    background: ${({ $today, theme }) => $today ? theme.colors.accent : theme.colors.surfaceMuted};
  }
`;

const MiniNavRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const MiniNavTitle = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const MiniNavBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 2px 6px;
  border-radius: 4px;
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
`;

/* ── Sidebar: Type Filters ── */

const FilterRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const FilterDot = styled.span<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const FilterToggle = styled.div<{ $on: boolean }>`
  width: 32px; height: 18px; border-radius: 9px;
  background: ${({ $on, theme }) => $on ? theme.colors.accent : theme.colors.border};
  position: relative;
  margin-left: auto;
  flex-shrink: 0;
  transition: background 0.2s;
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $on }) => $on ? '16px' : '2px'};
    width: 14px; height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.textInverted};
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
`;

/* ── Sidebar: Upcoming ── */

const UpcomingItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
`;

const UpcomingDot = styled.div<{ $color: string }>`
  width: 6px; height: 6px; border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
  margin-top: 5px;
`;

const UpcomingInfo = styled.div`
  flex: 1; min-width: 0;
`;

const UpcomingTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UpcomingMeta = styled.div`
  font-size: 0.675rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-top: 1px;
`;

const UpcomingTag = styled.span<{ $color: string }>`
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  background: ${({ $color }) => $color}20;
  color: ${({ $color }) => $color};
  flex-shrink: 0;
  margin-top: 2px;
`;

/* ── Day Detail Panel (right-side slide-out) ── */

const dpSlideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
`;

const DayDetailWrap = styled(Card)`
  position: absolute;
  top: 0;
  right: 0;
  width: 33.333%;
  min-width: 240px;
  max-height: 100%;
  padding: 16px 14px;
  animation: ${dpSlideIn} 0.25s ease-out;
  overflow-y: auto;
  z-index: 5;
  box-shadow: -4px 0 16px rgba(0,0,0,0.08);
  ${media.mobile} {
    width: 100%;
    min-width: auto;
    position: relative;
    box-shadow: none;
  }
`;
const DayDetailHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
`;
const DayDetailTitle = styled.h3`
  margin: 0; font-size: 0.95rem; font-weight: 600; color: ${({ theme }) => theme.colors.textPrimary};
`;
const DayDetailClose = styled.button`
  background: transparent; border: none; cursor: pointer;
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: ${({ theme }) => theme.colors.accent};
  flex-shrink: 0; transition: background 0.15s var(--ease-out);
  &:hover { background: ${({ theme }) => `${theme.colors.accent}15`}; }
`;
const DayEventList = styled.div` display: flex; flex-direction: column; gap: 8px; `;
const DayEventItem = styled.div<{ $eventType?: string; $past?: boolean }>`
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border-left: 3px solid ${({ $past, $eventType, theme }) => $past ? theme.colors.textTertiary : getTypeColor(theme, $eventType || 'other')};
  opacity: ${({ $past }) => $past ? 0.6 : 1};
  transition: transform 0.1s;
  &:hover { transform: translateX(2px); }
`;
const DayEventTime = styled.span`
  font-size: 0.75rem; font-weight: 600; color: ${({ theme }) => theme.colors.textSecondary};
  min-width: 40px; flex-shrink: 0;
`;
const DayEventTitle = styled.span`
  font-size: 0.8125rem; font-weight: 500; color: ${({ theme }) => theme.colors.textPrimary};
`;
const DayEmptyText = styled.div`
  text-align: center; padding: 24px 0;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Footer ── */

const FooterWrap = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  a { color: ${({ theme }) => theme.colors.textTertiary}; text-decoration: none; }
`;

/* ── Agenda Date ── */

const AgendaDate = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Data ── */

interface CalEvent {
  day: number;
  title: string;
  time?: string;
  type: 'block' | 'dot';
  eventType: 'meeting' | 'follow_up' | 'deadline' | 'other';
  color?: string;
  span?: number;
  past?: boolean;
  startHour?: number;
  startMin?: number;
  endHour?: number;
  endMin?: number;
  description?: string;
  rawStart?: Date;
}

/* Mock data removed — calendar only shows real API events */

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: 'Meeting',
  follow_up: 'Follow-up',
  deadline: 'Deadline',
  other: 'Other',
};

function apiToCalEvents(apiEvents: any[]): CalEvent[] {
  const now = new Date();
  return apiEvents.map((e) => {
    const d = new Date(e.start);
    const end = e.end ? new Date(e.end) : new Date(d.getTime() + 3600000);
    const day = d.getDate();
    const h = d.getHours();
    const m = d.getMinutes();
    const time = e.all_day ? undefined : `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    return {
      day,
      title: e.title || 'Event',
      time,
      type: e.all_day ? 'block' as const : 'dot' as const,
      eventType: (e.type as CalEvent['eventType']) || 'other',
      color: e.color,
      past: end < now,
      startHour: h,
      startMin: m,
      endHour: end.getHours(),
      endMin: end.getMinutes(),
      description: e.description,
      rawStart: d,
    };
  });
}

/** Get the start of the week (Sunday) containing a date */
function getWeekStart(year: number, month: number, day: number): Date {
  const d = new Date(year, month, day);
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return d;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 ~ 22:00

/* ════════════════ Component ════════════════ */

const Calendar: React.FC = () => {
  const { t } = useTranslation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [apiEvents, setApiEvents] = useState<CalEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(today.getFullYear(), today.getMonth(), today.getDate()));
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({
    meeting: true, follow_up: true, deadline: true, other: true,
  });
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const months = useMemo(() => [
    t('calendar.january'), t('calendar.february'), t('calendar.march'),
    t('calendar.april'), t('calendar.may'), t('calendar.june'),
    t('calendar.july'), t('calendar.august'), t('calendar.september'),
    t('calendar.october'), t('calendar.november'), t('calendar.december'),
  ], [t]);

  const monthsShort = useMemo(() => [
    t('calendar.janShort'), t('calendar.febShort'), t('calendar.marShort'),
    t('calendar.aprShort'), t('calendar.mayShort'), t('calendar.junShort'),
    t('calendar.julShort'), t('calendar.augShort'), t('calendar.sepShort'),
    t('calendar.octShort'), t('calendar.novShort'), t('calendar.decShort'),
  ], [t]);

  const dayNames = useMemo(() => [
    t('calendar.sun'), t('calendar.mon'), t('calendar.tue'),
    t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat'),
  ], [t]);

  useEffect(() => {
    client.get('/calendar', { params: { month: month + 1, year } })
      .then((res) => {
        const items = (res.data as any)?.data ?? res.data ?? [];
        if (Array.isArray(items) && items.length > 0) {
          setApiEvents(apiToCalEvents(items));
        } else {
          setApiEvents([]);
        }
      })
      .catch(() => setApiEvents([]));
  }, [month, year]);

  const EVENTS = apiEvents;

  // Filtered events
  const filteredEvents = useMemo(
    () => EVENTS.filter(e => typeFilters[e.eventType] !== false),
    [EVENTS, typeFilters],
  );

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const cells: { day: number; current: boolean; today?: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, today: d === today.getDate() && month === today.getMonth() && year === today.getFullYear() });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, current: false });

  // Week days
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  // Navigation
  const prev = () => {
    setSelectedDay(null);
    if (viewMode === 'week') {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - 7);
      setWeekStart(d);
      setMonth(d.getMonth());
      setYear(d.getFullYear());
    } else {
      if (month === 0) { setYear(year - 1); setMonth(11); }
      else setMonth(month - 1);
    }
  };
  const next = () => {
    setSelectedDay(null);
    if (viewMode === 'week') {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 7);
      setWeekStart(d);
      setMonth(d.getMonth());
      setYear(d.getFullYear());
    } else {
      if (month === 11) { setYear(year + 1); setMonth(0); }
      else setMonth(month + 1);
    }
  };
  const goToday = () => {
    setSelectedDay(null);
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setWeekStart(getWeekStart(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  const getEvents = (day: number, isCurrent: boolean) => {
    if (!isCurrent) return [];
    return filteredEvents.filter(e => e.day === day);
  };

  // Week events for a given date
  const getWeekDayEvents = (date: Date) => {
    return filteredEvents.filter(e => {
      if (e.rawStart) {
        return e.rawStart.getFullYear() === date.getFullYear() &&
               e.rawStart.getMonth() === date.getMonth() &&
               e.rawStart.getDate() === date.getDate();
      }
      return date.getMonth() === month && e.day === date.getDate();
    });
  };

  // Today's agenda — events on today's date
  const todayAgenda = useMemo(() => {
    return filteredEvents.filter(e => {
      if (e.rawStart) {
        return e.rawStart.getFullYear() === today.getFullYear() &&
               e.rawStart.getMonth() === today.getMonth() &&
               e.rawStart.getDate() === today.getDate();
      }
      return month === today.getMonth() && year === today.getFullYear() && e.day === today.getDate();
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [filteredEvents, today, month, year]);

  // Upcoming events (next 3 future events, excluding today)
  const upcoming = useMemo(() => {
    return filteredEvents
      .filter(e => {
        if (e.rawStart) {
          const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return e.rawStart.getTime() > t.getTime() + 86400000 - 1;
        }
        return !e.past && e.day > today.getDate();
      })
      .sort((a, b) => (a.day - b.day))
      .slice(0, 3);
  }, [filteredEvents, today]);

  const toggleFilter = (key: string) => {
    setTypeFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Mini calendar click → jump to that week
  const handleMiniDayClick = (d: Date) => {
    setWeekStart(getWeekStart(d.getFullYear(), d.getMonth(), d.getDate()));
    setViewMode('week');
    setMonth(d.getMonth());
    setYear(d.getFullYear());
  };

  // Mini calendar cells
  const miniCells = useMemo(() => {
    const dim = getDaysInMonth(year, month);
    const fd = getFirstDayOfMonth(year, month);
    const pdim = getDaysInMonth(year, month - 1);
    const arr: { date: Date; current: boolean }[] = [];
    for (let i = fd - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, pdim - i);
      arr.push({ date: d, current: false });
    }
    for (let d = 1; d <= dim; d++) {
      arr.push({ date: new Date(year, month, d), current: true });
    }
    const rem = 42 - arr.length;
    for (let d = 1; d <= rem; d++) {
      arr.push({ date: new Date(year, month + 1, d), current: false });
    }
    return arr;
  }, [year, month]);

  // Check if a date is in the current viewed week
  const isInWeek = (d: Date) => {
    const ws = weekStart.getTime();
    const we = ws + 7 * 86400000;
    return d.getTime() >= ws && d.getTime() < we;
  };

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

  // Title for week view
  const weekTitle = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    if (weekStart.getMonth() === end.getMonth()) {
      return t('calendar.weekRangeSameMonth', { month: months[weekStart.getMonth()], startDay: weekStart.getDate(), endDay: end.getDate(), year: weekStart.getFullYear() });
    }
    return t('calendar.weekRangeCrossMonth', { startMonth: monthsShort[weekStart.getMonth()], startDay: weekStart.getDate(), endMonth: monthsShort[end.getMonth()], endDay: end.getDate(), year: end.getFullYear() });
  }, [weekStart, months, monthsShort, t]);

  // Now indicator position
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const hourHeight = 60; // px per hour slot

  return (
    <Page>
      <CalLayout>
        {/* ── Main Calendar Area ── */}
        <MainArea>
          <SpiralCalCard>
            <CalHeader>
              <CalTitle>{viewMode === 'month' ? t('calendar.monthYearTitle', { month: months[month], year }) : weekTitle}</CalTitle>
              <CalNav>
                <PillWrap>
                  <PillBtn $active={viewMode === 'month'} onClick={() => setViewMode('month')}>{t('calendar.monthView')}</PillBtn>
                  <PillBtn $active={viewMode === 'week'} onClick={() => setViewMode('week')}>{t('calendar.weekView')}</PillBtn>
                </PillWrap>
                <CalBtn $disabled={isCurrentMonth && viewMode === 'month' && selectedDay === null} onClick={goToday}>{t('calendar.today')}</CalBtn>
                <CalBtn onClick={prev}>&lt;</CalBtn>
                <CalBtn onClick={next}>&gt;</CalBtn>
              </CalNav>
            </CalHeader>

            {viewMode === 'month' ? (
              /* ── Month View ── */
              <CalGrid>
                {[t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')].map(d => (
                  <CalDayHeader key={d}>{d}</CalDayHeader>
                ))}
                {cells.map((cell, i) => {
                  const events = getEvents(cell.day, cell.current);
                  return (
                    <CalCell
                      key={i}
                      $today={cell.today}
                      $other={!cell.current}
                      $selected={cell.current && cell.day === selectedDay}
                      onClick={() => cell.current && setSelectedDay(cell.day === selectedDay ? null : cell.day)}
                    >
                      <CellDay $today={cell.today}>{cell.day}</CellDay>
                      {events.map((ev, j) => (
                        ev.type === 'block'
                          ? <EventBlock key={j} $color={ev.color} $past={ev.past}>{ev.title}</EventBlock>
                          : <EventDot key={j} $past={ev.past}>{ev.time} {ev.title}</EventDot>
                      ))}
                    </CalCell>
                  );
                })}
              </CalGrid>
            ) : (
              /* ── Week View ── */
              <WeekGrid>
                {/* Header row */}
                <TimeCorner />
                {weekDays.map((d, i) => (
                  <WeekDayHeader key={i} $today={isToday(d)}>
                    <WeekDayNum $today={isToday(d)}>{d.getDate()}</WeekDayNum>
                    <WeekDayName>{dayNames[d.getDay()]}</WeekDayName>
                  </WeekDayHeader>
                ))}

                {/* Time rows */}
                {HOURS.map(h => (
                  <React.Fragment key={h}>
                    <TimeLabel>{String(h).padStart(2, '0')}:00</TimeLabel>
                    {weekDays.map((d, di) => {
                      const cellEvents = getWeekDayEvents(d).filter(
                        ev => ev.startHour !== undefined && ev.startHour >= h && ev.startHour < h + 1
                      );
                      const isTodayCol = isToday(d);
                      const showNow = isTodayCol && nowMinutes >= h * 60 && nowMinutes < (h + 1) * 60;
                      const nowOffset = showNow ? ((nowMinutes - h * 60) / 60) * hourHeight : 0;

                      return (
                        <WeekCell key={di} $today={isTodayCol}>
                          {showNow && <NowLine style={{ top: `${nowOffset}px` }} />}
                          {cellEvents.map((ev, ei) => {
                            const startOffset = ((ev.startMin || 0) / 60) * hourHeight;
                            const duration = ev.endHour !== undefined && ev.endMin !== undefined
                              ? ((ev.endHour * 60 + ev.endMin) - ((ev.startHour || 0) * 60 + (ev.startMin || 0))) / 60 * hourHeight
                              : hourHeight;
                            const evId = `${d.getDate()}-${ei}-${ev.title}`;
                            const isExpanded = expandedEvent === evId;
                            return (
                              <WeekEventCard
                                key={ei}
                                $type={ev.eventType}

                                $top={startOffset}
                                $height={duration}
                                onClick={() => setExpandedEvent(isExpanded ? null : evId)}
                              >
                                <WeekEvTitle>{ev.title}</WeekEvTitle>
                                <WeekEvTime>
                                  {ev.time || t('calendar.allDay')}
                                  {ev.endHour !== undefined ? ` – ${ev.endHour > 12 ? ev.endHour - 12 : ev.endHour || 12}:${String(ev.endMin || 0).padStart(2, '0')}${(ev.endHour || 0) >= 12 ? 'pm' : 'am'}` : ''}
                                </WeekEvTime>
                                {isExpanded && duration > 40 && (
                                  <WeekEvActions>
                                    <WeekEvBtn $type={ev.eventType}>{t('calendar.detail')}</WeekEvBtn>
                                    <WeekEvBtn $type={ev.eventType}>{t('calendar.participant')}</WeekEvBtn>
                                  </WeekEvActions>
                                )}
                              </WeekEventCard>
                            );
                          })}
                        </WeekCell>
                      );
                    })}
                  </React.Fragment>
                ))}
              </WeekGrid>
            )}
          </SpiralCalCard>

        </MainArea>

        {/* 右側議程 panel — 選咗日期顯示該日 schedule，否則顯示今日議程 */}
        {viewMode === 'month' && (() => {
          const showingSelected = selectedDay !== null;
          const isSelectedToday = showingSelected && selectedDay === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const panelEvents = showingSelected
            ? filteredEvents.filter(e => e.day === selectedDay).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
            : todayAgenda;
          const panelTitle = showingSelected
            ? t('calendar.dayScheduleTitle', { month: monthsShort[month], day: selectedDay })
            : t('calendar.todayAgenda');
          const panelDate = showingSelected
            ? `${month + 1}/${selectedDay}（${dayNames[new Date(year, month, selectedDay).getDay()]})`
            : `${today.getMonth() + 1}/${today.getDate()}（${dayNames[today.getDay()]})`;
          const emptyText = showingSelected ? t('calendar.noDayEvents') : t('calendar.noItemsToday');

          return (
            <AgendaPanel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{panelTitle}</span>
                <AgendaDate>{panelDate}</AgendaDate>
                {showingSelected && !isSelectedToday && (
                  <DayDetailClose onClick={() => setSelectedDay(null)} style={{ marginLeft: 'auto' }}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                      <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </DayDetailClose>
                )}
              </div>
              {panelEvents.length > 0 ? (
                <DayEventList>
                  {panelEvents.map((ev, i) => (
                    <DayEventItem key={i} $eventType={ev.eventType} $past={ev.past}>
                      <DayEventTime>{ev.time || t('calendar.allDay')}</DayEventTime>
                      <DayEventTitle>{ev.title}</DayEventTitle>
                    </DayEventItem>
                  ))}
                </DayEventList>
              ) : (
                <DayEmptyText>{emptyText}</DayEmptyText>
              )}
            </AgendaPanel>
          );
        })()}
      </CalLayout>

      {/* Footer */}
      <FooterWrap>
        <span>{t('footer.copyrightHermes', { year: 2026 })}</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="#">{t('footer.documentation')}</a>
          <a href="#">{t('footer.support')}</a>
          <a href="#">{t('footer.faqs')}</a>
        </div>
      </FooterWrap>
    </Page>
  );
};

export default Calendar;
