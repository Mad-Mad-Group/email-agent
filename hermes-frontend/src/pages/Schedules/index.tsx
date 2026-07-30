import React, { useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';
import {
  usePipelineSchedules,
  useCreatePipelineSchedule,
  useDeletePipelineSchedule,
  useTogglePipelineSchedule,
  useTriggerPipelineSchedule,
  useCampaign,
} from '../../api/hooks';
import { PipelineScheduleItem, CampaignItem } from '../../api/services';


/* ── Cron helpers ────────────────────────────────────────────────
   後端收嘅係標準 5 欄位 cron（分 時 日 月 星期），見
   cms/server/src/pipeline-schedules/pipeline-schedules.service.ts#getNextRun。
   UI 唔會叫用戶自己砌，改為用結構化選擇器拼出 cron；
   raw cron 只留喺 Advanced 模式俾 power user。
   ─────────────────────────────────────────────────────────────── */

type CronMode = 'daily' | 'weekdays' | 'weekly' | 'hourly' | 'minutely' | 'advanced';

/** 「HH:MM」→ [時, 分]，parse 唔到就當 09:00 */
const parseTime = (time: string): [number, number] => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return [9, 0];
  return [
    Math.min(23, Math.max(0, parseInt(m[1], 10))),
    Math.min(59, Math.max(0, parseInt(m[2], 10))),
  ];
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * 後端 matchField 支援嘅語法：* / *&#47;n / n / n-m / n-m&#47;s / 逗號分隔。
 * 呢個 validator 刻意同後端睇齊 —— getNextRun 解唔到時係靜靜 fallback
 * 「一小時後」，唔會報錯，所以放行錯格式等於畀用戶一個跑錯時間嘅排程。
 */
const CRON_FIELD_RANGES: [number, number][] = [
  [0, 59], [0, 23], [1, 31], [1, 12], [0, 6],
];

const isValidCronField = (expr: string, min: number, max: number): boolean => {
  if (expr === '*') return true;
  return expr.split(',').every(part => {
    if (!part) return false;
    const inRange = (n: number) => n >= min && n <= max;

    let m = /^\*\/(\d+)$/.exec(part);
    if (m) return parseInt(m[1], 10) >= 1;

    m = /^(\d+)$/.exec(part);
    if (m) return inRange(parseInt(m[1], 10));

    m = /^(\d+)-(\d+)$/.exec(part);
    if (m) {
      const lo = parseInt(m[1], 10), hi = parseInt(m[2], 10);
      return inRange(lo) && inRange(hi) && lo <= hi;
    }

    m = /^(\d+)-(\d+)\/(\d+)$/.exec(part);
    if (m) {
      const lo = parseInt(m[1], 10), hi = parseInt(m[2], 10);
      return inRange(lo) && inRange(hi) && lo <= hi && parseInt(m[3], 10) >= 1;
    }

    return false;
  });
};

const isValidCron = (cron: string): boolean => {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p, i) => isValidCronField(p, CRON_FIELD_RANGES[i][0], CRON_FIELD_RANGES[i][1]));
};

/** 把 cron 反向講返人話；認唔出就原樣顯示 */
const describeCron = (cron: string, t: (k: string, o?: any) => string): string => {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, dom, mon, dow] = parts;
  if (dom !== '*' || mon !== '*') return cron;

  const everyMin = /^\*\/(\d+)$/.exec(min);
  if (everyMin && hour === '*' && dow === '*') {
    return t('settings.schedDescEveryMinutes', { n: everyMin[1] });
  }

  const everyHour = /^\*\/(\d+)$/.exec(hour);
  if (everyHour && /^\d+$/.test(min) && dow === '*') {
    return t('settings.schedDescEveryHours', { n: everyHour[1] });
  }

  if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const time = `${pad2(parseInt(hour, 10))}:${pad2(parseInt(min, 10))}`;
    if (dow === '*') return t('settings.schedDescDaily', { time });
    if (dow === '1-5') return t('settings.schedDescWeekdays', { time });
    if (/^[0-6]$/.test(dow)) {
      return t('settings.schedDescWeekly', { day: t(`settings.schedDow${dow}`), time });
    }
  }

  return cron;
};

