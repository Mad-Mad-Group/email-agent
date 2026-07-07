import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';
import client from '../../api/client';

/* ══════════════════════════════════════
   LUNO Calendar Page — 1:1 replica
   ══════════════════════════════════════ */

const Page = styled.div`display: flex; flex-direction: column; gap: 16px;`;

const Breadcrumb = styled.ol`
  list-style: none; margin: 0; padding: 0; display: flex; gap: 8px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before { content: '/'; margin-right: 8px; }
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; }
`;

const ToolbarRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
`;

const PageTitle = styled.h1`
  font-size: 1.15rem; font-weight: 600; margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PageSub = styled.small`
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

const StatsRow = styled.div`
  display: flex; gap: 24px;
  ${media.mobile} {
    flex-wrap: wrap;
    gap: 12px;
  }
`;
const StatItem = styled.div``;
const StatValue = styled.div`font-size: 1rem; font-weight: 600;`;
const StatChange = styled.small<{ $up: boolean }>`
  font-size: 0.75rem; margin-left: 4px;
  color: ${({ $up, theme }) => $up ? theme.colors.green : theme.colors.red};
`;
const StatLabel = styled.div`font-size: 0.6875rem; text-transform: uppercase; color: ${({ theme }) => theme.colors.textTertiary};`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 10px;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

/* ── Calendar Styles ── */

const CalendarWrap = styled(Card)`
  padding: 16px;
  ${media.mobile} {
    padding: 8px;
    overflow-x: auto;
  }
`;

const CalHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  ${media.mobile} {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
`;

const CalTitle = styled.h2`font-size: 1.1rem; font-weight: 600; margin: 0;`;

const CalNav = styled.div`display: flex; gap: 4px; align-items: center;`;
const CalBtn = styled.button<{ $primary?: boolean; $disabled?: boolean }>`
  padding: 6px 14px; border-radius: 6px; border: none; font-size: 0.8125rem; cursor: pointer;
  background: ${({ $primary }) => $primary ? 'var(--primary, #c78787)' : '#f0f3f5'};
  color: ${({ $primary, $disabled }) => $disabled ? '#aaa' : $primary ? '#fff' : '#0f172a'};
  opacity: ${({ $disabled }) => $disabled ? 0.6 : 1};
  &:hover { opacity: 0.85; }
`;

const CalGrid = styled.div`
  display: grid; grid-template-columns: repeat(7, 1fr);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
`;

const CalDayHeader = styled.div`
  padding: 8px 4px; text-align: center; font-size: 0.6875rem; font-weight: 600;
  text-transform: uppercase; color: ${({ theme }) => theme.colors.textTertiary};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CalCell = styled.div<{ $today?: boolean; $other?: boolean; $selected?: boolean }>`
  min-height: 90px; padding: 4px 6px; font-size: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $today, $selected, theme }) => $selected ? '#e0eef9' : $today ? '#fffde7' : theme.colors.surface};
  color: ${({ $other, theme }) => $other ? theme.colors.textTertiary : theme.colors.textPrimary};
  cursor: pointer;
  transition: background 0.12s;
  &:hover { background: ${({ $selected }) => $selected ? '#d0e4f5' : '#f0f7ff'}; }
  &:nth-child(7n) { border-right: none; }
  ${media.mobile} {
    min-height: 60px;
    font-size: 0.65rem;
  }
  ${media.tablet} {
    min-height: 70px;
  }
`;

const CellDay = styled.div<{ $today?: boolean }>`
  font-weight: ${({ $today }) => $today ? 700 : 400};
  margin-bottom: 2px;
  ${({ $today }) => $today && `
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--primary, #c78787); color: #fff;
  `}
`;

const EventBlock = styled.div<{ $color?: string }>`
  padding: 2px 6px; margin: 1px 0; border-radius: 3px; font-size: 0.65rem;
  background: ${({ $color }) => $color || '#567ebb'};
  color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  cursor: pointer;
  ${media.mobile} {
    font-size: 0.55rem;
  }
`;

const EventDot = styled.div`
  display: flex; align-items: center; gap: 4px; font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.textSecondary}; padding: 1px 0;
  &::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: ${({ theme }) => theme.colors.blue}; flex-shrink: 0;
  }
  ${media.mobile} {
    font-size: 0.55rem;
  }
`;

/* ── Day Detail Panel ── */

const DayDetailWrap = styled(Card)`
  padding: 20px 24px;
`;

const DayDetailHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
`;

