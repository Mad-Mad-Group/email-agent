import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';
import { glassPill, glassTrack } from '../../styles/liquidGlass';

/**
 * Date range filter with two modes: an explicit from/to pair, and a
 * year + quarter picker that resolves to the same pair.
 *
 * Kept collapsed by default — the list toolbars it lives in are already crowded
 * (tabs, sub-pills, search, action buttons), so it shows as a single trigger
 * summarising the active range and only expands on click.
 *
 * Emits `YYYY-MM-DD` strings because that is what the API accepts; both
 * endpoints treat the range as inclusive of `to`.
 */

export interface DateRange {
  from?: string;
  to?: string;
}

type Mode = 'date' | 'quarter';

const Wrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const Trigger = styled.button<{ $active?: boolean }>`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 0.8125rem; font-weight: 500;
  font-family: ${({ theme }) => theme.fonts.primary};
  cursor: pointer;
  white-space: nowrap;
  ${glassPill}
  /* An active filter is easy to forget about, so make it obvious */
  border-color: ${({ $active, theme }) => $active ? theme.colors.accent : undefined};
  color: ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.textSecondary};
  svg { width: 14px; height: 14px; flex-shrink: 0; }
`;

const ClearX = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  width: 15px; height: 15px; border-radius: 50%;
  margin-left: 2px;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  font-size: 0.625rem; line-height: 1;
  &:hover { opacity: 0.8; }
`;

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 40;
  min-width: 280px;
  padding: 12px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 8px 28px rgba(0,0,0,0.12);
  ${media.mobile} {
    left: auto; right: 0;
    min-width: min(280px, calc(100vw - 40px));
  }
`;

const ModeRow = styled.div`
  display: inline-flex; gap: 2px; padding: 3px; margin-bottom: 12px;
  border-radius: 999px;
  ${glassTrack}
`;

const ModeBtn = styled.button<{ $active: boolean }>`
  padding: 5px 14px;
  border: none; border-radius: 999px;
  font-size: 0.75rem; font-weight: 600;
  font-family: ${({ theme }) => theme.fonts.primary};
  cursor: pointer;
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textSecondary};
  ${({ $active }) => $active && glassPill}
`;

const FieldRow = styled.div`
  display: flex; align-items: center; gap: 8px;
`;

const DateInput = styled.input`
  flex: 1; min-width: 0;
  padding: 7px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.8125rem;
  font-family: ${({ theme }) => theme.fonts.primary};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
`;

const Arrow = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-size: 0.8125rem;
`;

const YearRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
`;

const YearNav = styled.button`
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
`;

const YearLabel = styled.span`
  font-size: 0.875rem; font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const QuarterGrid = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
`;

const QuarterBtn = styled.button<{ $active: boolean }>`
  padding: 9px 0;
  border-radius: 10px;
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.border};
  background: ${({ $active, theme }) => $active ? `${theme.colors.accent}14` : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.textSecondary};
  font-size: 0.8125rem; font-weight: 600;
  font-family: ${({ theme }) => theme.fonts.primary};
  cursor: pointer;
  &:hover { border-color: ${({ theme }) => theme.colors.accent}; }
`;

const PanelFooter = styled.div`
  display: flex; justify-content: flex-end; gap: 8px;
  margin-top: 12px;
`;

const TextBtn = styled.button`
  padding: 6px 12px;
  background: transparent; border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.75rem; font-family: ${({ theme }) => theme.fonts.primary};
  cursor: pointer;
  &:hover { color: ${({ theme }) => theme.colors.textPrimary}; }
`;

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" />
    <line x1="8" y1="2" x2="8" y2="5" /><line x1="16" y1="2" x2="16" y2="5" />
  </svg>
);

const pad = (n: number) => String(n).padStart(2, '0');

/** Inclusive first/last day of a quarter, as YYYY-MM-DD */
export function quarterRange(year: number, q: number): DateRange {
  const startMonth = (q - 1) * 3;
  const from = `${year}-${pad(startMonth + 1)}-01`;
  const endDay = new Date(Date.UTC(year, startMonth + 3, 0)).getUTCDate();
  return { from, to: `${year}-${pad(startMonth + 3)}-${pad(endDay)}` };
}