/* ── Layout ── */

const Page = styled.div`
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.lg}px;
  animation: fadeSlideUp 0.5s var(--ease-out) both;
`;

/* No surface of its own — content sits straight on the page background, same as
   the PageCard in Leads and VerifiedEmails. */
const PageCard = styled.div`
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 28px;
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.lg}px;
  min-width: 0;
  ${media.tablet} { padding: 24px 18px; }
  ${media.mobile} { padding: 16px 12px; }
`;

const HeroBody = styled.div`
  display: flex; align-items: center; gap: 20px;
  ${media.mobile} { flex-direction: column; text-align: center; }
`;

const HeroAvatar = styled.div`
  width: 64px; height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
`;

const HeroInfo = styled.div`flex: 1;`;

const HeroName = styled.h2`
  margin: 0; font-size: clamp(1.25rem, 2.2vw, 1.5rem); font-weight: 700;
  background: ${({ theme }) => theme.gradients.brand};
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  ${({ theme }) => theme.mode === 'dark' && `
    background: linear-gradient(135deg, #E0ACD2, #ACC0DE);
    -webkit-background-clip: text; background-clip: text;
  `}
`;

const HeroSub = styled.div`
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 2px;
`;

/* ── Form ── */

/* display:block matters: as an inline label it sat on the same line as a Select
   (auto width) but got pushed above an Input (width:100%), so the form's rows
   didn't line up with each other. */
const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 0.8125rem; font-weight: 500;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  width: 100%; box-sizing: border-box;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.875rem; outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
`;

const Select = styled.select`
  /* Was auto-width, so selects were visibly narrower than the inputs above them */
  width: 100%; box-sizing: border-box;
  padding: 10px 34px 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.875rem; outline: none; cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: border-color 0.15s;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
  option { font-size: 0.9375rem; padding: 8px 12px; }
`;

/* ── Form panel ──
   No background or border of its own: PageCard already provides the surface, and
   a second filled+bordered box inside it read as two stacked panels. A rule and
   some breathing room separate it instead. */
const FormPanel = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: ${({ theme }) => theme.spacing.lg}px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 18px;
  ${media.mobile} { grid-template-columns: minmax(0, 1fr); gap: 12px; }
`;

/* Full-bleed field — for the name, which deserves the whole row */
const FieldWide = styled.div`
  grid-column: 1 / -1;
`;

/* 一行控件（頻率下拉 + 星期 / 時間 / 間隔） */
const ControlRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
`;

const FormHint = styled.div<{ $error?: boolean }>`
  font-size: 0.75rem;
  margin-top: 6px;
  color: ${({ theme, $error }) => ($error ? theme.colors.danger : theme.colors.textTertiary)};
`;

/* cron 係代碼，等寬字體先睇得清 `0 9 * * 1-5` 嘅欄位邊界 */
const CronInput = styled(Input)`
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.04em;
`;

/* ── 執行狀態 pill ── */

const StatusPill = styled.span<{ $color: string }>`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.6875rem; font-weight: 700;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => $color}1A;
  white-space: nowrap;
`;

const Spinner = styled.span`
  width: 9px; height: 9px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: schedSpin 0.7s linear infinite;
  @keyframes schedSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const ProgressTrack = styled.div`
  height: 4px; border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percent: number; $color: string }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${({ $color }) => $color};
  transition: width 0.4s var(--ease-out);
`;

const BtnRow = styled.div`
  grid-column: 1 / -1;
  display: flex; gap: 10px; padding-top: 6px;
  ${media.mobile} { flex-direction: column-reverse; }
`;

const SaveBtn = styled.button`
  padding: 10px 24px;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  border: none; border-radius: 8px;
  font-size: 0.8125rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* Secondary action — replaces the inline style overrides that were stacked onto
   SaveBtn at every call site. */
const GhostBtn = styled.button`
  padding: 10px 20px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 0.8125rem; font-weight: 600;
  cursor: pointer; transition: background 0.15s, border-color 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceMuted};
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
`;

const IconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; flex-shrink: 0;
  border-radius: 8px;
  background: transparent;
  color: ${({ $danger, theme }) => $danger ? theme.colors.danger : theme.colors.accent};
  border: 1px solid ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.accent)}40;
  cursor: pointer; transition: background 0.15s, border-color 0.15s;
  &:hover {
    background: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.accent)}14;
    border-color: ${({ $danger, theme }) => $danger ? theme.colors.danger : theme.colors.accent};
  }
`;

