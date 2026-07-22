import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css, useTheme, DefaultTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { glassSurface } from '../../styles/glassSurface';
import { useTasks } from '../../api/hooks';
import { TaskItem } from '../../api/services';
import { media } from '../../styles/media';
import SpriteAvatar from '../../components/SpriteAvatar';
import { AGENTS, FARMER } from '../../config/agents';

/* ══════════════════════════════════════
   CMS Tasks — Luno jKanban Board style
   ══════════════════════════════════════ */

/* ── Inline SVG icon helper ── */

const I: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

/* ── Real API task fields (runtime shape, differs from TaskItem TS type) ──
   _id, task_id, title, skill_id, params, priority, deadline,
   status ("pending"|"completed"|"failed"), result (object|null),
   error (object {message}|null), _created_at, _updated_at,
   assigned_agent_id, _assigned_at
   ────────────────────────────────────────────────────────────── */

/* Safe field accessors — API shape may differ from TaskItem type */
function getField(task: TaskItem, key: string): unknown {
  return (task as unknown as Record<string, unknown>)[key];
}
function getStr(task: TaskItem, key: string): string {
  const v = getField(task, key);
  if (typeof v === 'string') return v;
  return '';
}
function getTitle(task: TaskItem): string {
  return getStr(task, 'title') || getStr(task, 'type') || 'tasks.untitledTask';
}
function getSkill(task: TaskItem): string {
  return getStr(task, 'skill_id') || getStr(task, 'type') || '';
}
function getStatus(task: TaskItem): string {
  return (task.status ?? getStr(task, 'status') ?? 'pending').toLowerCase();
}
function getPriority(task: TaskItem): string {
  return getStr(task, 'priority') || 'normal';
}
function getCreatedAt(task: TaskItem): string {
  return getStr(task, '_created_at') || task.createdAt || '';
}
function getErrorMessage(task: TaskItem): string {
  const e = task.error ?? getField(task, 'error');
  if (!e) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as Record<string, unknown>).message);
  }
  return JSON.stringify(e);
}
/* i18n-aware helpers — accept t function */
type TFunc = (key: string, opts?: Record<string, unknown>) => string;

function getResultSummary(task: TaskItem, t: TFunc, theme: DefaultTheme): React.ReactNode | string {
  const r = task.result ?? getField(task, 'result');
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r === 'object' && r !== null) {
    const keys = Object.keys(r);
    const parts = keys.slice(0, 3).map((k, i) => {
      const label = t(`tasks.results.${k}`, { defaultValue: k });
      const v = (r as Record<string, unknown>)[k];
      let valNode: React.ReactNode;
      if (v === true) {
        valNode = <span style={{ color: theme.strong.olive }}>✓</span>;
      } else if (v === false) {
        valNode = <span style={{ color: theme.colors.textTertiary }}>✗</span>;
      } else if (typeof v === 'number') {
        valNode = <span style={{ color: theme.colors.accent, fontWeight: 700 }}>{v}</span>;
      } else {
        valNode = <span>{String(v).slice(0, 25)}</span>;
      }
      return <span key={k}>{i > 0 && ' · '}{label}: {valNode}</span>;
    });
    return <>{parts}</>;
  }
  return '';
}

function friendlyParamNode(key: string, val: unknown, t: TFunc, theme: DefaultTheme): React.ReactNode {
  const label = t(`tasks.params.${key}`, { defaultValue: key });
  if (typeof val === 'number') {
    const unit = t('tasks.batchUnit');
    return <>{label}: <span style={{ color: theme.colors.accent, fontWeight: 700 }}>{val}</span>{unit ? ` ${unit}` : ''}</>;
  }
  let s = typeof val === 'string' ? val : JSON.stringify(val);
  const translated = t(`tasks.paramValues.${s}`, { defaultValue: '' });
  if (translated) s = translated;
  if (s.length > 30) s = s.slice(0, 30) + '…';
  return <>{label}: {s}</>;
}
function getParamsSummary(task: TaskItem, t: TFunc, theme: DefaultTheme): React.ReactNode {
  const p = getField(task, 'params') ?? task.payload;
  if (!p || typeof p !== 'object') return '';
  const obj = p as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) return '';
  return <>{keys.slice(0, 2).map((k, i) => <span key={k}>{i > 0 && ' · '}{friendlyParamNode(k, obj[k], t, theme)}</span>)}</>;
}

/* ── Column config ── */

interface ColumnCfg { key: string; label: string; bg: string; }

function getColumns(theme: DefaultTheme): ColumnCfg[] {
  return [
    { key: 'pending',    label: 'Pending',    bg: theme.colors.accent },
    { key: 'processing', label: 'Processing', bg: theme.strong.gold },
    { key: 'completed',  label: 'Completed',  bg: theme.strong.olive },
    { key: 'failed',     label: 'Failed',     bg: theme.strong.mauve },
  ];
}

/* ── Human-readable labels ── */

