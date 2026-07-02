import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';

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
  border-radius: 8px;
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
  background: ${({ $primary }) => $primary ? 'var(--primary, #c4735c)' : '#f0f3f5'};
  color: ${({ $primary, $disabled }) => $disabled ? '#aaa' : $primary ? '#fff' : '#293240'};
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

const CalCell = styled.div<{ $today?: boolean; $other?: boolean }>`
  min-height: 90px; padding: 4px 6px; font-size: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $today, theme }) => $today ? '#fffde7' : theme.colors.surface};
  color: ${({ $other, theme }) => $other ? theme.colors.textTertiary : theme.colors.textPrimary};
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
    background: var(--primary, #c4735c); color: #fff;
  `}
`;

const EventBlock = styled.div<{ $color?: string }>`
  padding: 2px 6px; margin: 1px 0; border-radius: 3px; font-size: 0.65rem;
  background: ${({ $color }) => $color || '#3788d8'};
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

/* ── Data ── */

interface CalEvent {
  day: number;
  title: string;
  time?: string;
  type: 'block' | 'dot';
  color?: string;
  span?: number;
}

const EVENTS: CalEvent[] = [
  { day: 1, title: 'All Day Event', type: 'block', color: '#3788d8' },
  { day: 7, title: 'Long Event', type: 'block', color: '#3788d8', span: 3 },
  { day: 9, title: 'Repeating Event', time: '4p', type: 'dot' },
  { day: 16, title: 'Repeating Event', time: '4p', type: 'dot' },
  { day: 23, title: 'Conference', type: 'block', color: '#3788d8', span: 2 },
  { day: 24, title: 'Meeting', time: '10:30a', type: 'dot' },
  { day: 24, title: 'Lunch', time: '12p', type: 'dot' },
  { day: 25, title: 'Birthday Party', time: '7a', type: 'dot' },
  { day: 28, title: 'Click for Google', type: 'block', color: '#3788d8' },
];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const Calendar: React.FC = () => {
  const { t } = useTranslation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

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
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const next = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  const getEvents = (day: number, isCurrent: boolean) => {
    if (!isCurrent) return [];
    return EVENTS.filter(e => e.day === day);
  };

  return (
    <Page>
      {/* Toolbar */}
      <div>
        <Breadcrumb>
          <li><a href="#">{t('common.home')}</a></li>
          <li><a href="#">{t('nav.applications')}</a></li>
          <li>{t('nav.calendar')}</li>
        </Breadcrumb>
        <ToolbarRow>
          <div>
            <PageTitle>{t('dashboard.welcomeBack', { name: 'Allie' })}</PageTitle>
            <PageSub>{t('dashboard.newMessages', { msgCount: 12, notifCount: 7 })}</PageSub>
          </div>
          <StatsRow>
            <StatItem>
              <StatValue>8.18K <StatChange $up>1.3%</StatChange></StatValue>
              <StatLabel>{t('calendar.income')}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>1.11K <StatChange $up>4.1%</StatChange></StatValue>
              <StatLabel>{t('calendar.expense')}</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>3.66K <StatChange $up={false}>7.5%</StatChange></StatValue>
              <StatLabel>{t('calendar.revenue')}</StatLabel>
            </StatItem>
          </StatsRow>
        </ToolbarRow>
      </div>

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
              <CalCell key={i} $today={cell.today} $other={!cell.current}>
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

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', fontSize: '0.75rem', color: '#969ba0' }}>
        <span>{t('footer.copyrightHermes', { year: 2024 })}</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="#" style={{ color: '#969ba0', textDecoration: 'none' }}>{t('footer.documentation')}</a>
          <a href="#" style={{ color: '#969ba0', textDecoration: 'none' }}>{t('footer.support')}</a>
          <a href="#" style={{ color: '#969ba0', textDecoration: 'none' }}>{t('footer.faqs')}</a>
        </div>
      </div>
    </Page>
  );
};

export default Calendar;