const DayDetailTitle = styled.h3`
  margin: 0; font-size: 1rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const DayDetailClose = styled.button`
  background: none; border: none; font-size: 1.2rem; cursor: pointer;
  color: ${({ theme }) => theme.colors.textTertiary};
  &:hover { color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const DayEventList = styled.div`
  display: flex; flex-direction: column; gap: 10px;
`;

const DayEventItem = styled.div<{ $color?: string }>`
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 16px; border-radius: 8px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border-left: 4px solid ${({ $color }) => $color || '#567ebb'};
  transition: transform 0.1s;
  &:hover { transform: translateX(2px); }
`;

const DayEventTime = styled.span`
  font-size: 0.8125rem; font-weight: 600; color: ${({ theme }) => theme.colors.textSecondary};
  min-width: 50px; flex-shrink: 0;
`;

const DayEventTitle = styled.span`
  font-size: 0.875rem; font-weight: 500; color: ${({ theme }) => theme.colors.textPrimary};
`;

const DayEmptyText = styled.div`
  text-align: center; padding: 24px 0;
  font-size: 0.875rem; color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Data ── */

interface CalEvent {
  day: number;
  title: string;
  time?: string;
  type: 'block' | 'dot';
  color?: string;
  span?: number;
}

const FALLBACK_EVENTS: CalEvent[] = [
  { day: 1, title: 'All Day Event', type: 'block', color: '#567ebb' },
  { day: 7, title: 'Long Event', type: 'block', color: '#567ebb', span: 3 },
  { day: 9, title: 'Repeating Event', time: '4p', type: 'dot' },
  { day: 16, title: 'Repeating Event', time: '4p', type: 'dot' },
  { day: 23, title: 'Conference', type: 'block', color: '#567ebb', span: 2 },
  { day: 24, title: 'Meeting', time: '10:30a', type: 'dot' },
  { day: 24, title: 'Lunch', time: '12p', type: 'dot' },
  { day: 25, title: 'Birthday Party', time: '7a', type: 'dot' },
  { day: 28, title: 'Click for Google', type: 'block', color: '#567ebb' },
];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/** 將 API event 轉成 CalEvent */
function apiToCalEvents(apiEvents: any[]): CalEvent[] {
  return apiEvents.map((e) => {
    const d = new Date(e.start);
    const day = d.getDate();
    const h = d.getHours();
    const m = d.getMinutes();
    const time = e.all_day ? undefined : `${h > 12 ? h - 12 : h || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h >= 12 ? 'p' : 'a'}`;
    return {
      day,
      title: e.title || 'Event',
      time,
      type: e.all_day ? 'block' as const : 'dot' as const,
      color: e.color || '#567ebb',
    };
  });
}

const Calendar: React.FC = () => {
  const { t } = useTranslation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [apiEvents, setApiEvents] = useState<CalEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Fetch calendar events from API
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

  const EVENTS = apiEvents.length > 0 ? apiEvents : FALLBACK_EVENTS;

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const cells: { day: number; current: boolean; today?: boolean }[] = [];

  // Previous month fill
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, current: false });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      current: true,
      today: d === today.getDate() && month === today.getMonth() && year === today.getFullYear(),
    });
  }
  // Next month fill
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false });
  }

  const prev = () => {
    setSelectedDay(null);
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const next = () => {
    setSelectedDay(null);
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };
  const goToday = () => { setSelectedDay(null); setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  const getEvents = (day: number, isCurrent: boolean) => {
    if (!isCurrent) return [];
    return EVENTS.filter(e => e.day === day);
  };

  return (
    <Page>
      {/* Calendar */}
      <CalendarWrap>
        <CalHeader>
          <CalTitle>{MONTHS[month]} {year}</CalTitle>
          <CalNav>
            <CalBtn $disabled={isCurrentMonth} onClick={goToday}>{t('calendar.today')}</CalBtn>
            <CalBtn onClick={prev}>&lt;</CalBtn>
            <CalBtn onClick={next}>&gt;</CalBtn>
          </CalNav>
        </CalHeader>

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
                    ? <EventBlock key={j} $color={ev.color}>{ev.title}</EventBlock>
                    : <EventDot key={j}>{ev.time} {ev.title}</EventDot>
                ))}
              </CalCell>
            );
          })}
        </CalGrid>
      </CalendarWrap>

      {/* Day Detail */}
      {selectedDay !== null && (() => {
        const dayEvents = EVENTS.filter(e => e.day === selectedDay);
        return (
          <DayDetailWrap>
            <DayDetailHeader>
              <DayDetailTitle>{MONTHS[month]} {selectedDay}, {year} 日程</DayDetailTitle>
              <DayDetailClose onClick={() => setSelectedDay(null)}>&times;</DayDetailClose>
            </DayDetailHeader>
            {dayEvents.length > 0 ? (
              <DayEventList>
                {dayEvents.map((ev, i) => (
                  <DayEventItem key={i} $color={ev.color}>
                    <DayEventTime>{ev.time || '全日'}</DayEventTime>
                    <DayEventTitle>{ev.title}</DayEventTitle>
                  </DayEventItem>
                ))}
              </DayEventList>
            ) : (
              <DayEmptyText>當日冇日程</DayEmptyText>
            )}
          </DayDetailWrap>
        );
      })()}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', fontSize: '0.75rem', color: '#94a3b8' }}>
        <span>{t('footer.copyrightHermes', { year: 2024 })}</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('footer.documentation')}</a>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('footer.support')}</a>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('footer.faqs')}</a>
        </div>
      </div>
    </Page>
  );
};

export default Calendar;