const EmptyState = styled.div`
  padding: 36px 20px;
  text-align: center;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Schedule list ── */

const ScheduleList = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const RowMain = styled.div`
  display: flex; align-items: center; gap: 12px;
`;

const RowTitle = styled.div`
  font-weight: 600; font-size: 0.9375rem;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const RowMeta = styled.div`
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
  margin-top: 2px;
  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.7rem;
    padding: 1px 5px; border-radius: 4px;
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
`;

const RowFooter = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px 16px;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
  padding-left: 56px;
  ${media.mobile} { padding-left: 0; }
`;

const RowError = styled.span`
  color: ${({ theme }) => theme.colors.danger};
`;

/* ── Toggle Switch ── */

const ToggleTrack = styled.label<{ $on: boolean }>`
  position: relative; display: inline-block;
  width: 44px; height: 24px; border-radius: 12px; cursor: pointer;
  background: ${({ $on, theme }) => $on ? theme.strong.olive : theme.colors.border};
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.08);
  transition: background 0.3s;
`;

const ToggleKnob = styled.span<{ $on: boolean }>`
  position: absolute; top: 2px;
  left: ${({ $on }) => $on ? '22px' : '2px'};
  width: 20px; height: 20px; border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8);
  transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  &::after {
    content: ''; position: absolute;
    top: 4px; left: 5px; width: 10px; height: 10px; border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, rgba(255,255,255,0.9) 0%, transparent 70%);
  }
`;

const ToggleHidden = styled.input`position: absolute; opacity: 0; width: 0; height: 0;`;

const ToggleSwitch: React.FC<{ on: boolean; onChange?: (v: boolean) => void }> = ({ on, onChange }) => (
  <ToggleTrack $on={on}>
    <ToggleHidden type="checkbox" checked={on} onChange={(e) => onChange?.(e.target.checked)} />
    <ToggleKnob $on={on} />
  </ToggleTrack>
);

/* ── Schedule Row ── */

const ScheduleRow = styled.div`
  display: flex; flex-direction: column; gap: 8px;
  padding: 14px 12px;
  margin: 0 -12px;
  border-radius: 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  transition: background 0.15s;
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}55; }
  &:last-child { border-bottom: none; }
