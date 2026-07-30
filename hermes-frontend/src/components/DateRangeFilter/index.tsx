import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';
import { glassPill } from '../../styles/liquidGlass';

/**
 * Date range filter — explicit from/to pair.
 *
 * Kept collapsed by default — the list toolbars it lives in are already crowded
 * (tabs, sub-pills, search, action buttons), so it shows as a single trigger
 * summarising the active range and only expands on click.
 *
 * Emits `YYYY-MM-DD` strings because that is what the API accepts; both
 * endpoints treat the range as inclusive of `to`.
 *
 * 注意：本 project 有一條 build-time 內容規則禁止某類週期性時段字眼，
 * 由 scripts/ 內嘅檢查腳本喺 npm run build 開頭強制執行（違反會直接 build fail）。
 * 所以呢個 component 只提供 from/to 日期；唔好再加返年份 + 三個月一組嘅選擇器。
 */

export interface DateRange {
  from?: string;
  to?: string;
}

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

interface Props {
  value: DateRange;
  onChange: (v: DateRange) => void;
}

export const DateRangeFilter: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
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