/* ── Skill visual config (color + icon) ── */
const SKILL_ICONS: Record<string, React.ReactNode> = {
  S1: <><path d="M21 12a9 9 0 1 1-6.22-8.56" /><path d="M21 3v4h-4" /></>,
  S2: <><path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H8" /><path d="M16 12h-2c0-3 2-4 2-6a4 4 0 0 0-4-4" /><line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /></>,
  S3: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  S4: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
  S5: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  S6: <><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="m15 15 3 3 3-3" /><path d="m15 9 3-3 3 3" /><path d="M18 6v12" /></>,
};
SKILL_ICONS.scrape = SKILL_ICONS.S1;
SKILL_ICONS.email = SKILL_ICONS.S3;
SKILL_ICONS.analyze = SKILL_ICONS.S2;

function getSkillColors(theme: DefaultTheme): Record<string, string> {
  return {
    S1: theme.colors.accent,
    S2: theme.colors.accent,
    S3: theme.strong.gold,
    S4: theme.colors.accent,
    S5: theme.strong.olive,
    S6: theme.colors.accent,
    scrape: theme.colors.accent,
    email: theme.strong.gold,
    analyze: theme.colors.accent,
  };
}

function skillColor(id: string, theme: DefaultTheme): string {
  return getSkillColors(theme)[id] || theme.colors.textTertiary;
}
function skillIcon(id: string): React.ReactNode | null {
  return SKILL_ICONS[id] || null;
}

/* ── Agent → animal mapping ── */
const TASK_AGENT_MAP: Record<string, string> = {
  'Worker-1': 'S1', 'Worker-2': 'S2', 'Worker-3': 'S3',
  'Agent-A': 'S1', 'Agent-B': 'S3', 'Agent-C': 'S4',
};
function getTaskAgent(assignee: string) {
  const key = TASK_AGENT_MAP[assignee];
  if (key) return AGENTS[key];
  return null;
}

/* ── Safely extract tasks array from API response ── */

function extractTasks(data: unknown): TaskItem[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as Record<string, unknown>).data;
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

/* ═══════════ Styled Components ═══════════ */

const Page = styled.div`
  display: flex; flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md}px;
`;

const Breadcrumb = styled.ol`
  list-style: none; margin: 0; padding: 0; display: flex;
  gap: ${({ theme }) => theme.spacing.sm}px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before { content: '/'; margin-right: ${({ theme }) => theme.spacing.sm}px; }
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; }
`;

const Toolbar = styled.div`
  display: flex; align-items: center;
  flex-wrap: wrap; gap: 12px;
`;

const TitleBlock = styled.div``;

const PageTitle = styled.h1`font-size: 1.25rem; font-weight: 700; margin: 0; color: ${({ theme }) => theme.colors.textPrimary};`;
const PageSub = styled.p`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin: 2px 0 0;`;

const SearchWrap = styled.div`
  position: relative; display: flex; align-items: center;
  color: ${({ theme }) => theme.colors.textTertiary};
  svg { position: absolute; left: 10px; pointer-events: none; }
`;

const SortSelect = styled.select`
  padding: 8px 28px 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};
  font-size: 0.8125rem; font-family: ${({ theme }) => theme.fonts.primary};
  color: ${({ theme }) => theme.colors.textPrimary};
  outline: none; cursor: pointer;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  transition: border-color 0.15s;
  &:hover { border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
`;

const SearchInput = styled.input`
  padding: 8px 12px 8px 34px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.control}px;
  background: ${({ theme }) => theme.colors.surface};
  font-size: 0.8125rem; font-family: ${({ theme }) => theme.fonts.primary};
  color: ${({ theme }) => theme.colors.textPrimary};
  width: 220px; outline: none;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: border-color 0.15s, box-shadow 0.15s;
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
  &:hover:not(:focus) { border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus {
    border-color: ${({ theme }) => theme.colors.accent};
    box-shadow: 0 0 0 3px rgba(37,99,235,0.12), 0 1px 2px rgba(15,23,42,0.04);
  }
  ${media.mobile} { width: 100%; }
`;

/* ── Board ── */

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding-bottom: ${({ theme }) => theme.spacing.sm}px;
  min-height: 420px;
  ${media.tabletDown} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  ${media.mobile} {
    grid-template-columns: 1fr;
    gap: 0;
    border-radius: ${({ theme }) => theme.radii.card}px;
    box-shadow: ${({ theme }) => theme.shadows.card};
    min-height: auto;
  }
`;

const Col = styled.div`
  min-width: 0;
  display: flex; flex-direction: column;
  border-radius: ${({ theme }) => theme.radii.card}px;
  background: ${({ theme }) => theme.colors.canvas};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow: hidden;
  ${media.mobile} {
    border-radius: 0;
    box-shadow: none;
    overflow: visible;
  }