`;

/* ── SVG Icons ── */

const ClockIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/* ── Component ── */

/**
 * 排程執行狀態。
 *
 * 注意：schedule.last_run_status 只反映「派工」成功與否 —— search / full_pipeline
 * 嘅 HermesService.run() 開完 campaign 就即刻 return，worker 之後才真正做事。
 * 所以真正嘅「執行中 / 完成」要睇 campaign（last_run_campaign_id）。
 */
const RunStatus: React.FC<{ schedule: PipelineScheduleItem }> = ({ schedule }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: campaign } = useCampaign(schedule.last_run_campaign_id);

  if (schedule.last_run_status === 'failed') {
    return <StatusPill $color={theme.colors.danger}>{t('settings.schedStatusFailed')}</StatusPill>;
  }

  if (!schedule.last_run_at) {
    return <StatusPill $color={theme.colors.textTertiary}>{t('settings.schedStatusNeverRun')}</StatusPill>;
  }

  // 派 task 嘅類型（send_approved / reply_check / followup）冇 campaign 可追
  if (!schedule.last_run_campaign_id) {
    return <StatusPill $color={theme.colors.accent}>{t('settings.schedStatusDispatched')}</StatusPill>;
  }

  const c = campaign as CampaignItem | undefined;
  if (!c) {
    return (
      <StatusPill $color={theme.colors.accent}>
        <Spinner /> {t('settings.schedStatusStarting')}
      </StatusPill>
    );
  }

  const total = c.target_count || c.lead_ids?.length || 0;
  const done = c.done_count || 0;
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  if (c.status === 'running') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 190 }}>
        <StatusPill $color={theme.colors.accent}>
          <Spinner />
          {t('settings.schedStatusRunning')}
          {c.pipeline_stage ? ` · ${t(`settings.schedStage_${c.pipeline_stage}`, c.pipeline_stage)}` : ''}
          {total > 0 ? ` · ${done}/${total}` : ''}
        </StatusPill>
        <ProgressTrack>
          <ProgressFill $percent={percent} $color={theme.colors.accent} />
        </ProgressTrack>
      </div>
    );
  }

  if (c.status === 'failed') {
    return <StatusPill $color={theme.colors.danger}>{t('settings.schedStatusFailed')}</StatusPill>;
  }

  return (
    <StatusPill $color={theme.strong.olive}>
      {t('settings.schedStatusCompleted')}
      {total > 0 ? ` · ${done}/${total}` : ''}
    </StatusPill>
  );
};

const Schedules: React.FC = () => {
  const { t } = useTranslation();

  const { data: schedules = [], isLoading: schedulesLoading } = usePipelineSchedules();
  const createSchedule = useCreatePipelineSchedule();
  const deleteSchedule = useDeletePipelineSchedule();
  const toggleSchedule = useTogglePipelineSchedule();
  const triggerSchedule = useTriggerPipelineSchedule();

  const [showForm, setShowForm] = useState(false);
  const [schedName, setSchedName] = useState('');
  const [schedType, setSchedType] = useState<PipelineScheduleItem['type']>('search');
  const [schedKeyword, setSchedKeyword] = useState('');
  const [schedLocation, setSchedLocation] = useState('');
  const [schedTargetCount, setSchedTargetCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  /**
   * Frequency 係一個 mode，唔可以由 cron 字串反推：
   * 用戶自己打嘅 cron 有可能撞正某個 preset，靠反推就會打到一半跳模式、輸入框消失。
   */
  const [cronMode, setCronMode] = useState<CronMode>('weekdays');
  const [cronTime, setCronTime] = useState('09:00');
  const [cronDow, setCronDow] = useState(1);          // 0 = 星期日
  const [cronEveryHours, setCronEveryHours] = useState(2);
  const [cronEveryMinutes, setCronEveryMinutes] = useState(30);
  const [cronAdvanced, setCronAdvanced] = useState('0 9 * * 1-5');

  const CRON_MODES: { value: CronMode; label: string }[] = [
    { value: 'daily', label: t('settings.schedFreqDaily') },
    { value: 'weekdays', label: t('settings.schedFreqWeekdays') },
    { value: 'weekly', label: t('settings.schedFreqWeekly') },
    { value: 'hourly', label: t('settings.schedFreqHourly') },
    { value: 'minutely', label: t('settings.schedFreqMinutely') },
    { value: 'advanced', label: t('settings.schedFreqAdvanced') },
  ];

  /* 由選擇器拼出 cron —— 唯一嘅真相來源，冇獨立 cron state */
  const schedCron = (() => {
    if (cronMode === 'advanced') return cronAdvanced.trim();
    const [h, m] = parseTime(cronTime);
    switch (cronMode) {
      case 'daily':    return `${m} ${h} * * *`;
      case 'weekdays': return `${m} ${h} * * 1-5`;
      case 'weekly':   return `${m} ${h} * * ${cronDow}`;
      case 'hourly':   return `${m} */${cronEveryHours} * * *`;
      case 'minutely': return `*/${cronEveryMinutes} * * * *`;
    }
  })();

  const cronError = cronMode === 'advanced' && cronAdvanced.trim() !== '' && !isValidCron(cronAdvanced);
  const cronReady = schedCron !== '' && isValidCron(schedCron);

  const SCHEDULE_TYPES: { value: PipelineScheduleItem['type']; label: string }[] = [
    { value: 'search', label: t('settings.schedTypeSearch') },
    { value: 'send_approved', label: t('settings.schedTypeSendApproved') },
    { value: 'reply_check', label: t('settings.schedTypeReplyCheck') },
    { value: 'followup', label: t('settings.schedTypeFollowup') },
    { value: 'full_pipeline', label: t('settings.schedTypeFullPipeline') },
  ];

  const resetForm = () => {
    setSchedName(''); setSchedType('search');
    setCronMode('weekdays'); setCronTime('09:00'); setCronDow(1);
    setCronEveryHours(2); setCronEveryMinutes(30); setCronAdvanced('0 9 * * 1-5');
    setSchedKeyword(''); setSchedLocation(''); setSchedTargetCount(5);
    setSaveError('');
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!schedName.trim() || !cronReady) return;
    setSaveError('');
    setBusy(true);
    try {
      const params: Record<string, any> = {};
      if (schedType === 'search' || schedType === 'full_pipeline') {
        params.keyword = schedKeyword;
        params.location = schedLocation;
        params.targetCount = schedTargetCount;
      }
      await createSchedule.mutateAsync({ name: schedName, type: schedType, cron: schedCron, params });
      resetForm();
    } catch (err: any) {
      // 之前呢度係空 catch{}，所以請求失敗（例如 404）睇落好似「撳 Save 冇反應」
      const status = err?.response?.status;
      const detail = err?.response?.data?.message ?? err?.message;
      setSaveError(
        t('settings.schedSaveFailed') +
        (status ? ` (${status})` : '') +
        (detail ? `: ${Array.isArray(detail) ? detail.join(', ') : detail}` : ''),
      );
    }
    setBusy(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Page>
      <PageCard>
        {/* ── Hero ── */}
        <HeroBody>
          <SpriteAvatar src={AGENTS.S3.sprite} frames={AGENTS.S3.frames} frameW={AGENTS.S3.frameW} frameH={AGENTS.S3.frameH} trim={AGENTS.S3.trim} size={52} />
          <HeroInfo>
            <HeroName>{t('settings.schedulesTab')}</HeroName>
            <HeroSub>{t('settings.schedEmpty').replace(/Click.*$/, '').replace(/點擊.*$/, '').replace(/点击.*$/, '').trim() || t('settings.schedulesTab')}</HeroSub>
          </HeroInfo>
          {!showForm && (
            <SaveBtn onClick={() => setShowForm(true)} style={{ gap: 6, display: 'flex', alignItems: 'center' }}>
              <PlusIcon /> {t('settings.schedAdd')}
            </SaveBtn>
          )}
        </HeroBody>

        {/* ── New schedule form ── */}
        {showForm && (
          <FormPanel>
            <FormGrid>
              <FieldWide>
                <Label>{t('settings.schedName')}</Label>
                <Input value={schedName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedName(e.target.value)} placeholder={t('settings.schedNamePlaceholder')} />
              </FieldWide>
              <div>
                <Label>{t('settings.schedType')}</Label>
                <Select value={schedType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSchedType(e.target.value as PipelineScheduleItem['type'])}>
                  {SCHEDULE_TYPES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                </Select>
              </div>
              <FieldWide>
                <Label>{t('settings.schedCron')}</Label>
                <ControlRow>
                  <Select
                    value={cronMode}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCronMode(e.target.value as CronMode)}
                  >
                    {CRON_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </Select>

                  {cronMode === 'weekly' && (
                    <Select value={cronDow} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCronDow(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5, 6, 0].map(d => (
                        <option key={d} value={d}>{t(`settings.schedDow${d}`)}</option>
                      ))}
                    </Select>
                  )}

                  {(cronMode === 'daily' || cronMode === 'weekdays' || cronMode === 'weekly') && (
                    <Input
                      type="time"
                      value={cronTime}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCronTime(e.target.value)}
                      style={{ width: 'auto' }}
                    />
                  )}

                  {cronMode === 'hourly' && (
                    <Select value={cronEveryHours} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCronEveryHours(Number(e.target.value))}>
                      {[1, 2, 3, 4, 6, 8, 12].map(n => (
                        <option key={n} value={n}>{t('settings.schedEveryHoursOpt', { n })}</option>
                      ))}
                    </Select>
                  )}

                  {cronMode === 'minutely' && (
                    <Select value={cronEveryMinutes} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCronEveryMinutes(Number(e.target.value))}>
                      {[5, 10, 15, 20, 30].map(n => (
                        <option key={n} value={n}>{t('settings.schedEveryMinutesOpt', { n })}</option>
                      ))}
                    </Select>
                  )}
                </ControlRow>

                {cronMode === 'advanced' ? (
                  <>
                    <CronInput
                      value={cronAdvanced}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCronAdvanced(e.target.value)}
                      placeholder="0 9 * * 1-5"
                      style={{ marginTop: 8 }}
                    />
                    <FormHint $error={cronError}>
                      {cronError ? t('settings.schedCronInvalid') : t('settings.schedCronAdvancedHint')}
                    </FormHint>
                  </>
                ) : (
                  /* 用人話覆述一次拼出嚟嘅 cron，用戶唔需要識 cron 都確認得到 */
                  <FormHint>{describeCron(schedCron, t)}</FormHint>
                )}
              </FieldWide>
              {(schedType === 'search' || schedType === 'full_pipeline') && (
                <>
                  <div>
                    <Label>{t('settings.schedKeyword')}</Label>
                    <Input value={schedKeyword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedKeyword(e.target.value)} placeholder={t('settings.schedKeywordPlaceholder')} />
                  </div>
                  <div>
                    <Label>{t('settings.schedLocation')}</Label>
                    <Input value={schedLocation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedLocation(e.target.value)} placeholder={t('settings.schedLocationPlaceholder')} />
                  </div>
                  <div>
                    <Label>{t('settings.schedTargetCount')}</Label>
                    <Input type="number" min={1} max={20} value={schedTargetCount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedTargetCount(Number(e.target.value))} />
                  </div>
                </>
              )}
              {saveError && <FieldWide><FormHint $error>{saveError}</FormHint></FieldWide>}
              <BtnRow>
                <SaveBtn onClick={handleCreate} disabled={busy || !schedName.trim() || !cronReady}>
                  {busy ? '...' : t('settings.save')}
                </SaveBtn>
                <GhostBtn onClick={resetForm}>{t('settings.cancel')}</GhostBtn>
              </BtnRow>
            </FormGrid>
          </FormPanel>
        )}

        {/* ── Schedule list ── */}
        {schedulesLoading ? (
          <EmptyState>Loading…</EmptyState>
        ) : (schedules as PipelineScheduleItem[]).length === 0 ? (
          <EmptyState>{t('settings.schedEmpty')}</EmptyState>
        ) : (
          <ScheduleList>
            {(schedules as PipelineScheduleItem[]).map((s: PipelineScheduleItem) => (
              <ScheduleRow key={s._id}>
                <RowMain>
                  <ToggleSwitch on={s.enabled} onChange={() => toggleSchedule.mutate(s._id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <RowTitle>{s.name}</RowTitle>
                    <RowMeta>
                      {SCHEDULE_TYPES.find(st => st.value === s.type)?.label || s.type} &middot; {describeCron(s.cron, t)}
                    </RowMeta>
                  </div>
                  <RunStatus schedule={s} />
                  <IconBtn
                    onClick={() => triggerSchedule.mutate(s._id)}
                    disabled={triggerSchedule.isPending && triggerSchedule.variables === s._id}
                    title={t('settings.schedTriggerNow')}
                  >
                    {triggerSchedule.isPending && triggerSchedule.variables === s._id ? <Spinner /> : <PlayIcon />}
                  </IconBtn>
                  <IconBtn
                    $danger
                    title={t('settings.schedDelete', t('settings.cancel'))}
                    onClick={() => { if (confirm(t('settings.schedDeleteConfirm'))) deleteSchedule.mutate(s._id); }}
                  >
                    <TrashIcon />
                  </IconBtn>
                </RowMain>
                <RowFooter>
                  <span>{t('settings.schedLastRun')}: {formatDate(s.last_run_at)}</span>
                  <span>{t('settings.schedNextRun')}: {formatDate(s.next_run_at)}</span>
                  {s.last_run_status === 'failed' && (
                    <RowError>{t('settings.schedFailed')}: {s.last_run_error}</RowError>
                  )}
                </RowFooter>
              </ScheduleRow>
            ))}
          </ScheduleList>
        )}
      </PageCard>
    </Page>
  );
};

export default Schedules;