/** Which quarter a YYYY-MM-DD lands in, if the range is exactly one quarter */
function detectQuarter(range: DateRange): { year: number; q: number } | null {
  if (!range.from || !range.to) return null;
  const y = Number(range.from.slice(0, 4));
  const m = Number(range.from.slice(5, 7));
  if ((m - 1) % 3 !== 0) return null;
  const q = Math.floor((m - 1) / 3) + 1;
  const expected = quarterRange(y, q);
  return expected.from === range.from && expected.to === range.to ? { year: y, q } : null;
}

interface Props {
  value: DateRange;
  onChange: (v: DateRange) => void;
  /** Defaults to the current year when the range is empty */
  defaultYear?: number;
}

export const DateRangeFilter: React.FC<Props> = ({ value, onChange, defaultYear }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const detected = detectQuarter(value);
  const [mode, setMode] = useState<Mode>(detected ? 'quarter' : 'date');
  const [year, setYear] = useState(detected?.year ?? defaultYear ?? new Date().getFullYear());
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Click-away and Esc, so the panel behaves like a normal popover */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasValue = !!(value.from || value.to);

  const summary = (() => {
    if (!hasValue) return t('filters.dateRange', '时间');
    if (detected) return `${detected.year} Q${detected.q}`;
    const short = (d?: string) => d ? d.slice(5).replace('-', '/') : '';
    if (value.from && value.to) return `${short(value.from)}–${short(value.to)}`;
    if (value.from) return `≥ ${short(value.from)}`;
    return `≤ ${short(value.to)}`;
  })();

  return (
    <Wrap ref={wrapRef}>
      <Trigger
        $active={hasValue}
        onClick={() => setOpen(o => !o)}
        title={t('filters.dateRange', '时间')}
      >
        <IconCalendar />
        {summary}
        {hasValue && (
          <ClearX
            role="button"
            aria-label={t('filters.clear', '清除')}
            onClick={(e) => { e.stopPropagation(); onChange({}); setOpen(false); }}
          >
            ×
          </ClearX>
        )}
      </Trigger>

      {open && (
        <Panel>
          <ModeRow>
            <ModeBtn $active={mode === 'date'} onClick={() => setMode('date')}>
              {t('filters.modeDate', '日期')}
            </ModeBtn>
            <ModeBtn $active={mode === 'quarter'} onClick={() => setMode('quarter')}>
              {t('filters.modeQuarter', '季度')}
            </ModeBtn>
          </ModeRow>

          {mode === 'date' ? (
            <FieldRow>
              <DateInput
                type="date"
                value={value.from ?? ''}
                max={value.to || undefined}
                onChange={e => onChange({ ...value, from: e.target.value || undefined })}
              />
              <Arrow>→</Arrow>
              <DateInput
                type="date"
                value={value.to ?? ''}
                min={value.from || undefined}
                onChange={e => onChange({ ...value, to: e.target.value || undefined })}
              />
            </FieldRow>
          ) : (
            <>
              <YearRow>
                <YearNav onClick={() => setYear(y => y - 1)} aria-label="previous year">‹</YearNav>
                <YearLabel>{year}</YearLabel>
                <YearNav onClick={() => setYear(y => y + 1)} aria-label="next year">›</YearNav>
              </YearRow>
              <QuarterGrid>
                {[1, 2, 3, 4].map(q => (
                  <QuarterBtn
                    key={q}
                    $active={detected?.year === year && detected?.q === q}
                    onClick={() => onChange(quarterRange(year, q))}
                  >
                    Q{q}
                  </QuarterBtn>
                ))}
              </QuarterGrid>
            </>
          )}

          <PanelFooter>
            {hasValue && (
              <TextBtn onClick={() => onChange({})}>{t('filters.clear', '清除')}</TextBtn>
            )}
            <TextBtn onClick={() => setOpen(false)}>{t('filters.done', '完成')}</TextBtn>
          </PanelFooter>
        </Panel>
      )}
    </Wrap>
  );
};

export default DateRangeFilter;