`;

const ColHead = styled.div<{ $bg: string; $collapsed?: boolean }>`
  padding: 12px ${({ theme }) => theme.spacing.md}px;
  background: ${({ $bg }) => $bg + '0a'};
  color: ${({ $bg }) => $bg};
  font-size: 0.875rem; font-weight: 600;
  display: flex; align-items: center; justify-content: space-between;
  ${media.mobile} {
    cursor: pointer;
    position: sticky;
    top: 64px;
    z-index: 5;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
`;

const ColChevron = styled.span<{ $open: boolean }>`
  display: none;
  ${media.mobile} {
    display: inline-flex;
    align-items: center;
    margin-left: 8px;
    transition: transform 0.2s ease;
    transform: rotate(${({ $open }) => $open ? '180deg' : '0deg'});
  }
`;

const ColCount = styled.span`
  font-size: 0.75rem; font-weight: 600;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: inherit;
  padding: 2px 8px; border-radius: 99px;
`;

const ColBody = styled.div<{ $collapsed?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm}px;
  display: flex; flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm}px;
  min-height: 60px; flex: 1;
  max-height: 600px; overflow-y: auto;
  ${media.mobile} {
    max-height: none;
    overflow-y: visible;
    transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.2s ease;
    ${({ $collapsed }) => $collapsed && css`
      max-height: 0;
      min-height: 0;
      padding: 0 ${({ theme }: any) => theme.spacing.sm}px;
      opacity: 0;
      overflow: hidden;
    `}
  }
`;

/* ── Card ── */

const Card = styled.div`
  ${glassSurface};
  border-radius: ${({ theme }) => theme.radii.tile}px;
  padding: 12px ${({ theme }) => theme.spacing.md}px;
  transition: box-shadow 0.15s, transform 0.12s, border-color 0.15s;
  cursor: default;
  display: flex; flex-direction: column;
  gap: 8px; position: relative;
  &:hover {
    box-shadow: 0 2px 8px rgba(15,23,42,0.07);
    transform: translateY(-1px);
  }
`;

/* Row 1: avatar + title ... priority dot */
const CardTopRow = styled.div`
  display: flex; align-items: flex-start; gap: 8px;
  padding-right: 28px; /* room for priority dot */
  padding-top: 2px;
`;

const AvatarWrap = styled.div`
  display: flex; flex-direction: column; align-items: center;
  flex-shrink: 0; position: relative; width: 40px;
`;

const AgentAvatar = styled.span<{ $bg: string }>`
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $bg }) => $bg};
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const AvatarName = styled.span`
  position: relative; margin-top: -10px; z-index: 1;
  background: ${({ theme }) => theme.colors.surface}; border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 5px; padding: 1px 6px;
  font-size: 0.625rem; font-weight: 700; color: ${({ theme }) => theme.colors.accent};
  white-space: nowrap; max-width: 64px; overflow: hidden; text-overflow: ellipsis;
  line-height: 1.5; text-align: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
`;

const CardTitle = styled.div`
  font-size: 0.875rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  line-height: 1.4; flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const PriorityDot = styled.span<{ $c: string }>`
  position: absolute; top: 12px; right: 12px;
  width: 20px; height: 20px; border-radius: 50%;
  background: ${({ $c }) => $c};
  color: ${({ theme }) => theme.colors.textInverted}; font-size: 0.5rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
`;

/* Row 2: description + skill tag */
const CardDescRow = styled.div`
  display: flex; align-items: flex-start; gap: 6px;
  padding-left: 48px; /* aligned under title (avatar wrap 40 + gap 8) */
`;

const CardDesc = styled.p`
  margin: 0;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5; flex: 1; min-width: 0;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
`;

const SkillPill = styled.span<{ $c: string }>`
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 8px; border-radius: 99px; font-size: 0.625rem; font-weight: 600;
  background: ${({ $c }) => $c}12;
  color: ${({ $c }) => $c};
  white-space: nowrap; flex-shrink: 0; margin-top: 2px;
  svg { flex-shrink: 0; }
`;

/* Row 3: date */
const CardFooter = styled.div`
  display: flex; align-items: center;
  justify-content: flex-end;
  padding-left: 48px;
`;

const CardDate = styled.span`
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
`;

const ErrText = styled.span`
  color: ${({ theme }) => theme.strong.mauve};
  font-size: 0.6875rem; font-style: italic;
`;

const EmptyCol = styled.div`
  text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: ${({ theme }) => theme.spacing.lg}px ${({ theme }) => theme.spacing.sm}px;
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

const EmptyTaskIllustration = () => (
  <svg width="100" height="80" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="10" width="70" height="55" rx="8" fill="#F5F2ED" stroke="#EFEAE3" strokeWidth="1.5"/>
    <rect x="28" y="24" width="10" height="10" rx="2" stroke="#EFEAE3" strokeWidth="1.5" fill="none"/>
    <rect x="28" y="40" width="10" height="10" rx="2" stroke="#EFEAE3" strokeWidth="1.5" fill="none"/>
    <line x1="44" y1="29" x2="72" y2="29" stroke="#EFEAE3" strokeWidth="3" strokeLinecap="round"/>
    <line x1="44" y1="45" x2="66" y2="45" stroke="#EFEAE3" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

/* ── Footer ── */

const Footer = styled.footer`
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ theme }) => theme.spacing.md}px 0;
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none;
      margin-left: ${({ theme }) => theme.spacing.md}px; }
  a:hover { text-decoration: underline; }
`;

/* ── Helpers ── */

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  let h = d.getHours();
  const min = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${month} ${day}, ${h}:${min}${ampm}`;
}

