import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { media } from '../../styles/media';
import {
  usePipelineSchedules,
  useCreatePipelineSchedule,
  useDeletePipelineSchedule,
  useTogglePipelineSchedule,
  useTriggerPipelineSchedule,
} from '../../api/hooks';
import { PipelineScheduleItem } from '../../api/services';
import SpriteAvatar from '../../components/SpriteAvatar';
import { AGENTS } from '../../config/agents';

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
                      {SCHEDULE_TYPES.find(st => st.value === s.type)?.label || s.type} &middot; <code>{s.cron}</code>
                    </RowMeta>
                  </div>
                  <IconBtn onClick={() => triggerSchedule.mutate(s._id)} title={t('settings.schedTriggerNow')}>
                    <PlayIcon />
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
