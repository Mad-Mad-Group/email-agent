import React, { useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';
import { glassSurface } from '../../styles/glassSurface';
import {
  usePipelineSchedules,
  useCreatePipelineSchedule,
  useDeletePipelineSchedule,
  useTogglePipelineSchedule,
  useTriggerPipelineSchedule,
} from '../../api/hooks';
import { PipelineScheduleItem } from '../../api/services';

/* ── Layout ── */

const Page = styled.div`
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.lg}px;
  animation: fadeSlideUp 0.5s var(--ease-out) both;
`;

const PageCard = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  padding: 28px;
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.lg}px;
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

const Label = styled.label`
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
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: 0.875rem; outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
`;

const BtnRow = styled.div`display: flex; gap: 10px; padding-top: 4px;`;

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
  padding: 14px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
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

const Schedules: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  const { data: schedules = [], isLoading: schedulesLoading } = usePipelineSchedules();
  const createSchedule = useCreatePipelineSchedule();
  const deleteSchedule = useDeletePipelineSchedule();
  const toggleSchedule = useTogglePipelineSchedule();
  const triggerSchedule = useTriggerPipelineSchedule();

  const [showForm, setShowForm] = useState(false);
  const [schedName, setSchedName] = useState('');
  const [schedType, setSchedType] = useState<PipelineScheduleItem['type']>('search');
  const [schedCron, setSchedCron] = useState('0 9 * * 1-5');
  const [schedKeyword, setSchedKeyword] = useState('');
  const [schedLocation, setSchedLocation] = useState('');
  const [schedTargetCount, setSchedTargetCount] = useState(5);
  const [busy, setBusy] = useState(false);

  const CRON_PRESETS = [
    { label: t('settings.schedCronDaily9'), value: '0 9 * * *' },
    { label: t('settings.schedCronWeekday9'), value: '0 9 * * 1-5' },
    { label: t('settings.schedCronEvery2h'), value: '0 */2 * * *' },
    { label: t('settings.schedCronEvery30m'), value: '*/30 * * * *' },
    { label: t('settings.schedCronCustom'), value: '__custom__' },
  ];

  const SCHEDULE_TYPES: { value: PipelineScheduleItem['type']; label: string }[] = [
    { value: 'search', label: t('settings.schedTypeSearch') },
    { value: 'send_approved', label: t('settings.schedTypeSendApproved') },
    { value: 'reply_check', label: t('settings.schedTypeReplyCheck') },
    { value: 'followup', label: t('settings.schedTypeFollowup') },
    { value: 'full_pipeline', label: t('settings.schedTypeFullPipeline') },
  ];

  const resetForm = () => {
    setSchedName(''); setSchedType('search'); setSchedCron('0 9 * * 1-5');
    setSchedKeyword(''); setSchedLocation(''); setSchedTargetCount(5);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!schedName.trim()) return;
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
    } catch {}
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
          <HeroAvatar><ClockIcon /></HeroAvatar>
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
          <div style={{ padding: 16, border: `1px solid ${theme.colors.border}`, borderRadius: 8, background: `${theme.colors.surfaceMuted}40` }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <Label>{t('settings.schedName')}</Label>
                <Input value={schedName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedName(e.target.value)} placeholder={t('settings.schedNamePlaceholder')} />
              </div>
              <div>
                <Label>{t('settings.schedType')}</Label>
                <Select value={schedType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSchedType(e.target.value as PipelineScheduleItem['type'])}>
                  {SCHEDULE_TYPES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                </Select>
              </div>
              <div>
                <Label>{t('settings.schedCron')}</Label>
                <Select value={CRON_PRESETS.some(p => p.value === schedCron) ? schedCron : '__custom__'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { if (e.target.value !== '__custom__') setSchedCron(e.target.value); }}>
                  {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
                {!CRON_PRESETS.some(p => p.value === schedCron && p.value !== '__custom__') && (
                  <Input value={schedCron} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedCron(e.target.value)} placeholder="0 9 * * 1-5" style={{ marginTop: 8 }} />
                )}
              </div>
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
              <BtnRow>
                <SaveBtn onClick={handleCreate} disabled={busy || !schedName.trim()}>
                  {busy ? '...' : t('settings.save')}
                </SaveBtn>
                <SaveBtn onClick={resetForm} style={{ background: 'transparent', color: theme.colors.textSecondary, border: `1px solid ${theme.colors.border}` }}>
                  {t('settings.cancel')}
                </SaveBtn>
              </BtnRow>
            </div>
          </div>
        )}

        {/* ── Schedule list ── */}
        {schedulesLoading ? (
          <div style={{ padding: 20, textAlign: 'center', color: theme.colors.textTertiary }}>Loading...</div>
        ) : (schedules as PipelineScheduleItem[]).length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: theme.colors.textTertiary }}>{t('settings.schedEmpty')}</div>
        ) : (
          (schedules as PipelineScheduleItem[]).map((s: PipelineScheduleItem) => (
            <ScheduleRow key={s._id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ToggleSwitch on={s.enabled} onChange={() => toggleSchedule.mutate(s._id)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: '0.75rem', color: theme.colors.textTertiary }}>
                    {SCHEDULE_TYPES.find(st => st.value === s.type)?.label || s.type} &middot; <code style={{ fontSize: '0.7rem' }}>{s.cron}</code>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <SaveBtn onClick={() => triggerSchedule.mutate(s._id)} style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'transparent', color: theme.colors.accent, border: `1px solid ${theme.colors.accent}` }} title={t('settings.schedTriggerNow')}>
                    <PlayIcon />
                  </SaveBtn>
                  <SaveBtn onClick={() => { if (confirm(t('settings.schedDeleteConfirm'))) deleteSchedule.mutate(s._id); }} style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'transparent', color: theme.colors.danger, border: `1px solid ${theme.colors.danger}` }}>
                    <TrashIcon />
                  </SaveBtn>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: theme.colors.textTertiary }}>
                <span>{t('settings.schedLastRun')}: {formatDate(s.last_run_at)}</span>
                <span>{t('settings.schedNextRun')}: {formatDate(s.next_run_at)}</span>
                {s.last_run_status === 'failed' && (
                  <span style={{ color: theme.colors.danger }}>{t('settings.schedFailed')}: {s.last_run_error}</span>
                )}
              </div>
            </ScheduleRow>
          ))
        )}
      </PageCard>
    </Page>
  );
};

export default Schedules;