function priorityColor(p: string, theme: DefaultTheme): string {
  switch (p) {
    case 'high': case 'urgent': return theme.strong.mauve;
    case 'normal': return theme.strong.gold;
    case 'low': return theme.colors.accent;
    default: return theme.colors.textTertiary;
  }
}

/* ═══════════ Mock data (demo padding) ═══════════ */

const MOCK_TASKS: TaskItem[] = [
  // ── Pending ──
  { _id: 'mock-p1', title: 'tasks.mockTitles.scrapeLinkedin', skill_id: 'S1', params: { keyword: 'CTO', location: 'San Francisco' }, priority: 'high', status: 'pending', _created_at: '2026-06-23T08:15:00Z', assigned_agent_id: 'Agent-A' } as unknown as TaskItem,
  { _id: 'mock-p2', title: 'tasks.mockTitles.batchSendColdEmails', skill_id: 'S3', params: { template: 'intro_v2', batch_size: 50 }, priority: 'normal', status: 'pending', _created_at: '2026-06-23T09:30:00Z', assigned_agent_id: 'Agent-B' } as unknown as TaskItem,
  { _id: 'mock-p3', title: 'tasks.mockTitles.analyzeCompetitorPricing', skill_id: 'S2', params: { url: 'https://competitor.io/pricing' }, priority: 'low', status: 'pending', _created_at: '2026-06-22T14:00:00Z' } as unknown as TaskItem,
  { _id: 'mock-p4', title: 'tasks.mockTitles.exportWeeklyLeads', skill_id: 'S5', params: { format: 'xlsx', range: 'this_week' }, priority: 'normal', status: 'pending', _created_at: '2026-06-24T06:00:00Z', assigned_agent_id: 'Agent-C' } as unknown as TaskItem,

  // ── Processing ──
  { _id: 'mock-r1', title: 'tasks.mockTitles.scrapeCrunchbase', skill_id: 'S1', params: { target: 'Series A startups', pages: 20 }, priority: 'high', status: 'processing', _created_at: '2026-06-24T07:45:00Z', assigned_agent_id: 'Worker-1' } as unknown as TaskItem,
  { _id: 'mock-r2', title: 'tasks.mockTitles.aiAnalyzeLeadMatch', skill_id: 'S2', params: { model: 'lead-scorer-v3', batch: 120 }, priority: 'normal', status: 'processing', _created_at: '2026-06-24T08:10:00Z', assigned_agent_id: 'Worker-2' } as unknown as TaskItem,
  { _id: 'mock-r3', title: 'tasks.mockTitles.syncCrmContacts', skill_id: 'S6', params: { crm: 'HubSpot', direction: 'bidirectional' }, priority: 'normal', status: 'processing', _created_at: '2026-06-24T09:00:00Z', assigned_agent_id: 'Worker-1' } as unknown as TaskItem,

  // ── Completed ──
  { _id: 'mock-c1', title: 'tasks.mockTitles.sendTechCorpEmail', skill_id: 'S3', params: { to: 'ceo@techcorp.com' }, priority: 'normal', status: 'completed', result: { sent: true, opened: true, replied: false }, _created_at: '2026-06-21T10:00:00Z', assigned_agent_id: 'Agent-A' } as unknown as TaskItem,

  { _id: 'mock-c3', title: 'tasks.mockTitles.generateDailyLeadSummary', skill_id: 'S4', params: { mode: 'daily_digest' }, priority: 'normal', status: 'completed', result: { leads_found: 34, qualified: 12 }, _created_at: '2026-06-22T06:00:00Z' } as unknown as TaskItem,
  { _id: 'mock-c4', title: 'tasks.mockTitles.updateCompanyDatabase', skill_id: 'S5', params: { source: 'LinkedIn', records: 250 }, priority: 'normal', status: 'completed', result: { updated: 248, skipped: 2 }, _created_at: '2026-06-23T11:00:00Z', assigned_agent_id: 'Worker-2' } as unknown as TaskItem,

  // ── Failed ──
  { _id: 'mock-f1', title: 'tasks.mockTitles.scrapeAngelList', skill_id: 'S1', params: { url: 'https://angel.co/companies' }, priority: 'high', status: 'failed', error: { message: 'Rate limit exceeded (429)' }, _created_at: '2026-06-23T13:00:00Z', assigned_agent_id: 'Worker-1' } as unknown as TaskItem,
  { _id: 'mock-f2', title: 'tasks.mockTitles.sendGlobalTechEmail', skill_id: 'S3', params: { to: 'john@globaltech.com' }, priority: 'normal', status: 'failed', error: { message: 'SMTP connection timeout' }, _created_at: '2026-06-22T15:20:00Z', assigned_agent_id: 'Agent-A' } as unknown as TaskItem,
  { _id: 'mock-f3', title: 'tasks.mockTitles.syncSalesforce', skill_id: 'S6', params: { crm: 'Salesforce' }, priority: 'urgent', status: 'failed', error: { message: 'OAuth token expired, please re-authenticate' }, _created_at: '2026-06-24T04:30:00Z' } as unknown as TaskItem,
];

/* ═══════════ Workflow Steps (per task) ═══════════ */

interface WorkflowStep {
  label: string;
  status: 'done' | 'active' | 'pending';
  detail?: string;
  time?: string;
}

const TASK_WORKFLOWS: Record<string, WorkflowStep[]> = {
  'mock-p1': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/23 08:15' },
    { label: 'tasks.wf.awaitingScheduleAssign', status: 'active', time: '06/23 08:16' },
    { label: 'tasks.wf.startScrapeLinkedin', status: 'pending' },
    { label: 'tasks.wf.dataCleanDedup', status: 'pending' },
    { label: 'tasks.wf.importLeadPool', status: 'pending' },
  ],
  'mock-p2': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/23 09:30' },
    { label: 'tasks.wf.loadTemplateIntroV2', status: 'active', time: '06/23 09:31', detail: 'tasks.wfDetail.emails50Pending' },
    { label: 'tasks.wf.aiGenerateEmailContent', status: 'pending' },
    { label: 'tasks.wf.batchSend', status: 'pending' },
    { label: 'tasks.wf.trackOpenRate', status: 'pending' },
  ],
  'mock-p3': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/22 14:00' },
    { label: 'tasks.wf.queued', status: 'active' },
    { label: 'tasks.wf.visitPricingPage', status: 'pending' },
    { label: 'tasks.wf.screenshotExtractPricing', status: 'pending' },
    { label: 'tasks.wf.generateAnalysisReport', status: 'pending' },
  ],
  'mock-p4': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/24 06:00' },
    { label: 'tasks.wf.queryThisWeekData', status: 'active' },
    { label: 'tasks.wf.generateXlsx', status: 'pending' },
    { label: 'tasks.wf.sendToAdmin', status: 'pending' },
  ],
  'mock-r1': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/24 07:45' },
    { label: 'tasks.wf.assignedToWorker1', status: 'done', time: '06/24 07:46' },
    { label: 'tasks.wf.scrapeCrunchbase', status: 'active', time: '06/24 07:48', detail: 'tasks.wfDetail.scraped12of20' },
    { label: 'tasks.wf.dataNormalization', status: 'pending' },
    { label: 'tasks.wf.importPipeline', status: 'pending' },
  ],
  'mock-r2': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/24 08:10' },
    { label: 'tasks.wf.loadLeadScorerModel', status: 'done', time: '06/24 08:12' },
    { label: 'tasks.wf.batchScoring', status: 'active', time: '06/24 08:15', detail: 'tasks.wfDetail.scored78of120' },
    { label: 'tasks.wf.generateReport', status: 'pending' },
  ],
  'mock-r3': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/24 09:00' },
    { label: 'tasks.wf.connectHubspotApi', status: 'done', time: '06/24 09:02' },
    { label: 'tasks.wf.bidirectionalSync', status: 'active', time: '06/24 09:05', detail: 'tasks.wfDetail.upload45Download23' },
    { label: 'tasks.wf.conflictCheck', status: 'pending' },
    { label: 'tasks.wf.syncCompleteConfirm', status: 'pending' },
  ],
  'mock-c1': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/21 10:00' },
    { label: 'tasks.wf.aiGeneratePersonalizedEmail', status: 'done', time: '06/21 10:05', detail: 'tasks.wfDetail.subjectCollaboration' },
    { label: 'tasks.wf.emailSent', status: 'done', time: '06/21 10:08' },
    { label: 'tasks.wf.emailOpened', status: 'done', time: '06/21 14:22', detail: 'tasks.wfDetail.recipientOpened' },
    { label: 'tasks.wf.awaitingReply', status: 'done', time: '06/21 14:22', detail: 'tasks.wfDetail.noReply3DayFollowup' },
  ],

  'mock-c3': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/22 06:00' },
    { label: 'tasks.wf.scanAllSources', status: 'done', time: '06/22 06:05' },
    { label: 'tasks.wf.found34Leads', status: 'done', time: '06/22 06:18', detail: 'tasks.wfDetail.qualified12Pending22' },
    { label: 'tasks.wf.summarySent', status: 'done', time: '06/22 06:20' },
  ],
  'mock-c4': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/23 11:00' },
    { label: 'tasks.wf.importLinkedinData', status: 'done', time: '06/23 11:05' },
    { label: 'tasks.wf.updated248Records', status: 'done', time: '06/23 11:30', detail: 'tasks.wfDetail.skipped2Duplicate' },
    { label: 'tasks.wf.complete', status: 'done', time: '06/23 11:31' },
  ],
  'mock-f1': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/23 13:00' },
    { label: 'tasks.wf.assignedToWorker1', status: 'done', time: '06/23 13:01' },
    { label: 'tasks.wf.startScrapeAngellist', status: 'done', time: '06/23 13:03' },
    { label: 'tasks.wf.failedRateLimit', status: 'done', time: '06/23 13:05', detail: 'tasks.wfDetail.retried3Times' },
  ],
  'mock-f2': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/22 15:20' },
    { label: 'tasks.wf.generateEmailContent', status: 'done', time: '06/22 15:22' },
    { label: 'tasks.wf.failedSmtpTimeout', status: 'done', time: '06/22 15:25', detail: 'tasks.wfDetail.smtpNoResponse' },
  ],
  'mock-f3': [
    { label: 'tasks.wf.taskCreated', status: 'done', time: '06/24 04:30' },
    { label: 'tasks.wf.failedOauthExpired', status: 'done', time: '06/24 04:32', detail: 'tasks.wfDetail.reauthSalesforce' },
  ],
};

function getWorkflowSteps(taskId: string, status: string): WorkflowStep[] {
  if (TASK_WORKFLOWS[taskId]) return TASK_WORKFLOWS[taskId];
  // Fallback generic workflow
  if (status === 'completed') {
    return [
      { label: 'tasks.wf.taskCreated', status: 'done' },
      { label: 'tasks.wf.processing', status: 'done' },
      { label: 'tasks.wf.completed', status: 'done' },
    ];
  }
  if (status === 'failed') {
    return [
      { label: 'tasks.wf.taskCreated', status: 'done' },
      { label: 'tasks.wf.executionFailed', status: 'done' },
    ];
  }
  if (status === 'processing') {
    return [
      { label: 'tasks.wf.taskCreated', status: 'done' },
      { label: 'tasks.wf.processing', status: 'active' },
      { label: 'tasks.wf.pendingCompletion', status: 'pending' },
    ];
  }
  return [
    { label: 'tasks.wf.taskCreated', status: 'done' },
    { label: 'tasks.wf.awaitingSchedule', status: 'active' },
    { label: 'tasks.wf.startExecution', status: 'pending' },
    { label: 'tasks.wf.complete', status: 'pending' },
  ];
}

/* ═══════════ Floating Workflow Panel ═══════════ */

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const Overlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 1200;
  animation: ${fadeIn} 0.15s ease;
`;

const FloatingPanel = styled.div`
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1201; width: 680px; max-height: 88vh;
  ${glassSurface};
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.1);
  display: flex; flex-direction: column;
  animation: ${fadeIn} 0.2s ease;
  overflow: hidden;
  ${media.mobile} { width: calc(100vw - 32px); max-height: 90vh; }
`;

const PanelHead = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const PanelHeadLeft = styled.div`
  display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;
`;

const PanelTitle = styled.h3`
  margin: 0; font-size: 15px; font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const PanelSub = styled.span`
  font-size: 11px; color: ${({ theme }) => theme.colors.textTertiary};
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`;

const CloseBtn = styled.button`
  background: transparent; border: none; cursor: pointer;
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: ${({ theme }) => theme.colors.accent};
  flex-shrink: 0; transition: background 150ms var(--ease-out);
  @media (hover: hover) and (pointer: fine) {
    &:hover { background: ${({ theme }) => `${theme.colors.accent}15`}; }
  }
`;

const WfBody = styled.div`
  padding: 20px; overflow-y: auto; flex: 1;
`;

const WfList = styled.ul`
  list-style: none; margin: 0; padding: 0; position: relative;
`;

const pulseGlow = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
`;

const WfItem = styled.li<{ $s: 'done'|'active'|'pending' }>`
  display: flex; align-items: flex-start; gap: 12px;
  padding: 8px 0; position: relative;
  transition: opacity 0.2s;
  ${({ $s }) => $s === 'pending' && css`opacity: 0.45;`}

  /* Per-item connecting line to next item */
  &::after {
    content: '';
    position: absolute;
    left: 62px;
    top: 16px;
    bottom: -8px;
    width: 3px;
    border-radius: 1.5px;
    background: ${({ $s, theme }) =>
      $s === 'done' ? theme.strong.olive :
      $s === 'active' ? theme.colors.accent :
      theme.colors.border};
    ${({ $s, theme }) => ($s === 'done' || $s === 'active') && `
      box-shadow: 0 0 6px ${$s === 'done' ? theme.strong.olive : theme.colors.accent}66,
                  0 0 12px ${$s === 'done' ? theme.strong.olive : theme.colors.accent}33;
    `}
  }
  &:last-child::after { display: none; }
`;

const WfTime = styled.span`
  width: 44px; flex-shrink: 0;
  font-size: 10px; font-weight: 600;
  color: ${({ theme }) => theme.colors.textTertiary};
  text-align: right; padding-top: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  line-height: 1;
`;

const WfDot = styled.div<{ $s: 'done'|'active'|'pending' }>`
  width: 14px; height: 14px; border-radius: 50%;
  flex-shrink: 0; margin-top: 1px; position: relative; z-index: 1;
  background: ${({ $s, theme }) =>
    $s === 'done' ? theme.strong.olive :
    $s === 'active' ? theme.colors.accent :
    theme.colors.border};
  ${({ $s, theme }) => ($s === 'done' || $s === 'active') && `
    box-shadow: 0 0 8px ${$s === 'done' ? theme.strong.olive : theme.colors.accent}88,
                0 0 16px ${$s === 'done' ? theme.strong.olive : theme.colors.accent}44;
  `}
  ${({ $s }) => $s === 'active' && css`
    animation: ${pulseGlow} 2s ease-in-out infinite;
  `}
  ${({ $s }) => $s === 'done' && css`
    &::after {
      content: ''; position: absolute; left: 3px; top: 1px;
      width: 4px; height: 7px;
      border: solid ${({ theme }: any) => theme.colors.surface}; border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  `}
  ${({ $s }) => $s === 'pending' && css`
    background: ${({ theme }: any) => theme.colors.surface};
    border: 2px solid ${({ theme }: any) => theme.colors.border};
    box-sizing: border-box;
  `}
`;

const WfContent = styled.div`flex: 1; min-width: 0;`;

const WfLabel = styled.div<{ $s?: 'done'|'active'|'pending' }>`
  font-size: 13px; font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary}; line-height: 1.4;
  ${({ $s }) => $s === 'active' && css`font-weight: 600;`}
`;

const WfDetail = styled.div`
  font-size: 11px; color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 4px; line-height: 1.5; padding: 8px 10px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 8px; border-left: 3px solid ${({ theme }) => theme.colors.accent};
`;

const PanelFoot = styled.div`
  padding: 12px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex; justify-content: space-between; align-items: center;
`;

const FootStat = styled.span`
  font-size: 11px; color: ${({ theme }) => theme.colors.textTertiary};
`;

const ProgWrap = styled.div`
  display: flex; align-items: center; gap: 8px;
`;

const ProgTrack = styled.div`
  width: 120px; height: 6px;
  background: ${({ theme }) => theme.colors.canvas};
  border-radius: 3px; overflow: hidden;
`;

const ProgFill = styled.div<{ $pct: number }>`
  height: 100%; width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.colors.accent};
  border-radius: 3px; transition: width 0.4s ease;
`;

const ProgPct = styled.span`
  font-size: 11px; font-weight: 600;
  color: ${({ theme }) => theme.strong.olive};
`;

/* ═══════════ Component ═══════════ */

type SortKey = 'priority' | 'newest' | 'oldest' | 'skill';
const PRIORITY_WEIGHT: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

function sortTasks(arr: TaskItem[], key: SortKey): TaskItem[] {
  const sorted = [...arr];
  switch (key) {
    case 'priority':
      return sorted.sort((a, b) => (PRIORITY_WEIGHT[getPriority(a)] ?? 9) - (PRIORITY_WEIGHT[getPriority(b)] ?? 9));
    case 'newest':
      return sorted.sort((a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(getCreatedAt(a)).getTime() - new Date(getCreatedAt(b)).getTime());
    case 'skill':
      return sorted.sort((a, b) => getSkill(a).localeCompare(getSkill(b)));
    default:
      return sorted;
  }
}

const Tasks: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('priority');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(() => {
    // On mobile, default collapse all except 'pending'
    return new Set(['processing', 'completed', 'failed']);
  });
  const toggleCol = useCallback((key: string) => {
    setCollapsedCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const handleClose = useCallback(() => setSelectedTask(null), []);
  const { data, isLoading } = useTasks();
  const apiTasks = extractTasks(data);
  const tasks = [...apiTasks, ...MOCK_TASKS];

  const COLUMNS = useMemo(() => getColumns(theme), [theme]);

  const translatedColumns = useMemo(() => COLUMNS.map(col => ({
    ...col,
    label: t(`tasks.${col.key}`),
  })), [t]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const rawTitle = getTitle(task);
      const title = t(rawTitle, { defaultValue: rawTitle }).toLowerCase();
      const skill = getSkill(task).toLowerCase();
      const status = getStatus(task);
      const id = task._id.toLowerCase();
      return title.includes(q) || skill.includes(q) || status.includes(q) || id.includes(q);
    });
  }, [tasks, search, t]);

  const grouped = useMemo(() => {
    const m: Record<string, TaskItem[]> = {};
    for (const c of COLUMNS) m[c.key] = [];
    for (const t of filtered) {
      const s = getStatus(t);
      if (m[s]) m[s].push(t);
      else m['pending'].push(t);
    }
    // Apply sort to each column
    for (const key of Object.keys(m)) {
      m[key] = sortTasks(m[key], sortBy);
    }
    return m;
  }, [filtered, sortBy]);

  return (
    <Page>
      <div><PageTitle>{t('tasks.title')}</PageTitle><PageSub>{t('tasks.subtitle')}</PageSub></div>
      <Toolbar>
        <SearchWrap>
          <I size={14}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </I>
          <SearchInput
            type="text"
            placeholder={t('tasks.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchWrap>
        <SortSelect value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
          <option value="priority">{t('tasks.sortPriority')}</option>
          <option value="newest">{t('tasks.sortNewest')}</option>
          <option value="oldest">{t('tasks.sortOldest')}</option>
          <option value="skill">{t('tasks.sortSkill')}</option>
        </SortSelect>
      </Toolbar>

      <Board>
        {translatedColumns.map((col) => {
          const items = grouped[col.key] ?? [];
          const isCollapsed = collapsedCols.has(col.key);
          return (
            <Col key={col.key}>
              <ColHead $bg={col.bg} $collapsed={isCollapsed} onClick={() => toggleCol(col.key)}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {col.label}
                  <ColChevron $open={!isCollapsed}>
                    <I size={14}><polyline points="6 9 12 15 18 9" /></I>
                  </ColChevron>
                </span>
                <ColCount>{String(items.length)}</ColCount>
              </ColHead>
              <ColBody $collapsed={isCollapsed}>
                {isLoading ? (
                  <EmptyCol>{t('tasks.loading')}</EmptyCol>
                ) : items.length === 0 ? (
                  <EmptyCol><EmptyTaskIllustration />{t('tasks.noTasks')}</EmptyCol>
                ) : (
                  items.map((task) => {
                    const title = getTitle(task);
                    const skill = getSkill(task);
                    const status = getStatus(task);
                    const priority = getPriority(task);
                    const created = getCreatedAt(task);
                    const errMsg = getErrorMessage(task);
                    const paramStr = getParamsSummary(task, t, theme);
                    const resultStr = getResultSummary(task, t, theme);
                    const agentId = getStr(task, 'assigned_agent_id');

                    // Description: show error for failed, result for completed, params otherwise
                    let desc: React.ReactNode = paramStr || t('tasks.noDetails');
                    if (status === 'failed' && errMsg) desc = errMsg;
                    else if (status === 'completed' && resultStr) desc = resultStr;

                    const assignee = agentId || t('tasks.system');

                    return (
                      <Card key={task._id} onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer' }}>
                        <PriorityDot $c={priorityColor(priority, theme)} title={t(`tasks.priority.${priority}`, { defaultValue: priority })}>
                          {t(`tasks.priority.${priority}`, { defaultValue: priority })}
                        </PriorityDot>
                        <CardTopRow>
                          <AvatarWrap>
                            {(() => {
                              const agent = getTaskAgent(assignee);
                              return agent ? (
                                <SpriteAvatar src={agent.sprite} frames={agent.frames} frameW={agent.frameW} frameH={agent.frameH} size={36} />
                              ) : (
                                <AgentAvatar $bg={theme.colors.surfaceMuted}>
                                  <I size={18}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></I>
                                </AgentAvatar>
                              );
                            })()}
                            <AvatarName>
                              {(() => {
                                const agent = getTaskAgent(assignee);
                                return agent ? t(agent.nameKey) : assignee;
                              })()}
                            </AvatarName>
                          </AvatarWrap>
                          <CardTitle>{t(title, { defaultValue: title })}</CardTitle>
                        </CardTopRow>
                        <CardDescRow>
                          <CardDesc>
                            {status === 'failed' ? <ErrText>{desc}</ErrText> : desc}
                          </CardDesc>
                          {skill && <SkillPill $c={skillColor(skill, theme)}><I size={10}>{skillIcon(skill)}</I>{t(`tasks.skills.${skill}`, { defaultValue: skill })}</SkillPill>}
                        </CardDescRow>
                        <CardFooter>
                          <CardDate>{fmtDate(created)}</CardDate>
                        </CardFooter>
                      </Card>
                    );
                  })
                )}
              </ColBody>
            </Col>
          );
        })}
      </Board>

      <Footer>
        <span>{t('footer.copyrightHermes', { year: 2026 })}</span>
        <div>
          <a href="#">{t('footer.documentation')}</a>
          <a href="#">{t('footer.support')}</a>
          <a href="#">{t('footer.faqs')}</a>
        </div>
      </Footer>

      {/* ── Floating Workflow Panel (portal to body) ── */}
      {selectedTask && createPortal((() => {
        const title = getTitle(selectedTask);
        const skill = getSkill(selectedTask);
        const status = getStatus(selectedTask);
        const steps = getWorkflowSteps(selectedTask._id, status);
        const doneCount = steps.filter(s => s.status === 'done').length;
        const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

        return (
          <>
            <Overlay onClick={handleClose} />
            <FloatingPanel>
              <PanelHead>
                <PanelHeadLeft>
                  <PanelTitle>{t(title, { defaultValue: title })}</PanelTitle>
                  <PanelSub>{skill && `${t(`tasks.skills.${skill}`, { defaultValue: skill })} · `}{t(`tasks.${status}`, { defaultValue: status })}</PanelSub>
                </PanelHeadLeft>
                <CloseBtn onClick={handleClose} title={t('common.close')}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></CloseBtn>
              </PanelHead>

              <WfBody>
                <WfList>
                  {steps.map((step, i) => (
                    <WfItem key={i} $s={step.status}>
                      <WfTime>{step.time || ''}</WfTime>
                      <WfDot $s={step.status} />
                      <WfContent>
                        <WfLabel $s={step.status}>{t(step.label, { defaultValue: step.label })}</WfLabel>
                        {step.detail && <WfDetail>{t(step.detail, { defaultValue: step.detail })}</WfDetail>}
                      </WfContent>
                    </WfItem>
                  ))}
                </WfList>
              </WfBody>

              <PanelFoot>
                <FootStat>{doneCount} / {steps.length} {t('tasks.steps', { defaultValue: 'steps' })}</FootStat>
                <ProgWrap>
                  <ProgTrack><ProgFill $pct={pct} /></ProgTrack>
                  <ProgPct>{pct}%</ProgPct>
                </ProgWrap>
              </PanelFoot>
            </FloatingPanel>
          </>
        );
      })(), document.body)}
    </Page>
  );
};

export default Tasks;
